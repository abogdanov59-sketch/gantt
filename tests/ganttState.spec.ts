import { describe, expect, it, vi, beforeEach } from 'vitest'
import { nextTick, ref } from 'vue'

const calculateMock = vi.fn()

vi.mock('@/composables/useSchedulerWorker', () => ({
  useSchedulerWorker: () => ({
    calculate: calculateMock
  })
}))

import { useGanttState } from '@/composables/useGanttState'
import type { CalculationResult, GanttModelValue, ResolvedGanttOptions } from '@/types'

const baseModel: GanttModelValue = {
  project: {
    id: 'demo',
    name: 'Demo',
    calendarId: 'cal',
    settings: {
      progressMode: 'duration',
      nearCriticalThresholdDays: 1
    }
  },
  calendars: [
    {
      id: 'cal',
      name: 'Standard',
      workWeek: {
        1: { working: true, periods: [{ start: '08:00', end: '17:00' }] }
      }
    }
  ],
  tasks: [
    {
      id: 'sum',
      name: 'Summary',
      type: 'task',
      start: '2025-01-01T08:00:00Z',
      finish: '2025-01-02T17:00:00Z',
      children: [
        {
          id: 't1',
          parentId: 'sum',
          name: 'Task 1',
          type: 'task',
          start: '2025-01-01T08:00:00Z',
          finish: '2025-01-01T17:00:00Z'
        }
      ]
    }
  ],
  dependencies: []
}

const stubResult: CalculationResult = {
  tasks: [
    {
      id: 'sum',
      name: 'Summary',
      type: 'task',
      start: '2025-01-01T08:00:00Z',
      finish: '2025-01-02T17:00:00Z',
      duration: 960
    },
    {
      id: 't1',
      parentId: 'sum',
      name: 'Task 1',
      type: 'task',
      start: '2025-01-01T08:00:00Z',
      finish: '2025-01-01T17:00:00Z',
      duration: 480,
      flags: { critical: true }
    }
  ],
  stats: {
    criticalTasks: ['t1'],
    durationMs: 5,
    recalculatedAt: '2025-01-01T00:00:00Z'
  },
  messages: []
}

describe('useGanttState', () => {
  const options: ResolvedGanttOptions = {
    nearCriticalThresholdDays: 1,
    progressMode: 'duration',
    enableLeveling: false,
    showBaselines: true,
    showCritical: true,
    showNonWorking: true,
    zoom: 'fit',
    rtl: false,
    timeZone: undefined,
    locale: undefined,
    theme: 'light'
  }

  beforeEach(() => {
    calculateMock.mockResolvedValue(stubResult)
  })

  const flush = async () => {
    await Promise.resolve()
    await nextTick()
  }

  it('performs an initial calculation and exposes task lookup', async () => {
    const modelRef = ref(structuredClone(baseModel))
    const optionsRef = ref(options)
    const { state, getTaskById } = useGanttState({ modelValue: modelRef, options: optionsRef })

    await flush()

    expect(state.calculation?.tasks[0].flags?.critical).toBe(true)
    expect(calculateMock).toHaveBeenCalledTimes(1)
    expect(getTaskById('t1')?.id).toBe('t1')
  })

  it('recalculates when the model changes', async () => {
    const modelRef = ref(structuredClone(baseModel))
    const optionsRef = ref(options)
    const { state } = useGanttState({ modelValue: modelRef, options: optionsRef })

    await flush()

    modelRef.value = {
      ...modelRef.value,
      tasks: [
        ...modelRef.value.tasks,
        {
          id: 't2',
          parentId: 'sum',
          name: 'Task 2',
          type: 'task',
          start: '2025-01-02T08:00:00Z',
          finish: '2025-01-02T17:00:00Z'
        }
      ]
    }

    await flush()

    expect(calculateMock).toHaveBeenCalledTimes(2)
    expect(state.loading).toBe(false)
  })
})
