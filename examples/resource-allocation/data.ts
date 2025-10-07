import type { GanttModelValue } from '../../src/types'

export const resourceModel: GanttModelValue = {
  project: {
    id: 'tower',
    name: 'Tower Crane Install',
    calendarId: 'standard',
    statusDate: '2025-03-01T00:00:00Z',
    settings: {
      progressMode: 'work',
      nearCriticalThresholdDays: 1,
      timeScale: 'day'
    }
  },
  calendars: [
    {
      id: 'standard',
      name: 'Standard 5x10',
      workWeek: {
        1: { working: true, periods: [{ start: '07:00', end: '12:00' }, { start: '13:00', end: '18:00' }] },
        2: { working: true, periods: [{ start: '07:00', end: '12:00' }, { start: '13:00', end: '18:00' }] },
        3: { working: true, periods: [{ start: '07:00', end: '12:00' }, { start: '13:00', end: '18:00' }] },
        4: { working: true, periods: [{ start: '07:00', end: '12:00' }, { start: '13:00', end: '18:00' }] },
        5: { working: true, periods: [{ start: '07:00', end: '12:00' }, { start: '13:00', end: '18:00' }] }
      }
    }
  ],
  tasks: [
    {
      id: 'sum-crane',
      name: 'Tower Crane Deployment',
      type: 'task',
      start: '2025-02-10T07:00:00Z',
      finish: '2025-02-19T18:00:00Z',
      duration: 0
    },
    {
      id: 'sum-prep',
      parentId: 'sum-crane',
      name: 'Engineering & Preparation',
      type: 'task',
      start: '2025-02-10T07:00:00Z',
      finish: '2025-02-12T18:00:00Z',
      duration: 0
    },
    {
      id: 't-engineer',
      parentId: 'sum-prep',
      name: 'Engineer crane pads',
      type: 'task',
      start: '2025-02-10T07:00:00Z',
      finish: '2025-02-12T18:00:00Z',
      duration: 1800,
      baseline: [
        { index: 0, start: '2025-02-10T07:00:00Z', finish: '2025-02-12T18:00:00Z', duration: 1800 }
      ]
    },
    {
      id: 'sum-install',
      parentId: 'sum-crane',
      name: 'Installation & Testing',
      type: 'task',
      start: '2025-02-13T07:00:00Z',
      finish: '2025-02-19T18:00:00Z',
      duration: 0
    },
    {
      id: 't-install',
      parentId: 'sum-install',
      name: 'Install tower crane',
      type: 'task',
      start: '2025-02-13T07:00:00Z',
      finish: '2025-02-17T18:00:00Z',
      duration: 3000,
      baseline: [
        { index: 0, start: '2025-02-13T07:00:00Z', finish: '2025-02-17T18:00:00Z', duration: 3000 }
      ]
    },
    {
      id: 't-test',
      parentId: 'sum-install',
      name: 'Commissioning and load test',
      type: 'task',
      start: '2025-02-18T07:00:00Z',
      finish: '2025-02-19T18:00:00Z',
      duration: 1200
    }
  ],
  dependencies: [
    { id: 'd1', predecessorId: 't-engineer', successorId: 't-install', type: 'FS' },
    { id: 'd2', predecessorId: 't-install', successorId: 't-test', type: 'FS', lag: { value: 4, unit: 'h' } }
  ],
  resources: [
    { id: 'r-crew', name: 'Crane Crew', type: 'labor', maxUnits: 1 },
    { id: 'r-operator', name: 'Operator', type: 'labor', maxUnits: 1 },
    { id: 'r-crane', name: 'Tower Crane', type: 'equipment', maxUnits: 1 }
  ],
  assignments: [
    { id: 'a1', taskId: 't-install', resourceId: 'r-crew', units: 1, work: 80, cost: 12000 },
    { id: 'a2', taskId: 't-install', resourceId: 'r-operator', units: 1, work: 80, cost: 6400 },
    { id: 'a3', taskId: 't-install', resourceId: 'r-crane', units: 1, work: 80, cost: 18000 }
  ]
}
