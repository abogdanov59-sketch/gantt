import { computed, reactive, watch, type Ref } from 'vue'
import type {
  CalculationResult,
  GanttModelValue,
  ResolvedGanttOptions,
  SchedulerStats,
  Task
} from '@/types'
import { useSchedulerWorker } from './useSchedulerWorker'

interface UseGanttStateOptions {
  modelValue: Ref<GanttModelValue>
  options: Ref<ResolvedGanttOptions>
}

export const useGanttState = ({ modelValue, options }: UseGanttStateOptions) => {
  const state = reactive({
    tasks: computed(() => modelValue.value.tasks),
    calculation: null as CalculationResult | null,
    stats: null as SchedulerStats | null,
    messages: [] as CalculationResult['messages'],
    loading: false
  })

  const worker = useSchedulerWorker()
  const schedulerOptions = computed(() => ({
    nearCriticalThresholdDays: options.value.nearCriticalThresholdDays,
    progressMode: options.value.progressMode,
    enableLeveling: options.value.enableLeveling
  }))

  const recalculate = async () => {
    state.loading = true
    const result = await worker.calculate(modelValue.value, schedulerOptions.value)
    state.calculation = result
    state.stats = result.stats
    state.messages = result.messages
    state.loading = false
  }

  watch(
    [modelValue, schedulerOptions],
    () => {
      void recalculate()
    },
    { immediate: true, deep: true }
  )

  const getTaskById = (taskId: string): Task | undefined => {
    return state.calculation?.tasks.find((task) => task.id === taskId)
  }

  return {
    state,
    recalculate,
    getTaskById
  }
}
