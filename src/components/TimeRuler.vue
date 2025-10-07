<template>
  <div class="flex flex-col" :style="{ width: `${rulerWidth}px` }">
    <div class="flex h-8 border-b border-slate-200 dark:border-slate-700">
      <div
        v-for="week in weeks"
        :key="week.id"
        class="flex h-full flex-none items-center justify-center border-r border-slate-200 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:text-slate-200"
        :style="{ width: `${week.width}px` }"
      >
        <span class="whitespace-nowrap">{{ week.label }}</span>
      </div>
    </div>
    <div class="flex h-8">
      <div
        v-for="day in days"
        :key="day.id"
        class="flex h-full flex-none items-center justify-center border-r border-slate-200 px-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-200"
        :class="day.isWeekend ? 'bg-slate-100 dark:bg-slate-800/70' : 'bg-white dark:bg-slate-800'"
        :style="{ width: `${day.width}px` }"
      >
        <span>{{ day.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { format, startOfWeek } from 'date-fns'

const DAY = 24 * 60 * 60 * 1000
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const
const WEEK_OPTIONS = { weekStartsOn: 1 as const }

const props = defineProps({
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  pixelsPerMs: {
    type: Number,
    required: true
  },
  contentWidth: {
    type: Number,
    required: true
  },
  minDayWidth: {
    type: Number,
    default: 36
  }
})

const { contentWidth } = toRefs(props)

interface DayCell {
  id: string
  label: string
  width: number
  isWeekend: boolean
  start: number
}

interface WeekCell {
  id: string
  label: string
  width: number
}

const days = computed<DayCell[]>(() => {
  const items: DayCell[] = []
  let cursor = props.startDate.getTime()
  const end = props.endDate.getTime()
  while (cursor < end) {
    const next = Math.min(cursor + DAY, end)
    const date = new Date(cursor)
    const dayIndex = date.getDay()
    const labelIndex = (dayIndex + 6) % 7
    items.push({
      id: `day-${cursor}`,
      label: DAY_LABELS[labelIndex],
      width: (next - cursor) * props.pixelsPerMs,
      isWeekend: dayIndex === 0 || dayIndex === 6,
      start: cursor
    })
    cursor = next
  }
  if (!items.length) {
    items.push({
      id: `day-${props.startDate.getTime()}`,
      label: DAY_LABELS[(props.startDate.getDay() + 6) % 7],
      width: Math.max((props.endDate.getTime() - props.startDate.getTime()) * props.pixelsPerMs, props.minDayWidth),
      isWeekend: false,
      start: props.startDate.getTime()
    })
  }
  return items
})

const weeks = computed<WeekCell[]>(() => {
  const items: WeekCell[] = []
  let currentWeekStart: number | null = null
  let width = 0

  days.value.forEach((day) => {
    const weekStart = startOfWeek(new Date(day.start), WEEK_OPTIONS).getTime()
    if (currentWeekStart == null || weekStart !== currentWeekStart) {
      if (currentWeekStart != null) {
        items.push({
          id: `week-${currentWeekStart}`,
          label: format(new Date(currentWeekStart), 'dd MMM yyyy'),
          width
        })
      }
      currentWeekStart = weekStart
      width = 0
    }
    width += day.width
  })

  if (currentWeekStart != null) {
    items.push({
      id: `week-${currentWeekStart}`,
      label: format(new Date(currentWeekStart), 'dd MMM yyyy'),
      width
    })
  }

  if (!items.length) {
    const start = startOfWeek(props.startDate, WEEK_OPTIONS)
    items.push({
      id: `week-${start.getTime()}`,
      label: format(start, 'dd MMM yyyy'),
      width: Math.max(props.minDayWidth, contentWidth.value)
    })
  }

  return items
})

const rulerWidth = computed(() => {
  const dayWidth = days.value.reduce((sum, day) => sum + day.width, 0)
  return Math.max(contentWidth.value, dayWidth)
})
</script>
