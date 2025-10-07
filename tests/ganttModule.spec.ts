import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const calculateMock = vi.fn()

vi.mock('@/components/GanttGrid.vue', () => ({
  default: defineComponent({
    name: 'GanttGridStub',
    props: ['tasks', 'loading', 'columns', 'messages', 'highlightCritical', 'selectedTaskId'],
    emits: ['update:task', 'edit-task'],
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
    props: [
      'tasks',
      'dependencies',
      'project',
      'options',
      'stats',
      'showBaselines',
      'highlightCritical',
      'selectedTaskId'
    ],
    emits: ['scrollToTask', 'select-task'],
    setup() {
      return () => h('div', { class: 'timeline-stub' }, 'timeline')
    }
  })
}))

vi.mock('primevue/togglebutton', () => ({
  default: defineComponent({
    name: 'ToggleButtonStub',
    props: ['modelValue', 'onLabel', 'offLabel', 'pt'],
    emits: ['update:modelValue'],
    setup(props, { emit }) {
      return () =>
        h(
          'button',
          {
            class: 'toggle-stub',
            onClick: () => emit('update:modelValue', !props.modelValue)
          },
          props.modelValue ? props.onLabel : props.offLabel
        )
    }
  })
}))

vi.mock('primevue/dialog', () => ({
  default: defineComponent({
    name: 'DialogStub',
    props: ['visible', 'header'],
    emits: ['update:visible'],
    setup(props, { slots }) {
      return () =>
        props.visible ? h('div', { class: 'dialog-stub' }, slots.default?.()) : null
    }
  })
}))

vi.mock('primevue/inputtext', () => ({
  default: defineComponent({
    name: 'InputTextStub',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    setup(props, { emit }) {
      return () =>
        h('input', {
          class: 'inputtext-stub',
          value: props.modelValue,
          onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value)
        })
    }
  })
}))

vi.mock('primevue/inputnumber', () => ({
  default: defineComponent({
    name: 'InputNumberStub',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    setup(props, { emit }) {
      return () =>
        h('input', {
          class: 'inputnumber-stub',
          value: props.modelValue as any,
          onInput: (event: Event) => emit('update:modelValue', Number((event.target as HTMLInputElement).value))
        })
    }
  })
}))

vi.mock('primevue/calendar', () => ({
  default: defineComponent({
    name: 'CalendarStub',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    setup(props, { emit }) {
      return () =>
        h('input', {
          class: 'calendar-stub',
          value: props.modelValue ? (props.modelValue as Date).toISOString() : '',
          onInput: () => emit('update:modelValue', new Date('2025-01-01T08:00:00Z'))
        })
    }
  })
}))

vi.mock('primevue/multiselect', () => ({
  default: defineComponent({
    name: 'MultiSelectStub',
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
    setup(props, { emit }) {
      return () =>
        h(
          'select',
          {
            class: 'multiselect-stub',
            onChange: () => emit('update:modelValue', props.options?.map((option: any) => option.id) ?? [])
          },
          []
        )
    }
  })
}))

vi.mock('primevue/button', () => ({
  default: defineComponent({
    name: 'ButtonStub',
    props: ['label'],
    emits: ['click'],
    setup(props, { emit }) {
      return () =>
        h('button', { class: 'button-stub', onClick: () => emit('click') }, props.label)
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

  it('opens the editor on select-task and saves updates', async () => {
    const wrapper = factory()
    await flushPromises()

    const timeline = wrapper.findComponent({ name: 'GanttTimelineStub' })
    timeline.vm.$emit('select-task', 't1')
    await flushPromises()

    expect(wrapper.find('.dialog-stub').exists()).toBe(true)

    const nameInput = wrapper.find('input.inputtext-stub')
    await nameInput.setValue('Task 1 updated')

    const buttons = wrapper.findAll('.button-stub')
    await buttons[1].trigger('click')
    await flushPromises()

    const taskUpdated = wrapper.emitted('taskUpdated')?.find((event) => event?.[0]?.taskId === 't1')
    expect(taskUpdated?.[0]?.patch.name).toBe('Task 1 updated')
  })
})
