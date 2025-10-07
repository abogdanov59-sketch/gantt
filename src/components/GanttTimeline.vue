<template>
  <div class="flex h-full flex-col">
    <div
      ref="headerContainer"
      class="overflow-x-auto overflow-y-hidden border-b border-slate-200 bg-white text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800"
      @scroll="handleHeaderScroll"
    >
      <TimeRuler
        :start-date="timelineStart"
        :end-date="timelineEnd"
        :pixels-per-ms="pixelsPerMs"
        :content-width="contentWidth"
        :min-day-width="MIN_DAY_WIDTH"
      />
    </div>
    <div
      ref="canvasContainer"
      class="relative flex-1 overflow-auto bg-slate-50 dark:bg-slate-900"
      @scroll="handleBodyScroll"
    >
      <div class="relative" :style="canvasWrapperStyle">
        <canvas ref="canvas" class="block h-full w-full" @click="handleCanvasClick"></canvas>
        <DependencyLayer
          v-if="canvasContext"
          :tasks="tasks"
          :dependencies="dependencies"
          :project="project"
          :pixels-per-ms="pixelsPerMs"
          :row-height="rowHeight"
          :timeline-start="timelineStart"
          :content-width="contentWidth"
          :content-height="contentHeight"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue'
import { endOfWeek, startOfWeek } from 'date-fns'
import type {
  DisplayTask,
  Dependency,
  Project,
  ResolvedGanttOptions,
  SchedulerStats
} from '@/types'
import DependencyLayer from './DependencyLayer.vue'
import TimeRuler from './TimeRuler.vue'

const emit = defineEmits(['select-task'])

const props = defineProps({
  tasks: {
    type: Array as PropType<DisplayTask[]>,
    required: true
  },
  dependencies: {
    type: Array as PropType<Dependency[]>,
    required: true
  },
  project: {
    type: Object as PropType<Project>,
    required: true
  },
  options: {
    type: Object as PropType<ResolvedGanttOptions>,
    required: true
  },
  stats: {
    type: Object as PropType<SchedulerStats | null>,
    default: null
  },
  showBaselines: {
    type: Boolean,
    default: false
  },
  highlightCritical: {
    type: Boolean,
    default: false
  },
  selectedTaskId: {
    type: String,
    default: null
  }
})

const canvas = ref<HTMLCanvasElement | null>(null)
const canvasContainer = ref<HTMLDivElement | null>(null)
const headerContainer = ref<HTMLDivElement | null>(null)
const canvasContext = ref<CanvasRenderingContext2D | null>(null)
const scrollLeft = ref(0)
const rowHeight = 44
const basePixelsPerHour = 1.5
const DAY_MS = 24 * 60 * 60 * 1000
const MIN_DAY_WIDTH = 36
const MIN_PIXELS_PER_MS = MIN_DAY_WIDTH / DAY_MS
const zoomLevel = ref(1)
let resizeObserver: ResizeObserver | null = null
let syncingFromHeader = false
let syncingFromBody = false

const weekOptions = { weekStartsOn: 1 as const }

const timelineBounds = computed(() => {
  if (!props.tasks.length) {
    const start = startOfWeek(new Date(), weekOptions)
    const end = endOfWeek(start, weekOptions)
    return { start, end }
  }
  const startTimes = props.tasks.map((task) => new Date(task.start).getTime())
  const finishTimes = props.tasks.map((task) => new Date(task.finish).getTime())
  const minStart = Math.min(...startTimes)
  const maxFinish = Math.max(...finishTimes)
  const start = startOfWeek(new Date(minStart), weekOptions)
  const end = endOfWeek(new Date(maxFinish), weekOptions)
  return { start, end }
})

const timelineStart = computed(() => timelineBounds.value.start)
const timelineEnd = computed(() => timelineBounds.value.end)

const durationMs = computed(() => Math.max(1, timelineEnd.value.getTime() - timelineStart.value.getTime()))

const pixelsPerMs = computed(() => {
  const base = (basePixelsPerHour * zoomLevel.value) / (60 * 60 * 1000)
  return Math.max(base, MIN_PIXELS_PER_MS)
})

const contentWidth = computed(() => {
  const width = durationMs.value * pixelsPerMs.value
  const containerWidth = canvasContainer.value?.clientWidth ?? 0
  return Math.max(width, containerWidth)
})

const contentHeight = computed(() => {
  const rowsHeight = props.tasks.length * rowHeight
  const containerHeight = canvasContainer.value?.clientHeight ?? rowsHeight
  return Math.max(rowsHeight, containerHeight)
})

const canvasWrapperStyle = computed(() => ({
  width: `${contentWidth.value}px`,
  height: `${contentHeight.value}px`
}))

const getPrimaryBaseline = (task: DisplayTask) =>
  task.baseline?.find((snapshot) => snapshot.index === 0) ?? task.baseline?.[0]

const draw = () => {
  const context = canvasContext.value
  const canvasElement = canvas.value
  if (!context || !canvasElement) return

  const width = Math.max(contentWidth.value, 1)
  const height = Math.max(contentHeight.value, 1)
  const ratio = typeof window !== 'undefined' ? window.devicePixelRatio ?? 1 : 1

  canvasElement.width = width * ratio
  canvasElement.height = height * ratio
  canvasElement.style.width = `${width}px`
  canvasElement.style.height = `${height}px`

  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, width, height)

  props.tasks.forEach((task, index) => {
    const y = index * rowHeight + 12
    const start = new Date(task.start).getTime()
    const finish = new Date(task.finish).getTime()
    const x = (start - timelineStart.value.getTime()) * pixelsPerMs.value
    const barWidth = Math.max((finish - start) * pixelsPerMs.value, task.isSummary ? 6 : 3)
    const barHeight = rowHeight - 24

    if (props.showBaselines) {
      const baseline = getPrimaryBaseline(task)
      if (baseline?.start && baseline?.finish) {
        const baselineStart = new Date(baseline.start).getTime()
        const baselineFinish = new Date(baseline.finish).getTime()
        const baselineX = (baselineStart - timelineStart.value.getTime()) * pixelsPerMs.value
        const baselineWidth = Math.max((baselineFinish - baselineStart) * pixelsPerMs.value, 2)
        const baselineY = y + barHeight + 6
        context.fillStyle = 'var(--gantt-baseline-color, #f97316)'
        context.fillRect(baselineX, baselineY, baselineWidth, 4)
      }
    }

    const isCritical = props.highlightCritical && !task.isSummary && task.flags?.critical
    const isSelected = props.selectedTaskId === task.id

    if (task.isSummary) {
      const bracketTop = y + 4
      const bracketBottom = y + barHeight - 4
      context.strokeStyle = 'var(--gantt-summary-color, #1e293b)'
      context.lineWidth = 3
      context.beginPath()
      context.moveTo(x, bracketTop)
      context.lineTo(x + barWidth, bracketTop)
      context.moveTo(x, bracketBottom)
      context.lineTo(x + barWidth, bracketBottom)
      context.moveTo(x, bracketTop)
      context.lineTo(x, bracketBottom)
      context.moveTo(x + barWidth, bracketTop)
      context.lineTo(x + barWidth, bracketBottom)
      context.stroke()

      if (isSelected) {
        context.strokeStyle = 'var(--gantt-selected-color, #facc15)'
        context.lineWidth = 2
        context.strokeRect(x - 2, y + 2, barWidth + 4, barHeight - 4)
      }

      context.fillStyle = 'var(--gantt-summary-text, #0f172a)'
    } else {
      context.fillStyle = isCritical
        ? 'var(--gantt-critical-color, #dc2626)'
        : 'var(--gantt-bar-color, #2563eb)'
      context.fillRect(x, y, barWidth, barHeight)

      if (isCritical) {
        context.strokeStyle = 'var(--gantt-critical-border, #7f1d1d)'
        context.lineWidth = 2
        context.strokeRect(x - 1.5, y - 1.5, barWidth + 3, barHeight + 3)
      }

      if (isSelected) {
        context.strokeStyle = 'var(--gantt-selected-color, #facc15)'
        context.lineWidth = 2
        context.strokeRect(x - 1, y - 1, barWidth + 2, barHeight + 2)
      }

      context.fillStyle = '#fff'
    }

    context.font = '12px sans-serif'
    context.fillText(task.name, x + 4, y + 12)
  })
}

const handleBodyScroll = () => {
  if (!canvasContainer.value) return
  if (syncingFromHeader) {
    syncingFromHeader = false
    return
  }
  const left = canvasContainer.value.scrollLeft
  scrollLeft.value = left
  if (headerContainer.value) {
    syncingFromBody = true
    headerContainer.value.scrollLeft = left
  }
}

const handleHeaderScroll = () => {
  if (!headerContainer.value) return
  if (syncingFromBody) {
    syncingFromBody = false
    return
  }
  const left = headerContainer.value.scrollLeft
  scrollLeft.value = left
  if (canvasContainer.value) {
    syncingFromHeader = true
    canvasContainer.value.scrollLeft = left
  }
}

const handleCanvasClick = (event: MouseEvent) => {
  if (!canvas.value) return
  const rect = canvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left + scrollLeft.value
  const y = event.clientY - rect.top + (canvasContainer.value?.scrollTop ?? 0)
  const rowIndex = Math.floor(y / rowHeight)
  const task = props.tasks[rowIndex]
  if (!task) return
  emit('select-task', task.id)
}

const zoomPresets: Record<string, number> = {
  hour: 4,
  day: 1,
  week: 0.5,
  month: 0.25,
  quarter: 0.1,
  year: 0.05
}

const applyZoom = (zoomValue: ResolvedGanttOptions['zoom']) => {
  if (!zoomValue) {
    zoomLevel.value = 1
    return
  }

  if (zoomValue === 'fit') {
    const containerWidth = canvasContainer.value?.clientWidth ?? 1
    const naturalWidth = durationMs.value * (basePixelsPerHour / (60 * 60 * 1000))
    zoomLevel.value = naturalWidth > 0 ? containerWidth / Math.max(naturalWidth, 1) : 1
    return
  }

  if (typeof zoomValue === 'number' && Number.isFinite(zoomValue) && zoomValue > 0) {
    zoomLevel.value = zoomValue
    return
  }

  if (typeof zoomValue === 'string') {
    const preset = zoomPresets[zoomValue]
    if (preset) {
      zoomLevel.value = preset
      return
    }
  }

  zoomLevel.value = 1
}

onMounted(() => {
  if (!canvas.value) return
  canvasContext.value = canvas.value.getContext('2d')
  handleBodyScroll()
  resizeObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(() => {
        if (props.options.zoom === 'fit') {
          applyZoom('fit')
        }
        draw()
      })
    : null
  if (resizeObserver && canvasContainer.value) {
    resizeObserver.observe(canvasContainer.value)
  }
  void nextTick(() => {
    applyZoom(props.options.zoom)
    draw()
  })
})

watch(
  () => [
    props.tasks,
    pixelsPerMs.value,
    timelineStart.value.getTime(),
    contentHeight.value,
    contentWidth.value,
    props.showBaselines,
    props.highlightCritical,
    props.selectedTaskId
  ],
  () => {
    draw()
  },
  { deep: true }
)

watch(
  () => props.stats,
  () => draw(),
  { deep: true }
)

watch(
  () => props.options.zoom,
  (zoomValue) => {
    applyZoom(zoomValue)
    draw()
  },
  { immediate: true }
)

watch(durationMs, () => {
  if (props.options.zoom === 'fit') {
    applyZoom('fit')
  }
  draw()
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})
</script>
