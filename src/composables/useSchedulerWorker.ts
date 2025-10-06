import type { CalculationResult, GanttModelValue, SchedulerOptions } from '@/types'
import { createSchedulerWorker } from '@/worker/createSchedulerWorker'

export const useSchedulerWorker = () => {
  const worker = createSchedulerWorker()

  const calculate = async (
    model: GanttModelValue,
    options: SchedulerOptions
  ): Promise<CalculationResult> => {
    return worker.calculate(model, options)
  }

  return {
    calculate
  }
}
