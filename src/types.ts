export type TaskType = 'task' | 'milestone' | 'loe' | 'hammock' | 'recurring'
export type ConstraintType =
  | 'ASAP'
  | 'ALAP'
  | 'SNET'
  | 'FNET'
  | 'SNLT'
  | 'FNLT'
  | 'MSO'
  | 'MFO'

export interface BaselineSnapshot {
  index: number
  start: string
  finish: string
  duration?: number
  cost?: number
  work?: number
}

export interface TaskSegment {
  start: string
  finish: string
}

export interface Task {
  id: string
  uid?: string
  wbsCode?: string
  parentId?: string
  name: string
  description?: string
  type: TaskType
  start: string
  finish: string
  duration?: number
  calendarId?: string
  constraint?: {
    type: ConstraintType
    date?: string
  }
  deadline?: string
  percentComplete?: {
    mode: 'duration' | 'physical' | 'work'
    value: number
  }
  actual?: {
    start?: string
    finish?: string
    work?: number
    cost?: number
  }
  baseline?: BaselineSnapshot[]
  codes?: Record<string, string | number | string[]>
  customFields?: Record<string, string | number | boolean | null>
  priority?: number
  segments?: TaskSegment[]
  flags?: {
    critical?: boolean
    nearCritical?: boolean
    late?: boolean
  }
}

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF'
export type LagUnit = 'min' | 'h' | 'd' | 'w' | 'percent'
export type LagCalendarMode = 'predecessor' | 'successor' | 'project'

export interface DependencyLag {
  value: number
  unit: LagUnit
  calendarMode?: LagCalendarMode
}

export interface Dependency {
  id: string
  predecessorId: string
  successorId: string
  type: DependencyType
  lag?: DependencyLag
}

export interface CalendarWorkingPeriod {
  start: string
  end: string
}

export interface CalendarException {
  id: string
  name?: string
  date: string
  working?: boolean
  periods?: CalendarWorkingPeriod[]
}

export interface CalendarDayDefinition {
  working: boolean
  periods: CalendarWorkingPeriod[]
}

export interface Calendar {
  id: string
  name: string
  timezone?: string
  workWeek: { [weekday: number]: CalendarDayDefinition }
  exceptions?: CalendarException[]
}

export type ResourceType = 'labor' | 'equipment' | 'material'

export interface Resource {
  id: string
  name: string
  type: ResourceType
  maxUnits?: number
  calendarId?: string
  costRate?: {
    standard?: number
    overtime?: number
    accrual?: 'start' | 'prorated' | 'end'
  }
  codes?: Record<string, string | number>
}

export interface Assignment {
  id: string
  taskId: string
  resourceId: string
  units?: number
  work?: number
  cost?: number
  calendarId?: string
  role?: string
}

export interface ProjectSettings {
  timeScale?: string
  progressMode?: 'duration' | 'physical' | 'work'
  nearCriticalThresholdDays?: number
}

export interface Project {
  id: string
  name: string
  calendarId: string
  statusDate?: string
  settings: ProjectSettings
}

export interface GanttModelValue {
  project: Project
  tasks: Task[]
  dependencies: Dependency[]
  calendars: Calendar[]
  resources?: Resource[]
  assignments?: Assignment[]
}

export interface SchedulerStats {
  criticalTasks: string[]
  durationMs: number
  recalculatedAt: string
}

export interface CalculationResult {
  tasks: Task[]
  stats: SchedulerStats
  messages: SchedulerMessage[]
}

export type SchedulerMessageType = 'info' | 'warning' | 'error'

export interface SchedulerMessage {
  id: string
  type: SchedulerMessageType
  code: string
  text: string
  taskId?: string
}

export interface SchedulerWorkerMessage {
  type: 'calculate'
  payload: {
    model: GanttModelValue
    options: SchedulerOptions
  }
}

export interface SchedulerOptions {
  nearCriticalThresholdDays: number
  progressMode: 'duration' | 'physical' | 'work'
  enableLeveling: boolean
}

export interface SchedulerWorkerResponse {
  result: CalculationResult
}

export interface ColumnDef {
  key: string
  title: string
  width?: number
  formatter?: (task: Task) => string
}

export type ZoomLevel =
  | 'fit'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year'
  | number

export interface ResolvedGanttOptions extends SchedulerOptions {
  readOnly?: boolean
  showBaselines?: boolean
  showCritical?: boolean
  showNonWorking?: boolean
  zoom?: ZoomLevel
  rtl?: boolean
  timeZone?: string
  locale?: string
  theme?: 'light' | 'dark' | { cssVars: Record<string, string> }
}
