import { describe, expect, it } from 'vitest'
import { CalendarEngine, convertLagToMinutes } from '@/utils/calendar'
import type { Calendar } from '@/types'

const calendar: Calendar = {
  id: 'standard',
  name: '5x8',
  workWeek: {
    1: { working: true, periods: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
    2: { working: true, periods: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
    3: { working: true, periods: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
    4: { working: true, periods: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
    5: { working: true, periods: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }] }
  },
  exceptions: [
    { id: 'storm', date: '2025-01-15', working: false }
  ]
}

describe('CalendarEngine', () => {
  const engine = new CalendarEngine(calendar)

  it('adds working minutes within a single day window', () => {
    const start = engine.normalize('2025-01-13T08:00:00Z')
    const finish = engine.addWorkingMinutes(start, 480)
    expect(finish.toISOString()).toBe('2025-01-13T17:00:00.000Z')
  })

  it('skips non-working periods including exceptions', () => {
    const start = engine.normalize('2025-01-14T16:00:00Z')
    const finish = engine.addWorkingMinutes(start, 480)
    // Adds 1 hour on the 14th, skips the 15th (storm), resumes on the 16th
    expect(finish.toISOString()).toBe('2025-01-16T11:00:00.000Z')
  })

  it('calculates working duration between two dates', () => {
    const start = engine.normalize('2025-01-13T08:00:00Z')
    const end = engine.normalize('2025-01-17T17:00:00Z')
    const minutes = engine.calculateDurationInMinutes(start, end)
    // Four working days (15th skipped) at 8 hours each
    expect(minutes).toBe(4 * 8 * 60)
  })

  it('converts lag values to working minutes', () => {
    expect(convertLagToMinutes(90, 'min', 0, engine)).toBe(90)
    expect(convertLagToMinutes(2, 'h', 0, engine)).toBe(120)
    expect(convertLagToMinutes(1, 'd', 0, engine)).toBe(8 * 60)
    expect(convertLagToMinutes(1, 'w', 0, engine)).toBe(5 * 8 * 60)
    expect(convertLagToMinutes(50, 'percent', 960, engine)).toBe(480)
  })
})
