import type { GanttModelValue } from '../../src/types'

export const progressModel: GanttModelValue = {
  project: {
    id: 'hospital-wing',
    name: 'Hospital Wing Fit-out',
    calendarId: 'standard',
    statusDate: '2025-04-05T00:00:00Z',
    settings: {
      progressMode: 'duration',
      nearCriticalThresholdDays: 3,
      timeScale: 'week'
    }
  },
  calendars: [
    {
      id: 'standard',
      name: 'Six Day',
      workWeek: {
        1: { working: true, periods: [{ start: '07:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
        2: { working: true, periods: [{ start: '07:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
        3: { working: true, periods: [{ start: '07:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
        4: { working: true, periods: [{ start: '07:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
        5: { working: true, periods: [{ start: '07:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
        6: { working: true, periods: [{ start: '08:00', end: '12:00' }] }
      },
      exceptions: [
        { id: 'good-friday', name: 'Good Friday', date: '2025-04-18', working: false }
      ]
    }
  ],
  tasks: [
    {
      id: 't-roughin',
      name: 'MEP rough-in',
      type: 'task',
      start: '2025-03-24T07:00:00Z',
      finish: '2025-04-05T17:00:00Z',
      duration: 3600,
      percentComplete: { mode: 'duration', value: 60 },
      actual: { start: '2025-03-24T07:00:00Z' },
      baseline: [
        { index: 0, start: '2025-03-24T07:00:00Z', finish: '2025-04-03T17:00:00Z', duration: 3000 }
      ]
    },
    {
      id: 't-drywall',
      name: 'Drywall and taping',
      type: 'task',
      start: '2025-04-06T07:00:00Z',
      finish: '2025-04-18T17:00:00Z',
      duration: 3600,
      percentComplete: { mode: 'duration', value: 10 },
      baseline: [
        { index: 0, start: '2025-04-04T07:00:00Z', finish: '2025-04-15T17:00:00Z', duration: 3000 }
      ]
    },
    {
      id: 't-flooring',
      name: 'Flooring install',
      type: 'task',
      start: '2025-04-19T07:00:00Z',
      finish: '2025-04-27T17:00:00Z',
      duration: 2880,
      percentComplete: { mode: 'duration', value: 0 },
      baseline: [
        { index: 0, start: '2025-04-16T07:00:00Z', finish: '2025-04-25T17:00:00Z', duration: 2880 }
      ]
    },
    {
      id: 'm-turnover',
      name: 'Turnover',
      type: 'milestone',
      start: '2025-04-28T12:00:00Z',
      finish: '2025-04-28T12:00:00Z'
    }
  ],
  dependencies: [
    { id: 'd1', predecessorId: 't-roughin', successorId: 't-drywall', type: 'FS', lag: { value: 1, unit: 'd' } },
    { id: 'd2', predecessorId: 't-drywall', successorId: 't-flooring', type: 'FS' },
    { id: 'd3', predecessorId: 't-flooring', successorId: 'm-turnover', type: 'FS' }
  ]
}
