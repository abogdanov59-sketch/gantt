<template>
  <div class="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800">
    <div v-for="tick in ticks" :key="tick.label" class="flex-1">
      <span>{{ tick.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { format } from 'date-fns'

const props = defineProps({
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  zoom: {
    type: [Number, String, Object] as PropType<number | string | { value: number }>,
    required: true
  }
})

const ticks = computed(() => {
  const labels: { label: string }[] = []
  const step = Math.max(1, Math.floor((props.endDate.getTime() - props.startDate.getTime()) / 5))
  for (let time = props.startDate.getTime(); time <= props.endDate.getTime(); time += step) {
    labels.push({ label: format(new Date(time), 'MMM d, yyyy') })
  }
  return labels
})
</script>
