import type { GanttModelValue } from '../../src/types'

export const basicModel: GanttModelValue = {
  project: {
    id: 'site-a',
    name: 'Site A - Mobilization',
    calendarId: 'standard',
    statusDate: '2025-02-10T00:00:00Z',
    settings: {
      progressMode: 'duration',
      nearCriticalThresholdDays: 2,
      timeScale: 'week'
    }
  },
  calendars: [
    {
      id: 'standard',
      name: 'Standard 5x8',
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
      id: 't-mob',
      name: 'Mobilization',
      type: 'task',
      start: '2025-02-03T08:00:00Z',
      finish: '2025-02-05T17:00:00Z',
      duration: 1440
    },
    {
      id: 't-exc',
      name: 'Excavation',
      type: 'task',
      start: '2025-02-06T08:00:00Z',
      finish: '2025-02-12T17:00:00Z',
      duration: 2400
    },
    {
      id: 't-found',
      name: 'Foundation',
      type: 'task',
      start: '2025-02-13T08:00:00Z',
      finish: '2025-02-20T17:00:00Z',
      duration: 2400
    },
    {
      id: 'm1',
      name: 'Foundation Complete',
      type: 'milestone',
      start: '2025-02-20T17:00:00Z',
      finish: '2025-02-20T17:00:00Z'
    }
  ],
  dependencies: [
    { id: 'd1', predecessorId: 't-mob', successorId: 't-exc', type: 'FS' },
    { id: 'd2', predecessorId: 't-exc', successorId: 't-found', type: 'FS', lag: { value: 1, unit: 'd' } },
    { id: 'd3', predecessorId: 't-found', successorId: 'm1', type: 'FS' }
  ]
}
