<template>
  <div class="flex h-full flex-col">
    <TimeRuler
      :start-date="timelineStart"
      :end-date="timelineEnd"
      :pixels-per-ms="pixelsPerMs"
      :content-width="contentWidth"
      :scroll-left="scrollLeft"
    />
    <div
      ref="canvasContainer"
      class="relative flex-1 overflow-auto bg-slate-50 dark:bg-slate-900"
      @scroll="handleScroll"
    >
      <div class="relative" :style="canvasWrapperStyle">
        <canvas ref="canvas" class="block h-full w-full"></canvas>
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
import type {
  Dependency,
  Project,
  ResolvedGanttOptions,
  SchedulerStats,
  Task
} from '@/types'
import DependencyLayer from './DependencyLayer.vue'
import TimeRuler from './TimeRuler.vue'

const props = defineProps({
  tasks: {
    type: Array as PropType<Task[]>,
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
  }
})

const canvas = ref<HTMLCanvasElement | null>(null)
const canvasContainer = ref<HTMLDivElement | null>(null)
const canvasContext = ref<CanvasRenderingContext2D | null>(null)
const scrollLeft = ref(0)
const rowHeight = 44
const basePixelsPerHour = 48
const zoomLevel = ref(1)
let resizeObserver: ResizeObserver | null = null

const startDates = computed(() => props.tasks.map((task) => new Date(task.start).getTime()))
const finishDates = computed(() => props.tasks.map((task) => new Date(task.finish).getTime()))

const timelineStart = computed(() => {
  if (!startDates.value.length) return new Date()
  return new Date(Math.min(...startDates.value))
})
const timelineEnd = computed(() => {
  if (!finishDates.value.length) return new Date()
  return new Date(Math.max(...finishDates.value))
})

const durationMs = computed(() => Math.max(1, timelineEnd.value.getTime() - timelineStart.value.getTime()))

const pixelsPerMs = computed(() => (basePixelsPerHour * zoomLevel.value) / (60 * 60 * 1000))

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
    const barWidth = Math.max((finish - start) * pixelsPerMs.value, 3)
    context.fillStyle = task.flags?.critical
      ? 'var(--gantt-critical-color, #ef4444)'
      : 'var(--gantt-bar-color, #2563eb)'
    context.fillRect(x, y, barWidth, rowHeight - 24)
    context.fillStyle = '#fff'
    context.font = '12px sans-serif'
    context.fillText(task.name, x + 4, y + 12)
  })
}

const handleScroll = () => {
  scrollLeft.value = canvasContainer.value?.scrollLeft ?? 0
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
    const naturalWidth = durationMs.value * ((basePixelsPerHour) / (60 * 60 * 1000))
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
  handleScroll()
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
  () => [props.tasks, pixelsPerMs.value, timelineStart.value.getTime(), contentHeight.value, contentWidth.value],
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

watch(
  durationMs,
  () => {
    if (props.options.zoom === 'fit') {
      applyZoom('fit')
    }
    draw()
  }
)

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})
</script>
