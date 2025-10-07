import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useGanttApi } from '@/composables/useGanttApi'
import type { GanttModelValue, SchedulerOptions, Task } from '@/types'

const baseModel: GanttModelValue = {
  project: {
    id: 'demo',
    name: 'Demo Project',
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
        1: { working: true, periods: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }] }
      }
    }
  ],
  tasks: [
    {
      id: 't1',
      name: 'Task 1',
      type: 'task',
      start: '2025-01-01T08:00:00Z',
      finish: '2025-01-01T17:00:00Z',
      duration: 480,
      flags: { critical: true }
    }
  ],
  dependencies: []
}

const schedulerOptions: SchedulerOptions = {
  nearCriticalThresholdDays: 1,
  progressMode: 'duration',
  enableLeveling: false
}

describe('useGanttApi', () => {
  const emit = vi.fn()
  let modelRef = ref(structuredClone(baseModel))

  beforeEach(() => {
    emit.mockReset()
    modelRef = ref(structuredClone(baseModel))
  })

  const createApi = () =>
    useGanttApi({
      model: modelRef,
      emit,
      options: ref(schedulerOptions)
    })

  it('adds, updates, and deletes tasks while emitting events', () => {
    const api = createApi()
    const newTask: Task = {
      id: 't2',
      name: 'Task 2',
      type: 'task',
      start: '2025-01-02T08:00:00Z',
      finish: '2025-01-02T17:00:00Z'
    }

    api.addTask(newTask)
    expect(modelRef.value.tasks).toHaveLength(2)
    expect(emit).toHaveBeenCalledWith('taskCreated', newTask)

    api.updateTask('t2', { name: 'Updated Task 2' })
    expect(modelRef.value.tasks.find((task) => task.id === 't2')?.name).toBe('Updated Task 2')
    expect(emit).toHaveBeenCalledWith('taskUpdated', { taskId: 't2', patch: { name: 'Updated Task 2' } })

    api.deleteTask('t2')
    expect(modelRef.value.tasks).toHaveLength(1)
    expect(emit).toHaveBeenCalledWith('taskDeleted', 't2')
  })

  it('manages dependencies and baselines', () => {
    const api = createApi()
    api.addDependency({ id: 'd1', predecessorId: 't1', successorId: 't1', type: 'FF' })
    expect(modelRef.value.dependencies).toHaveLength(1)
    expect(emit).toHaveBeenCalledWith('dependencyAdded', {
      id: 'd1',
      predecessorId: 't1',
      successorId: 't1',
      type: 'FF'
    })

    api.setBaseline(0)
    expect(modelRef.value.tasks[0].baseline?.[0].index).toBe(0)

    api.clearBaseline(0)
    expect(modelRef.value.tasks[0].baseline).toHaveLength(0)

    api.removeDependency('d1')
    expect(modelRef.value.dependencies).toHaveLength(0)
    expect(emit).toHaveBeenCalledWith('dependencyRemoved', 'd1')
  })

  it('exposes critical path, assignments, and zoom level', () => {
    const api = createApi()
    const path = api.getCriticalPath()
    expect(path).toEqual(['t1'])

    api.assignResource({ id: 'a1', taskId: 't1', resourceId: 'res', units: 0.5 })
    expect(modelRef.value.assignments).toHaveLength(1)

    api.removeAssignment('a1')
    expect(modelRef.value.assignments).toHaveLength(0)

    expect(api.zoomLevel.value).toBe(schedulerOptions.nearCriticalThresholdDays)
  })
})
