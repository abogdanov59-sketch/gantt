import { addMinutes, isAfter, isBefore, isSameDay, parseISO } from 'date-fns'
import type {
  Calendar,
  CalendarDayDefinition,
  CalendarException,
  CalendarWorkingPeriod
} from '@/types'

export interface WorkingWindow {
  start: Date
  end: Date
}

const MINUTES_PER_DAY = 1440

export class CalendarEngine {
  private calendar: Calendar

  constructor(calendar: Calendar) {
    this.calendar = calendar
  }

  public normalize(date: string | Date): Date {
    return typeof date === 'string' ? parseISO(date) : date
  }

  private getDayDefinition(date: Date): CalendarDayDefinition {
    const weekday = date.getUTCDay()
    const override = this.calendar.exceptions?.find((exception) =>
      this.dateMatchesException(date, exception)
    )
    if (override) {
      return {
        working: override.working ?? override.periods != null,
        periods: override.periods ?? []
      }
    }
    const definition = this.calendar.workWeek[weekday]
    if (!definition) {
      return { working: false, periods: [] }
    }
    return definition
  }

  private dateMatchesException(date: Date, exception: CalendarException): boolean {
    if (!exception.date.includes('/')) {
      const exceptionDate = parseISO(exception.date)
      return isSameDay(exceptionDate, date)
    }
    const [start, end] = exception.date.split('/')
    const startDate = parseISO(start)
    const endDate = parseISO(end)
    return (isAfter(date, startDate) || isSameDay(date, startDate)) &&
      (isBefore(date, endDate) || isSameDay(date, endDate))
  }

  private buildWindows(date: Date): WorkingWindow[] {
    const definition = this.getDayDefinition(date)
    if (!definition.working) return []
    return definition.periods.map((period) => this.createWindow(date, period))
  }

  private createWindow(date: Date, period: CalendarWorkingPeriod): WorkingWindow {
    const [startHour, startMinute] = period.start.split(':').map(Number)
    const [endHour, endMinute] = period.end.split(':').map(Number)
    const windowStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), startHour, startMinute))
    const windowEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), endHour, endMinute))
    return { start: windowStart, end: windowEnd }
  }

  public addWorkingMinutes(date: Date, minutes: number): Date {
    if (minutes === 0) return new Date(date)
    if (minutes < 0) {
      return this.subtractWorkingMinutes(date, Math.abs(minutes))
    }
    let remaining = minutes
    let cursor = new Date(date)
    while (remaining > 0) {
      const windows = this.buildWindows(cursor)
      const activeWindow = windows.find((window) => cursor < window.end)
      if (!activeWindow) {
        cursor = this.nextWorkingDay(cursor)
        continue
      }
      const windowStart = cursor < activeWindow.start ? activeWindow.start : cursor
      const available = (activeWindow.end.getTime() - windowStart.getTime()) / 60000
      const consumed = Math.min(available, remaining)
      cursor = addMinutes(windowStart, consumed)
      remaining -= consumed
      if (remaining <= 0) {
        return cursor
      }
      if (cursor >= activeWindow.end) {
        cursor = addMinutes(activeWindow.end, 1)
      }
    }
    return cursor
  }

  private subtractWorkingMinutes(date: Date, minutes: number): Date {
    let remaining = minutes
    let cursor = new Date(date)
    while (remaining > 0) {
      const windows = this.buildWindows(cursor)
      const activeWindow = [...windows].reverse().find((window) => cursor > window.start)
      if (!activeWindow) {
        cursor = this.previousWorkingDay(cursor)
        continue
      }
      const windowEnd = cursor > activeWindow.end ? activeWindow.end : cursor
      const available = (windowEnd.getTime() - activeWindow.start.getTime()) / 60000
      const consumed = Math.min(available, remaining)
      cursor = addMinutes(windowEnd, -consumed)
      remaining -= consumed
      if (remaining <= 0) {
        return cursor
      }
      if (cursor <= activeWindow.start) {
        cursor = addMinutes(activeWindow.start, -1)
      }
    }
    return cursor
  }

  private previousWorkingDay(date: Date): Date {
    let cursor = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - 1, 23, 59))
    while (true) {
      const windows = this.buildWindows(cursor)
      if (windows.length > 0) {
        return windows[windows.length - 1].end
      }
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() - 1, 23, 59))
    }
  }

  public nextWorkingDay(date: Date): Date {
    let cursor = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1))
    while (true) {
      const windows = this.buildWindows(cursor)
      if (windows.length > 0) {
        return windows[0].start
      }
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + 1))
    }
  }

  public calculateDurationInMinutes(start: Date, finish: Date): number {
    if (finish <= start) return 0
    let cursor = new Date(start)
    let total = 0
    while (cursor < finish) {
      const windows = this.buildWindows(cursor)
      const window = windows.find((w) => cursor < w.end)
      if (!window) {
        cursor = this.nextWorkingDay(cursor)
        continue
      }
      const segmentStart = cursor < window.start ? window.start : cursor
      const segmentEnd = finish < window.end ? finish : window.end
      if (segmentEnd > segmentStart) {
        total += (segmentEnd.getTime() - segmentStart.getTime()) / 60000
      }
      if (finish <= window.end) {
        break
      }
      cursor = new Date(window.end.getTime() + 60000)
    }
    return total
  }

  public getWorkingDayMinutes(date: Date): number {
    return this.buildWindows(date).reduce((sum, window) => sum + (window.end.getTime() - window.start.getTime()) / 60000, 0)
  }

  public getAverageWorkingDayMinutes(): number {
    const values = Object.values(this.calendar.workWeek)
      .filter((day) => day?.working)
      .map((day) =>
        day.periods.reduce(
          (total, period) =>
            total +
            (this.createWindow(new Date(), period).end.getTime() -
              this.createWindow(new Date(), period).start.getTime()) /
              60000,
          0
        )
      )
    if (values.length === 0) return 0
    return values.reduce((a, b) => a + b, 0) / values.length
  }
}

export const convertLagToMinutes = (lag: number, unit: string, duration: number, calendar: CalendarEngine): number => {
  const averageWorkingDay = calendar.getAverageWorkingDayMinutes() || 480
  switch (unit) {
    case 'min':
      return lag
    case 'h':
      return lag * 60
    case 'd':
      return lag * averageWorkingDay
    case 'w':
      return lag * 5 * averageWorkingDay
    case 'percent':
      return (duration * lag) / 100
    default:
      return 0
  }
}
