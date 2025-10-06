<template>
  <div class="flex h-full flex-col">
    <TimeRuler :start-date="timelineStart" :end-date="timelineEnd" :zoom="zoom" />
    <div ref="canvasContainer" class="relative flex-1 overflow-auto bg-slate-50 dark:bg-slate-900">
      <canvas ref="canvas" class="h-full w-full"></canvas>
      <DependencyLayer
        v-if="canvasContext"
        :tasks="tasks"
        :dependencies="dependencies"
        :project="project"
        :scale="scale"
        :row-height="rowHeight"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, type PropType } from 'vue'
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

const emit = defineEmits(['scrollToTask'])

const canvas = ref<HTMLCanvasElement | null>(null)
const canvasContainer = ref<HTMLDivElement | null>(null)
const canvasContext = ref<CanvasRenderingContext2D | null>(null)
const zoom = ref(1)
const rowHeight = 44

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

const scale = computed(() => {
  const duration = Math.max(1, timelineEnd.value.getTime() - timelineStart.value.getTime())
  const baseWidth = (canvasContainer.value?.clientWidth ?? 1024) * zoom.value
  return baseWidth / duration
})

const draw = () => {
  const context = canvasContext.value
  const element = canvasContainer.value
  const canvasElement = canvas.value
  if (!context || !element || !canvasElement) return
  const width = element.clientWidth
  const height = Math.max(props.tasks.length * rowHeight, element.clientHeight)
  canvasElement.width = width
  canvasElement.height = height
  context.clearRect(0, 0, width, height)

  props.tasks.forEach((task, index) => {
    const y = index * rowHeight + 12
    const start = new Date(task.start).getTime()
    const finish = new Date(task.finish).getTime()
    const x = (start - timelineStart.value.getTime()) * scale.value
    const barWidth = Math.max((finish - start) * scale.value, 3)
    context.fillStyle = task.flags?.critical
      ? 'var(--gantt-critical-color, #ef4444)'
      : 'var(--gantt-bar-color, #2563eb)'
    context.fillRect(x, y, barWidth, rowHeight - 24)
    context.fillStyle = '#fff'
    context.font = '12px sans-serif'
    context.fillText(task.name, x + 4, y + 12)
  })
}

onMounted(() => {
  if (!canvas.value) return
  canvasContext.value = canvas.value.getContext('2d')
  draw()
})

watch(
  () => [props.tasks, zoom.value],
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
    if (zoomValue === 'fit') {
      zoom.value = 1
    } else if (typeof zoomValue === 'number') {
      zoom.value = zoomValue
    }
    draw()
  },
  { immediate: true }
)
</script>
