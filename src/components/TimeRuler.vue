<template>
  <div class="flex flex-col" :style="{ width: `${Math.max(contentWidth, 0)}px` }">
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
import { format } from 'date-fns'

const DAY = 24 * 60 * 60 * 1000
const WEEK = DAY * 7
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

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
  }
})

const { contentWidth } = toRefs(props)

const days = computed(() => {
  const items: Array<{ id: string; label: string; width: number; isWeekend: boolean }> = []
  let cursor = props.startDate.getTime()
  const end = props.endDate.getTime()
  while (cursor < end) {
    const next = Math.min(cursor + DAY, end)
    const date = new Date(cursor)
    const dayIndex = date.getDay()
    items.push({
      id: `day-${cursor}`,
      label: DAY_LABELS[dayIndex],
      width: Math.max((next - cursor) * props.pixelsPerMs, 1),
      isWeekend: dayIndex === 0 || dayIndex === 6
    })
    cursor = next
  }
  if (!items.length) {
    items.push({
      id: `day-${props.startDate.getTime()}`,
      label: DAY_LABELS[props.startDate.getDay()],
      width: Math.max((props.endDate.getTime() - props.startDate.getTime()) * props.pixelsPerMs, 1),
      isWeekend: false
    })
  }
  return items
})

const weeks = computed(() => {
  const items: Array<{ id: string; label: string; width: number }> = []
  let cursor = props.startDate.getTime()
  const end = props.endDate.getTime()
  while (cursor < end) {
    const next = Math.min(cursor + WEEK, end)
    items.push({
      id: `week-${cursor}`,
      label: format(new Date(cursor), 'dd MMM yyyy'),
      width: Math.max((next - cursor) * props.pixelsPerMs, 1)
    })
    cursor = next
  }
  if (!items.length) {
    items.push({
      id: `week-${props.startDate.getTime()}`,
      label: format(props.startDate, 'dd MMM yyyy'),
      width: Math.max((props.endDate.getTime() - props.startDate.getTime()) * props.pixelsPerMs, 1)
    })
  }
  return items
})
</script>
