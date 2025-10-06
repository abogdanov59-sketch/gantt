/// <reference lib="webworker" />
import { calculateSchedule } from '@/utils/scheduler'
import type { SchedulerWorkerMessage, SchedulerWorkerResponse } from '@/types'

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope

ctx.addEventListener('message', (event: MessageEvent<SchedulerWorkerMessage>) => {
  if (event.data.type !== 'calculate') return
  const result = calculateSchedule(event.data.payload.model, event.data.payload.options)
  const response: SchedulerWorkerResponse = {
    result
  }
  ctx.postMessage(response)
})
