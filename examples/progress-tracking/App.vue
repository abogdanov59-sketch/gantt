<template>
  <div class="min-h-screen bg-white p-6">
    <header class="mb-4 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Progress Tracking Dashboard</h1>
        <p class="text-sm text-slate-500">
          Multiple baselines with late task highlighting based on the status date.
        </p>
      </div>
      <div class="flex gap-3 text-xs">
        <label class="flex items-center gap-2">
          <span class="font-semibold uppercase tracking-wide text-slate-400">Show Baselines</span>
          <input type="checkbox" v-model="moduleOptions.showBaselines" />
        </label>
        <label class="flex items-center gap-2">
          <span class="font-semibold uppercase tracking-wide text-slate-400">Highlight Critical</span>
          <input type="checkbox" v-model="moduleOptions.showCritical" />
        </label>
      </div>
    </header>

    <GanttModule
      v-model="model"
      :options="moduleOptions"
      :columns="columns"
      @calculationComplete="handleCalculation"
    />

    <section class="mt-6 grid grid-cols-3 gap-4 text-xs">
      <article class="rounded border border-slate-200 bg-slate-50 p-4">
        <h2 class="mb-2 font-semibold uppercase tracking-wide text-slate-500">Variance Summary</h2>
        <dl class="space-y-1">
          <div v-for="variance in baselineVariance" :key="variance.label" class="flex justify-between">
            <dt>{{ variance.label }}</dt>
            <dd :class="variance.value >= 0 ? 'text-emerald-600' : 'text-rose-600'">
              {{ variance.value >= 0 ? '+' : '' }}{{ variance.value.toFixed(1) }} days
            </dd>
          </div>
        </dl>
      </article>
      <article class="col-span-2 rounded border border-slate-200 bg-slate-50 p-4">
        <h2 class="mb-2 font-semibold uppercase tracking-wide text-slate-500">Late Tasks</h2>
        <ul class="space-y-1">
          <li v-for="task in lateTasks" :key="task.id">
            <strong>{{ task.name }}</strong> – finish {{ task.finish }}
          </li>
          <li v-if="lateTasks.length === 0" class="text-slate-400">All tasks on time.</li>
        </ul>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { GanttModule } from '../../src'
import type { ColumnDef, SchedulerStats } from '../../src/types'
import { progressModel } from './data'

const model = ref(progressModel)
const stats = ref<SchedulerStats | null>(null)
const moduleOptions = reactive({
  zoom: 'month' as const,
  showBaselines: true,
  showCritical: true,
  showNonWorking: true
})

const columns: ColumnDef[] = [
  { key: 'percentComplete.value', title: '% Complete' },
  { key: 'flags.late', title: 'Late?' }
]

const handleCalculation = ({ stats: calcStats }: { stats: SchedulerStats }) => {
  stats.value = calcStats
}

const lateTasks = computed(() =>
  (model.value.tasks ?? []).filter((task) => task.flags?.late)
)

const baselineVariance = computed(() => {
  return (model.value.tasks ?? [])
    .filter((task) => task.baseline?.length)
    .map((task) => {
      const baseline = task.baseline?.find((item) => item.index === 0)
      if (!baseline) {
        return { label: task.name, value: 0 }
      }
      const plannedFinish = new Date(baseline.finish).getTime()
      const currentFinish = new Date(task.finish).getTime()
      const diffDays = (currentFinish - plannedFinish) / (1000 * 60 * 60 * 24)
      return { label: task.name, value: diffDays }
    })
})
</script>
