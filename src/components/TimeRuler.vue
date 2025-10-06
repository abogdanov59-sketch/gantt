<template>
  <div class="overflow-hidden border-b border-slate-200 bg-white text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800">
    <div
      class="flex h-9 items-center"
      :style="{
        width: `${Math.max(contentWidth, 0)}px`,
        transform: `translateX(-${scrollLeft}px)`
      }"
    >
      <div
        v-for="tick in ticks"
        :key="tick.id"
        class="flex h-full flex-none items-center border-r border-slate-200 px-2 dark:border-slate-700"
        :style="{ width: `${tick.width}px` }"
      >
        <span class="whitespace-nowrap">{{ tick.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { format } from 'date-fns'

const HOUR = 60 * 60 * 1000

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
  scrollLeft: {
    type: Number,
    required: true
  }
})

const { contentWidth, scrollLeft } = toRefs(props)

type TickStep = {
  ms: number
  format: string
}

const TICK_STEPS: TickStep[] = [
  { ms: HOUR, format: 'dd.MM HH:mm' },
  { ms: 2 * HOUR, format: 'dd.MM HH:mm' },
  { ms: 3 * HOUR, format: 'dd.MM HH:mm' },
  { ms: 6 * HOUR, format: 'dd.MM HH:mm' },
  { ms: 12 * HOUR, format: 'dd.MM HH:mm' },
  { ms: 24 * HOUR, format: 'dd.MM.yyyy' },
  { ms: 3 * 24 * HOUR, format: 'dd.MM.yyyy' },
  { ms: 7 * 24 * HOUR, format: 'dd.MM.yyyy' },
  { ms: 14 * 24 * HOUR, format: 'dd.MM.yyyy' },
  { ms: 30 * 24 * HOUR, format: 'MMM yyyy' },
  { ms: 90 * 24 * HOUR, format: 'MMM yyyy' }
]

const ticks = computed(() => {
  const range = Math.max(1, props.endDate.getTime() - props.startDate.getTime())
  const targetTickCount = Math.max(1, Math.round(props.contentWidth / 160))
  const rawStep = range / targetTickCount
  const step = TICK_STEPS.find((candidate) => candidate.ms >= rawStep) ?? TICK_STEPS[TICK_STEPS.length - 1]

  const items: Array<{ id: string; label: string; width: number }> = []
  let cursor = props.startDate.getTime()
  const end = props.endDate.getTime()

  while (cursor < end) {
    const next = Math.min(cursor + step.ms, end)
    const width = Math.max((next - cursor) * props.pixelsPerMs, 1)
    items.push({
      id: `${cursor}-${next}`,
      label: format(new Date(cursor), step.format),
      width
    })
    cursor = next
  }

  if (!items.length) {
    items.push({
      id: `${props.startDate.getTime()}-${props.endDate.getTime()}`,
      label: format(props.startDate, step.format),
      width: Math.max(range * props.pixelsPerMs, 1)
    })
  }

  return items
})
</script>
