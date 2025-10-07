import { computed, type Ref } from 'vue'
import type {
  Assignment,
  Dependency,
  GanttModelValue,
  SchedulerOptions,
  Task
} from '@/types'

interface UseGanttApiOptions {
  model: Ref<GanttModelValue>
  emit: (event: string, ...args: any[]) => void
  options: Ref<SchedulerOptions>
}

export const useGanttApi = ({ model, emit, options }: UseGanttApiOptions) => {
  const addTask = (task: Task) => {
    model.value = {
      ...model.value,
      tasks: [...model.value.tasks, task]
    }
    emit('taskCreated', task)
    emit('update:modelValue', model.value)
  }

  const updateTask = (taskId: string, patch: Partial<Task>) => {
    model.value = {
      ...model.value,
      tasks: model.value.tasks.map((task) =>
        task.id === taskId ? { ...task, ...patch } : task
      )
    }
    emit('taskUpdated', { taskId, patch })
    emit('update:modelValue', model.value)
  }

  const deleteTask = (taskId: string) => {
    model.value = {
      ...model.value,
      tasks: model.value.tasks.filter((task) => task.id !== taskId),
      dependencies: model.value.dependencies.filter(
        (dependency) =>
          dependency.predecessorId !== taskId && dependency.successorId !== taskId
      )
    }
    emit('taskDeleted', taskId)
    emit('update:modelValue', model.value)
  }

  const addDependency = (dependency: Dependency) => {
    model.value = {
      ...model.value,
      dependencies: [...model.value.dependencies, dependency]
    }
    emit('dependencyAdded', dependency)
    emit('update:modelValue', model.value)
  }

  const removeDependency = (dependencyId: string) => {
    model.value = {
      ...model.value,
      dependencies: model.value.dependencies.filter(
        (dependency) => dependency.id !== dependencyId
      )
    }
    emit('dependencyRemoved', dependencyId)
    emit('update:modelValue', model.value)
  }

  const setBaseline = (index: number) => {
    model.value = {
      ...model.value,
      tasks: model.value.tasks.map((task) => {
        const snapshot = {
          index,
          start: task.start,
          finish: task.finish,
          duration: task.duration
        }
        const baseline = task.baseline ?? []
        const filtered = baseline.filter((item) => item.index !== index)
        return {
          ...task,
          baseline: [...filtered, snapshot]
        }
      })
    }
    emit('update:modelValue', model.value)
  }

  const clearBaseline = (index: number) => {
    model.value = {
      ...model.value,
      tasks: model.value.tasks.map((task) => ({
        ...task,
        baseline: (task.baseline ?? []).filter((baseline) => baseline.index !== index)
      }))
    }
    emit('update:modelValue', model.value)
  }

  const getCriticalPath = (): string[] => {
    const result: string[] = []
    model.value.tasks.forEach((task) => {
      if (task.flags?.critical) {
        result.push(task.id)
      }
    })
    return result
  }

  const assignResource = (assignment: Assignment) => {
    model.value = {
      ...model.value,
      assignments: [...(model.value.assignments ?? []), assignment]
    }
    emit('assignmentChanged', assignment)
    emit('update:modelValue', model.value)
  }

  const removeAssignment = (assignmentId: string) => {
    model.value = {
      ...model.value,
      assignments: (model.value.assignments ?? []).filter(
        (assignment) => assignment.id !== assignmentId
      )
    }
    emit('assignmentChanged', assignmentId)
    emit('update:modelValue', model.value)
  }

  const zoomLevel = computed(() => options.value.nearCriticalThresholdDays)

  return {
    model,
    addTask,
    updateTask,
    deleteTask,
    addDependency,
    removeDependency,
    setBaseline,
    clearBaseline,
    getCriticalPath,
    assignResource,
    removeAssignment,
    zoomLevel
  }
}
