<template>
  <div :class="['gantt-container h-full w-full', themeClass, { rtl: optionsComputed.rtl }]">
    <div class="gantt-module flex h-full w-full flex-col">
      <header class="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <h1 class="text-base font-semibold text-slate-700 dark:text-slate-100">Gantt Schedule</h1>
        <div class="flex items-center gap-3">
          <ToggleButton
            v-model="showBaselines"
            on-label="SHOW BASELINES"
            off-label="SHOW BASELINES"
            :pt="toggleButtonPt"
          />
          <ToggleButton
            v-model="highlightCritical"
            on-label="HIGHLIGHT CRITICAL"
            off-label="HIGHLIGHT CRITICAL"
            :pt="toggleButtonPt"
          />
        </div>
      </header>
      <div class="flex min-h-0 flex-1">
        <aside class="flex w-96 flex-col border-r border-slate-200 dark:border-slate-700">
          <GanttGrid
            :tasks="visibleTasks"
            :loading="state.loading"
            :columns="columns"
            :messages="state.messages"
            :highlight-critical="highlightCritical"
            :selected-task-id="selectedTaskId"
            @toggle-task="toggleTaskExpansion"
            @update:task="handleTaskUpdate"
            @edit-task="openEditor"
          />
        </aside>
        <section class="flex min-h-0 flex-1 flex-col overflow-hidden">
          <GanttTimeline
            :tasks="visibleTasks"
            :dependencies="modelValue.dependencies"
            :project="modelValue.project"
            :options="optionsComputed"
            :stats="state.stats"
            :show-baselines="showBaselines"
            :highlight-critical="highlightCritical"
            :selected-task-id="selectedTaskId"
            @select-task="openEditor"
          />
        </section>
      </div>
    </div>

    <Dialog v-model:visible="editorVisible" modal :header="editorHeader" class="w-full max-w-2xl">
      <div class="space-y-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="space-y-1">
            <label class="text-sm font-medium text-slate-600 dark:text-slate-200" for="task-name">Name</label>
            <InputText id="task-name" v-model="editorForm.name" class="w-full" />
          </div>
          <div class="space-y-1">
            <label class="text-sm font-medium text-slate-600 dark:text-slate-200" for="task-duration">Duration (minutes)</label>
          <InputNumber
            id="task-duration"
            v-model="editorForm.duration"
            input-class="w-full"
            :min="0"
            :disabled="editorIsSummary"
            @update:model-value="handleDurationInput"
          />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium text-slate-600 dark:text-slate-200">Start</label>
          <Calendar
            v-model="editorForm.start"
            show-time
            hour-format="24"
            class="w-full"
            date-format="dd.mm.yy"
            :disabled="editorIsSummary"
          />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium text-slate-600 dark:text-slate-200">Finish</label>
          <Calendar
            v-model="editorForm.finish"
            show-time
            hour-format="24"
            class="w-full"
            date-format="dd.mm.yy"
            :disabled="editorIsSummary"
          />
        </div>
      </div>
      <p v-if="editorIsSummary" class="text-xs text-slate-500">
        Dates and duration are derived from the summary task's children.
      </p>
      <div class="space-y-1">
        <label class="text-sm font-medium text-slate-600 dark:text-slate-200">Predecessors</label>
        <MultiSelect
          v-model="editorForm.dependencies"
          :options="dependencyChoices"
          option-label="name"
          option-value="id"
          display="chip"
          class="w-full"
          :disabled="editorIsSummary"
        />
      </div>
        <ul v-if="editorErrors.length" class="space-y-1 rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
          <li v-for="error in editorErrors" :key="error">{{ error }}</li>
        </ul>
        <div class="flex justify-end gap-2">
          <Button label="Cancel" severity="secondary" @click="closeEditor" />
          <Button label="Save" icon="pi pi-check" @click="saveTask" />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, type PropType } from 'vue'
import type {
  ColumnDef,
  DisplayTask,
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
import { createTaskHierarchy, flattenTasks } from '@/utils/taskHierarchy'
import ToggleButton from 'primevue/togglebutton'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Calendar from 'primevue/calendar'
import MultiSelect from 'primevue/multiselect'
import Button from 'primevue/button'
import { nanoid } from '@/utils/uuid'

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

const showBaselines = ref(props.options?.showBaselines ?? false)
const highlightCritical = ref(props.options?.showCritical ?? false)

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
  theme: props.options?.theme,
  showBaselines: showBaselines.value,
  showCritical: highlightCritical.value
}))

const normalizeModel = (value: GanttModelValue): GanttModelValue => ({
  ...value,
  tasks: flattenTasks(value.tasks)
})

const modelRef = ref<GanttModelValue>(normalizeModel(props.modelValue))
watch(
  () => props.modelValue,
  (value) => {
    modelRef.value = normalizeModel(value)
  }
)

const api = useGanttApi({
  model: modelRef,
  emit: emit as any,
  options: optionsComputed
})

const { state, recalculate, getTaskById } = useGanttState({
  modelValue: modelRef,
  options: optionsComputed
})

const calculation = computed(() => state.calculation)

const currentTasks = computed<Task[]>(
  () => calculation.value?.tasks ?? modelRef.value.tasks
)

const expansionState = reactive(new Map<string, boolean>())
const hierarchy = computed(() => createTaskHierarchy(currentTasks.value, expansionState))
const hierarchyRows = computed(() => hierarchy.value.rows)
const visibleTasks = computed<DisplayTask[]>(() => hierarchy.value.visibleRows)
const taskMap = computed(() => hierarchy.value.byId)
const leafTasks = computed(() => hierarchyRows.value.filter((task) => !task.isSummary))

const selectedTaskId = ref<string | null>(null)
const editorVisible = ref(false)
const editorErrors = ref<string[]>([])
const editorForm = reactive({
  id: '',
  name: '',
  start: null as Date | null,
  finish: null as Date | null,
  duration: 0,
  dependencies: [] as string[]
})

const dependencyChoices = computed(() =>
  leafTasks.value
    .filter((task) => task.id !== editorForm.id)
    .map((task) => ({ id: task.id, name: task.name }))
)

const editorTask = computed(() =>
  editorForm.id ? taskMap.value.get(editorForm.id) ?? null : null
)

const editorIsSummary = computed(() => editorTask.value?.isSummary ?? false)

const toggleButtonPt = {
  root: { class: 'px-3 py-2 text-sm font-medium uppercase tracking-wide' }
}

watch(
  () => props.options?.showBaselines,
  (value) => {
    if (value == null) return
    showBaselines.value = value
  }
)

watch(
  () => props.options?.showCritical,
  (value) => {
    if (value == null) return
    highlightCritical.value = value
  }
)

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

const openEditor = (taskId: string) => {
  selectedTaskId.value = taskId
  const task = taskMap.value.get(taskId) ?? getTaskById(taskId) ?? modelRef.value.tasks.find((item) => item.id === taskId)
  if (!task) return
  editorErrors.value = []
  editorForm.id = task.id
  editorForm.name = task.name
  editorForm.start = task.start ? new Date(task.start) : null
  editorForm.finish = task.finish ? new Date(task.finish) : null
  editorForm.duration = task.duration ?? 0
  editorForm.dependencies = editorIsSummary.value
    ? []
    : modelRef.value.dependencies
        .filter((dependency) => dependency.successorId === taskId)
        .map((dependency) => dependency.predecessorId)
  editorVisible.value = true
}

const closeEditor = () => {
  editorVisible.value = false
  editorErrors.value = []
  selectedTaskId.value = null
  editorForm.id = ''
  editorForm.name = ''
  editorForm.start = null
  editorForm.finish = null
  editorForm.duration = 0
  editorForm.dependencies = []
}

const editorHeader = computed(() => {
  if (!editorForm.name) {
    return 'Edit Task'
  }
  return `Edit ${editorForm.name}`
})

const handleDurationInput = (value: number | null) => {
  if (editorIsSummary.value) return
  const sanitized = Math.max(0, value ?? 0)
  editorForm.duration = sanitized
  if (editorForm.start) {
    const finish = new Date(editorForm.start.getTime() + sanitized * 60000)
    editorForm.finish = finish
  }
}

watch(
  () => [editorForm.start, editorForm.finish],
  () => {
    if (editorIsSummary.value) return
    if (!editorForm.start || !editorForm.finish) return
    const diff = Math.max(0, Math.round((editorForm.finish.getTime() - editorForm.start.getTime()) / 60000))
    editorForm.duration = diff
  }
)

const saveTask = () => {
  const errors: string[] = []
  if (!editorForm.name.trim()) {
    errors.push('Task name is required.')
  }
  if (!editorIsSummary.value) {
    if (!editorForm.start) {
      errors.push('Start date is required.')
    }
    if (!editorForm.finish) {
      errors.push('Finish date is required.')
    }
    if (editorForm.start && editorForm.finish && editorForm.finish < editorForm.start) {
      errors.push('Finish date must be after the start date.')
    }
  }
  editorErrors.value = errors
  if (errors.length) {
    return
  }

  if (editorIsSummary.value) {
    api.updateTask(editorForm.id, {
      name: editorForm.name
    })
    void recalculate()
    closeEditor()
    return
  }

  const startIso = editorForm.start?.toISOString()
  const finishIso = editorForm.finish?.toISOString()
  const duration = Math.max(0, Math.round(editorForm.duration))

  api.updateTask(editorForm.id, {
    name: editorForm.name,
    start: startIso,
    finish: finishIso,
    duration
  })

  const currentDependencies = modelRef.value.dependencies.filter(
    (dependency) => dependency.successorId === editorForm.id
  )

  currentDependencies
    .filter((dependency) => !editorForm.dependencies.includes(dependency.predecessorId))
    .forEach((dependency) => {
      api.removeDependency(dependency.id)
    })

  editorForm.dependencies
    .filter(
      (predecessorId) =>
        !currentDependencies.some((dependency) => dependency.predecessorId === predecessorId)
    )
    .forEach((predecessorId) => {
      api.addDependency({
        id: nanoid(),
        predecessorId,
        successorId: editorForm.id,
        type: 'FS'
      })
    })

  void recalculate()
  closeEditor()
}

const toggleTaskExpansion = (taskId: string) => {
  const task = taskMap.value.get(taskId)
  if (!task?.isSummary) return
  expansionState.set(taskId, !task.isExpanded)
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
