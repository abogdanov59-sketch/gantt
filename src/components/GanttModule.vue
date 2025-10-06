<template>
  <div :class="['gantt-container', themeClass, { rtl: optionsComputed.rtl }]">
    <div class="gantt-module flex h-full w-full">
      <aside class="w-96 border-r border-slate-200 dark:border-slate-700">
        <GanttGrid
          :tasks="calculation?.tasks ?? modelValue.tasks"
          :loading="state.loading"
          :columns="columns"
          :messages="state.messages"
          @update:task="handleTaskUpdate"
        />
      </aside>
      <section class="flex-1 overflow-hidden">
        <GanttTimeline
          :tasks="calculation?.tasks ?? modelValue.tasks"
          :dependencies="modelValue.dependencies"
          :project="modelValue.project"
          :options="optionsComputed"
          :stats="state.stats"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, type PropType } from 'vue'
import type {
  ColumnDef,
  GanttModelValue,
  ResolvedGanttOptions,
  SchedulerOptions,
  SchedulerStats,
  Task
} from '@/types'
import GanttGrid from './GanttGrid.vue'
import GanttTimeline from './GanttTimeline.vue'
import { useGanttApi } from '@/composables/useGanttApi'
import { useGanttState } from '@/composables/useGanttState'

const props = defineProps({
  modelValue: {
    type: Object as PropType<GanttModelValue>,
    required: true
  },
  options: {
    type: Object as PropType<Partial<SchedulerOptions> | undefined>,
    default: undefined
  },
  columns: {
    type: Array as PropType<ColumnDef[]>,
    default: () => []
  }
})

const emit = defineEmits([
  'update:modelValue',
  'ready',
  'error',
  'taskCreated',
  'taskUpdated',
  'taskDeleted',
  'dependencyAdded',
  'dependencyRemoved',
  'assignmentChanged',
  'selectionChanged',
  'viewportChanged',
  'zoomChanged',
  'calculationComplete'
])

const optionsComputed = computed<ResolvedGanttOptions>(() => ({
  nearCriticalThresholdDays:
    props.options?.nearCriticalThresholdDays ??
    props.modelValue.project.settings.nearCriticalThresholdDays ??
    1,
  progressMode:
    props.options?.progressMode ??
    props.modelValue.project.settings.progressMode ??
    'duration',
  enableLeveling: props.options?.enableLeveling ?? false,
  zoom: props.options?.zoom,
  rtl: props.options?.rtl ?? false,
  theme: props.options?.theme
}))

const modelRef = ref(props.modelValue)
watch(
  () => props.modelValue,
  (value) => {
    modelRef.value = value
  }
)

const api = useGanttApi({
  model: modelRef,
  emit: emit as any,
  options: optionsComputed
})

const { state, recalculate } = useGanttState({
  modelValue: modelRef,
  options: optionsComputed
})

const calculation = computed(() => state.calculation)

watch(calculation, (result) => {
  if (!result) return
  emit('calculationComplete', {
    stats: result.stats,
    messages: result.messages
  })
})

watch(
  () => optionsComputed.value.zoom,
  (zoomLevel) => {
    emit('zoomChanged', zoomLevel)
  },
  { immediate: true }
)

const themeClass = computed(() => {
  const themeOption = props.options?.theme
  if (themeOption === 'dark') return 'gantt-theme-dark'
  if (themeOption === 'light') return 'gantt-theme-light'
  if (typeof themeOption === 'object' && themeOption?.cssVars) {
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      Object.entries(themeOption.cssVars).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value)
      })
    }
    return 'gantt-theme-light'
  }
  return 'gantt-theme-light'
})

const handleTaskUpdate = (task: Task) => {
  api.updateTask(task.id, task)
  void recalculate()
}

const exposeApi = {
  addTask: api.addTask,
  updateTask: api.updateTask,
  deleteTask: api.deleteTask,
  addDependency: api.addDependency,
  removeDependency: api.removeDependency,
  setBaseline: api.setBaseline,
  clearBaseline: api.clearBaseline,
  recalculate,
  getCriticalPath: api.getCriticalPath,
  assignResource: api.assignResource,
  removeAssignment: api.removeAssignment
}

defineExpose(exposeApi)

const readyPayload = computed(() => ({
  api: exposeApi,
  stats: state.stats as SchedulerStats | null
}))

watch(
  () => readyPayload.value,
  (payload) => {
    if (!payload) return
    emit('ready', payload)
  },
  { immediate: true }
)
</script>

<style scoped>
.gantt-module {
  min-height: 400px;
}

.rtl {
  direction: rtl;
}
</style>
