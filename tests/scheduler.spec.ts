import { describe, expect, it } from 'vitest'
import { calculateSchedule } from '@/utils/scheduler'
import type { GanttModelValue, SchedulerOptions } from '@/types'

const baseModel: GanttModelValue = {
  project: {
    id: 'p1',
    name: 'Demo',
    calendarId: 'cal',
    statusDate: '2025-01-10T00:00:00Z',
    settings: {
      nearCriticalThresholdDays: 2,
      progressMode: 'duration'
    }
  },
  calendars: [
    {
      id: 'cal',
      name: '5d',
      workWeek: {
        1: { working: true, periods: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
        2: { working: true, periods: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
        3: { working: true, periods: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
        4: { working: true, periods: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
        5: { working: true, periods: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }] }
      }
    }
  ],
  tasks: [
    {
      id: 't1',
      name: 'Task 1',
      type: 'task',
      start: '2025-01-06T08:00:00Z',
      finish: '2025-01-07T17:00:00Z',
      duration: 960
    },
    {
      id: 't2',
      name: 'Task 2',
      type: 'task',
      start: '2025-01-08T08:00:00Z',
      finish: '2025-01-10T17:00:00Z',
      duration: 1440
    }
  ],
  dependencies: [
    {
      id: 'd1',
      predecessorId: 't1',
      successorId: 't2',
      type: 'FS',
      lag: { value: 1, unit: 'd' }
    }
  ]
}

const options: SchedulerOptions = {
  nearCriticalThresholdDays: 2,
  progressMode: 'duration',
  enableLeveling: false
}

describe('calculateSchedule', () => {
  it('computes earliest dates respecting lag', () => {
    const result = calculateSchedule(baseModel, options)
    const task2 = result.tasks.find((task) => task.id === 't2')
    expect(task2).toBeDefined()
    expect(task2?.start).not.toBe(baseModel.tasks[1].start)
  })

  it('marks critical path when float is zero', () => {
    const model = structuredClone(baseModel)
    model.dependencies[0].lag = { value: 0, unit: 'min' }
    const result = calculateSchedule(model, options)
    const critical = result.tasks.filter((task) => task.flags?.critical)
    expect(critical.map((task) => task.id)).toContain('t2')
  })
})
