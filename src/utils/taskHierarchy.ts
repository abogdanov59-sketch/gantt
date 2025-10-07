import type { BaselineSnapshot, DisplayTask, Task } from '@/types'

const cloneBaseline = (baseline?: BaselineSnapshot[]): BaselineSnapshot[] | undefined =>
  baseline?.map((snapshot) => ({ ...snapshot }))

const cloneTaskForDisplay = (task: Task): DisplayTask => {
  const { children, baseline, segments, flags, percentComplete, actual, ...rest } = task as Task & {
    children?: Task[]
    baseline?: BaselineSnapshot[]
    segments?: Task['segments']
    flags?: Task['flags']
    percentComplete?: Task['percentComplete']
    actual?: Task['actual']
  }

  return {
    ...rest,
    baseline: cloneBaseline(baseline),
    segments: segments?.map((segment) => ({ ...segment })),
    flags: flags ? { ...flags } : undefined,
    percentComplete: percentComplete ? { ...percentComplete } : undefined,
    actual: actual ? { ...actual } : undefined,
    children: undefined,
    level: 0,
    isSummary: false,
    isExpanded: false,
    visible: true
  }
}

const getPrimaryBaseline = (task: DisplayTask): BaselineSnapshot | null =>
  task.baseline?.find((snapshot) => snapshot.index === 0) ?? task.baseline?.[0] ?? null

const minutesBetween = (start: number, finish: number): number =>
  Math.max(0, Math.round((finish - start) / 60000))

export interface HierarchyResult {
  rows: DisplayTask[]
  visibleRows: DisplayTask[]
  byId: Map<string, DisplayTask>
}

export const createTaskHierarchy = (
  tasks: Task[],
  expansionState: Map<string, boolean>
): HierarchyResult => {
  const nodes = new Map<string, DisplayTask>()
  const order: string[] = []

  tasks.forEach((task) => {
    const node = cloneTaskForDisplay(task)
    nodes.set(node.id, node)
    order.push(node.id)
  })

  const childrenMap = new Map<string, string[]>()
  tasks.forEach((task) => {
    if (task.parentId) {
      const siblings = childrenMap.get(task.parentId) ?? []
      siblings.push(task.id)
      childrenMap.set(task.parentId, siblings)
    }
  })

  const roots: string[] = []
  order.forEach((taskId) => {
    const node = nodes.get(taskId)
    if (!node) return
    if (!node.parentId || !nodes.has(node.parentId)) {
      roots.push(taskId)
    }
  })

  const rows: DisplayTask[] = []
  const visibleRows: DisplayTask[] = []
  const byId = new Map<string, DisplayTask>()
  const validIds = new Set(order)

  const traverse = (
    taskId: string,
    level: number,
    ancestorsVisible: boolean
  ): { start: number; finish: number; baselineStart: number | null; baselineFinish: number | null } => {
    const node = nodes.get(taskId)
    if (!node) {
      return { start: Number.NaN, finish: Number.NaN, baselineStart: null, baselineFinish: null }
    }

    const childIds = childrenMap.get(taskId) ?? []
    const isSummary = childIds.length > 0
    node.isSummary = isSummary

    if (isSummary && !expansionState.has(taskId)) {
      expansionState.set(taskId, true)
    }

    const expanded = isSummary ? expansionState.get(taskId) !== false : false
    node.isExpanded = isSummary ? expansionState.get(taskId) !== false : false
    node.level = level
    node.visible = ancestorsVisible

    rows.push(node)
    byId.set(taskId, node)
    if (node.visible) {
      visibleRows.push(node)
    }

    let startMs = Date.parse(node.start)
    if (!Number.isFinite(startMs)) {
      startMs = Date.now()
    }
    let finishMs = Date.parse(node.finish)
    if (!Number.isFinite(finishMs)) {
      finishMs = startMs
    }

    const primaryBaseline = getPrimaryBaseline(node)
    let baselineStartMs = primaryBaseline ? Date.parse(primaryBaseline.start) : null
    let baselineFinishMs = primaryBaseline ? Date.parse(primaryBaseline.finish) : null

    if (!isSummary) {
      return {
        start: startMs,
        finish: finishMs,
        baselineStart: baselineStartMs,
        baselineFinish: baselineFinishMs
      }
    }

    let summaryStart = Number.POSITIVE_INFINITY
    let summaryFinish = Number.NEGATIVE_INFINITY
    let summaryBaselineStart = Number.POSITIVE_INFINITY
    let summaryBaselineFinish = Number.NEGATIVE_INFINITY

    childIds.forEach((childId) => {
      const aggregate = traverse(childId, level + 1, ancestorsVisible && expanded)
      if (Number.isFinite(aggregate.start)) {
        summaryStart = Math.min(summaryStart, aggregate.start)
      }
      if (Number.isFinite(aggregate.finish)) {
        summaryFinish = Math.max(summaryFinish, aggregate.finish)
      }
      if (aggregate.baselineStart != null) {
        summaryBaselineStart = Math.min(summaryBaselineStart, aggregate.baselineStart)
      }
      if (aggregate.baselineFinish != null) {
        summaryBaselineFinish = Math.max(summaryBaselineFinish, aggregate.baselineFinish)
      }
    })

    if (summaryStart !== Number.POSITIVE_INFINITY && summaryFinish !== Number.NEGATIVE_INFINITY) {
      startMs = summaryStart
      finishMs = summaryFinish
      node.start = new Date(summaryStart).toISOString()
      node.finish = new Date(summaryFinish).toISOString()
      node.duration = minutesBetween(summaryStart, summaryFinish)
    }

    if (summaryBaselineStart !== Number.POSITIVE_INFINITY && summaryBaselineFinish !== Number.NEGATIVE_INFINITY) {
      baselineStartMs = summaryBaselineStart
      baselineFinishMs = summaryBaselineFinish
      const snapshot: BaselineSnapshot = {
        index: 0,
        start: new Date(summaryBaselineStart).toISOString(),
        finish: new Date(summaryBaselineFinish).toISOString(),
        duration: minutesBetween(summaryBaselineStart, summaryBaselineFinish)
      }
      const otherSnapshots = (node.baseline ?? []).filter((baseline) => baseline.index !== 0)
      node.baseline = [snapshot, ...otherSnapshots]
    } else if (node.baseline?.length) {
      node.baseline = node.baseline.filter((baseline) => baseline.index !== 0)
      if (node.baseline.length === 0) {
        node.baseline = undefined
      }
      baselineStartMs = null
      baselineFinishMs = null
    }

    if (node.flags?.critical) {
      node.flags = { ...node.flags, critical: false }
    }

    return {
      start: startMs,
      finish: finishMs,
      baselineStart: baselineStartMs,
      baselineFinish: baselineFinishMs
    }
  }

  roots.forEach((rootId) => {
    traverse(rootId, 0, true)
  })

  Array.from(expansionState.keys()).forEach((taskId) => {
    if (!validIds.has(taskId)) {
      expansionState.delete(taskId)
    }
  })

  return { rows, visibleRows, byId }
}

export const flattenTasks = (tasks: Task[], parentId?: string): Task[] => {
  const result: Task[] = []

  const walk = (items: Task[], currentParentId?: string) => {
    items.forEach((item) => {
      const { children, baseline, segments, flags, percentComplete, actual, ...rest } = item as Task & {
        children?: Task[]
        baseline?: BaselineSnapshot[]
        segments?: Task['segments']
        flags?: Task['flags']
        percentComplete?: Task['percentComplete']
        actual?: Task['actual']
      }
      const cloned: Task = {
        ...rest,
        parentId: rest.parentId ?? currentParentId,
        baseline: cloneBaseline(baseline),
        segments: segments?.map((segment) => ({ ...segment })),
        flags: flags ? { ...flags } : undefined,
        percentComplete: percentComplete ? { ...percentComplete } : undefined,
        actual: actual ? { ...actual } : undefined
      }
      result.push(cloned)
      if (children?.length) {
        walk(children, cloned.id)
      }
    })
  }

  walk(tasks, parentId)
  return result
}
