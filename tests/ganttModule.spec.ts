import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const calculateMock = vi.fn()

vi.mock('@/components/GanttGrid.vue', () => ({
  default: defineComponent({
    name: 'GanttGridStub',
    props: ['tasks', 'loading', 'columns', 'messages'],
    emits: ['update:task'],
    setup(props, { emit }) {
      return () =>
        h(
          'div',
          {
            class: 'grid-stub',
            onClick: () => emit('update:task', props.tasks?.[0])
          },
          'grid'
        )
    }
  })
}))

vi.mock('@/components/GanttTimeline.vue', () => ({
  default: defineComponent({
    name: 'GanttTimelineStub',
    props: ['tasks', 'dependencies', 'project', 'options', 'stats'],
    emits: ['scrollToTask'],
    setup() {
      return () => h('div', { class: 'timeline-stub' }, 'timeline')
    }
  })
}))

vi.mock('@/composables/useSchedulerWorker', () => ({
  useSchedulerWorker: () => ({
    calculate: calculateMock
  })
}))

import GanttModule from '@/components/GanttModule.vue'
import type { CalculationResult, GanttModelValue } from '@/types'

const model: GanttModelValue = {
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
      id: 't1',
      name: 'Task 1',
      type: 'task',
      start: '2025-01-01T08:00:00Z',
      finish: '2025-01-01T17:00:00Z'
    }
  ],
  dependencies: []
}

const calculation: CalculationResult = {
  tasks: [
    {
      ...model.tasks[0],
      duration: 480,
      flags: { critical: true }
    }
  ],
  stats: {
    criticalTasks: ['t1'],
    durationMs: 1,
    recalculatedAt: '2025-01-01T00:00:00Z'
  },
  messages: []
}

describe('GanttModule', () => {
  beforeEach(() => {
    calculateMock.mockResolvedValue(calculation)
  })

  const factory = () =>
    mount(GanttModule, {
      props: {
        modelValue: structuredClone(model),
        options: {
          zoom: 'fit',
          showCritical: true
        }
      }
    })

  it('emits ready and calculation events', async () => {
    const wrapper = factory()
    await flushPromises()

    const ready = wrapper.emitted('ready')
    expect(ready?.[ready.length - 1]?.[0].stats?.criticalTasks).toEqual(['t1'])

    const calculationComplete = wrapper.emitted('calculationComplete')
    expect(calculationComplete?.[0]?.[0].stats.criticalTasks).toEqual(['t1'])

    expect(wrapper.emitted('zoomChanged')?.[0]?.[0]).toBe('fit')
  })

  it('exposes API methods that update the model and trigger events', async () => {
    const wrapper = factory()
    await flushPromises()

    const instance = wrapper.vm as unknown as {
      addTask: (task: any) => void
      deleteTask: (id: string) => void
      getCriticalPath: () => string[]
    }

    instance.addTask({
      id: 't2',
      name: 'Task 2',
      type: 'task',
      start: '2025-01-02T08:00:00Z',
      finish: '2025-01-02T17:00:00Z'
    })

    await flushPromises()

    expect(wrapper.emitted('taskCreated')).toBeTruthy()
    expect(instance.getCriticalPath()).toContain('t1')

    instance.deleteTask('t2')
    await flushPromises()
    expect(wrapper.emitted('taskDeleted')?.[0]?.[0]).toBe('t2')
  })
})
