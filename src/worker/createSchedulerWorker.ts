import type {
  CalculationResult,
  GanttModelValue,
  SchedulerOptions,
  SchedulerWorkerMessage,
  SchedulerWorkerResponse
} from '@/types'
import { calculateSchedule } from '@/utils/scheduler'

const cloneForWorker = <T>(value: T): T => {
  const structuredCloneFn = (
    globalThis as { structuredClone?: <S>(input: S) => S }
  ).structuredClone

  if (typeof structuredCloneFn === 'function') {
    return structuredCloneFn(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

export interface SchedulerWorkerApi {
  calculate: (
    model: GanttModelValue,
    options: SchedulerOptions
  ) => Promise<CalculationResult>
}

export const createSchedulerWorker = (): SchedulerWorkerApi => {
  let worker: Worker | null = null
  if (typeof Worker !== 'undefined') {
    worker = new Worker(new URL('./schedulerWorker.ts', import.meta.url), {
      type: 'module'
    })
  }

  const calculate = async (
    model: GanttModelValue,
    options: SchedulerOptions
  ): Promise<CalculationResult> => {
    if (!worker) {
      return calculateSchedule(model, options)
    }
    return new Promise((resolve, reject) => {
      const handleMessage = (event: MessageEvent<SchedulerWorkerResponse>) => {
        worker?.removeEventListener('message', handleMessage)
        resolve(event.data.result)
      }
      const handleError = (event: ErrorEvent) => {
        worker?.removeEventListener('error', handleError)
        reject(event.error)
      }
      worker.addEventListener('message', handleMessage)
      worker.addEventListener('error', handleError)
      const message: SchedulerWorkerMessage = {
        type: 'calculate',
        payload: {
          model: cloneForWorker(model),
          options: cloneForWorker(options)
        }
      }
      worker.postMessage(message)
    })
  }

  return {
    calculate
  }
}
