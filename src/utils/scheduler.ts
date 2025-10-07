import { parseISO } from 'date-fns'
import { nanoid } from './uuid'
import {
  CalendarEngine,
  convertLagToMinutes
} from './calendar'
import type {
  CalculationResult,
  Dependency,
  GanttModelValue,
  SchedulerMessage,
  SchedulerOptions,
  SchedulerStats,
  Task
} from '@/types'

interface NodeState {
  es: Date
  ef: Date
  ls: Date
  lf: Date
  float: number
}

const MINUTES_PER_DAY = 1440

export const calculateSchedule = (
  model: GanttModelValue,
  options: SchedulerOptions
): CalculationResult => {
  const messages: SchedulerMessage[] = []
  const projectCalendar = model.calendars.find(
    (calendar) => calendar.id === model.project.calendarId
  )
  if (!projectCalendar) {
    return {
      tasks: model.tasks,
      stats: {
        criticalTasks: [],
        durationMs: 0,
        recalculatedAt: new Date().toISOString()
      },
      messages: [
        {
          id: nanoid(),
          type: 'error',
          code: 'E_CALENDAR_NOT_FOUND',
          text: 'Project calendar is missing'
        }
      ]
    }
  }
  const calendarEngine = new CalendarEngine(projectCalendar)
  const graph = buildGraph(model.tasks, model.dependencies)
  const order = topologicalSort(graph, messages)
  const state: Record<string, NodeState> = {}
  const startTime = performance.now()

  // Forward pass
  for (const taskId of order) {
    const task = model.tasks.find((item) => item.id === taskId)
    if (!task) continue
    const dependencyResult = getMaxSuccessorFinish(task.id, model.dependencies, state, calendarEngine, model.tasks)
    const es = dependencyResult ?? calendarEngine.normalize(task.start)
    const duration = getTaskDurationMinutes(task, calendarEngine)
    const ef = calendarEngine.addWorkingMinutes(es, duration)
    state[task.id] = {
      es,
      ef,
      ls: ef,
      lf: ef,
      float: 0
    }
  }

  // Backward pass
  const projectFinish = determineProjectFinish(state)
  for (const taskId of [...order].reverse()) {
    const task = model.tasks.find((item) => item.id === taskId)
    if (!task) continue
    const node = state[task.id]
    const successors = model.dependencies
      .filter((dependency) => dependency.predecessorId === task.id)
      .map((dependency) => dependency.successorId)
    if (successors.length === 0) {
      node.lf = projectFinish
    } else {
      const minLs = Math.min(
        ...successors.map((successorId) => {
          const successorState = state[successorId]
          return successorState?.ls?.getTime() ?? projectFinish.getTime()
        })
      )
      node.lf = new Date(minLs)
    }
    const duration = getTaskDurationMinutes(task, calendarEngine)
    node.ls = calendarEngine.addWorkingMinutes(node.lf, -duration)
    node.float = (node.ls.getTime() - node.es.getTime()) / 60000
  }

  const thresholdMinutes = options.nearCriticalThresholdDays * MINUTES_PER_DAY
  const enrichedTasks: Task[] = model.tasks.map((task) => {
    const node = state[task.id]
    if (!node) return task
    const flags = {
      critical: node.float === 0,
      nearCritical: node.float >= 0 && node.float <= thresholdMinutes,
      late:
        model.project.statusDate !== undefined &&
        node.ef.getTime() > parseISO(model.project.statusDate).getTime()
    }
    return {
      ...task,
      start: node.es.toISOString(),
      finish: node.ef.toISOString(),
      duration: getTaskDurationMinutes(task, calendarEngine),
      flags
    }
  })

  const stats: SchedulerStats = {
    criticalTasks: Object.entries(state)
      .filter(([, value]) => value.float === 0)
      .map(([taskId]) => taskId),
    durationMs: performance.now() - startTime,
    recalculatedAt: new Date().toISOString()
  }

  return {
    tasks: enrichedTasks,
    stats,
    messages
  }
}

interface Graph {
  predecessors: Record<string, string[]>
  successors: Record<string, string[]>
}

const buildGraph = (tasks: Task[], dependencies: Dependency[]): Graph => {
  const predecessors: Graph['predecessors'] = {}
  const successors: Graph['successors'] = {}
  for (const task of tasks) {
    predecessors[task.id] = []
    successors[task.id] = []
  }
  for (const dependency of dependencies) {
    if (!predecessors[dependency.successorId]) {
      predecessors[dependency.successorId] = []
    }
    if (!successors[dependency.predecessorId]) {
      successors[dependency.predecessorId] = []
    }
    predecessors[dependency.successorId].push(dependency.predecessorId)
    successors[dependency.predecessorId].push(dependency.successorId)
  }
  return { predecessors, successors }
}

const topologicalSort = (graph: Graph, messages: SchedulerMessage[]): string[] => {
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const result: string[] = []

  const visit = (node: string) => {
    if (visited.has(node)) return
    if (visiting.has(node)) {
      messages.push({
        id: nanoid(),
        type: 'error',
        code: 'E_CYCLE_DETECTED',
        text: `Cycle detected involving task ${node}`,
        taskId: node
      })
      return
    }
    visiting.add(node)
    for (const predecessor of graph.predecessors[node] ?? []) {
      visit(predecessor)
    }
    visiting.delete(node)
    visited.add(node)
    result.push(node)
  }

  Object.keys(graph.predecessors).forEach((node) => visit(node))
  return result
}

const getTaskDurationMinutes = (task: Task, calendar: CalendarEngine): number => {
  if (task.type === 'milestone') return 0
  if (task.segments?.length) {
    return task.segments.reduce((total, segment) => {
      const start = calendar.normalize(segment.start)
      const finish = calendar.normalize(segment.finish)
      return total + calendar.calculateDurationInMinutes(start, finish)
    }, 0)
  }
  if (task.duration != null) {
    return task.duration
  }
  const start = calendar.normalize(task.start)
  const finish = calendar.normalize(task.finish)
  return calendar.calculateDurationInMinutes(start, finish)
}

const determineProjectFinish = (state: Record<string, NodeState>): Date => {
  let maxDate: Date | null = null
  for (const node of Object.values(state)) {
    if (!maxDate || node.ef > maxDate) {
      maxDate = node.ef
    }
  }
  return maxDate ?? new Date()
}

const getMaxSuccessorFinish = (
  taskId: string,
  dependencies: Dependency[],
  state: Record<string, NodeState>,
  calendar: CalendarEngine,
  tasks: Task[]
): Date | undefined => {
  const predecessorLinks = dependencies.filter(
    (dependency) => dependency.successorId === taskId
  )
  if (predecessorLinks.length === 0) return undefined
  let maxDate: Date | undefined
  for (const link of predecessorLinks) {
    const predecessorState = state[link.predecessorId]
    if (!predecessorState) continue
    const predecessorTask = tasks.find((task) => task.id === link.predecessorId)
    const predecessorDuration = predecessorTask
      ? getTaskDurationMinutes(predecessorTask, calendar)
      : 0
    const lagMinutes = link.lag
      ? convertLagToMinutes(
          link.lag.value,
          link.lag.unit,
          predecessorDuration,
          calendar
        )
      : 0
    const baseDate = getLinkBaseDate(link.type, predecessorState)
    const candidate = calendar.addWorkingMinutes(baseDate, lagMinutes)
    if (!maxDate || candidate > maxDate) {
      maxDate = candidate
    }
  }
  return maxDate
}

const getLinkBaseDate = (type: string, predecessor: NodeState): Date => {
  switch (type) {
    case 'SS':
      return predecessor.es
    case 'FF':
      return predecessor.ef
    case 'SF':
      return predecessor.es
    case 'FS':
    default:
      return predecessor.ef
  }
}
