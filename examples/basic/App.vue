<template>
  <div class="min-h-screen bg-slate-100 p-6 text-slate-800">
    <header class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Basic Construction Schedule</h1>
        <p class="text-sm text-slate-500">
          Demonstrates the minimal setup for the construction scheduling Gantt module.
        </p>
      </div>
      <div class="rounded bg-white px-4 py-2 shadow">
        <dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <dt class="text-slate-400">Critical Tasks</dt>
          <dd class="text-right font-semibold">{{ stats?.criticalTasks.length ?? 0 }}</dd>
          <dt class="text-slate-400">Last Recalc</dt>
          <dd class="text-right font-semibold">{{ stats?.recalculatedAt ?? 'pending' }}</dd>
        </dl>
      </div>
    </header>

    <section class="rounded border border-slate-200 bg-white shadow">
      <GanttModule
        v-model="model"
        :options="moduleOptions"
        :columns="columns"
        @calculationComplete="handleCalculation"
        @ready="handleReady"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { GanttModule } from '../../src'
import type { ColumnDef, SchedulerStats } from '../../src/types'
import { basicModel } from './data'

const model = ref(basicModel)
const stats = ref<SchedulerStats | null>(null)
const moduleOptions = {
  zoom: 'fit',
  showBaselines: true,
  showCritical: true
}

const columns: ColumnDef[] = [
  { key: 'wbsCode', title: 'WBS' },
  { key: 'flags.critical', title: 'Critical?' }
]

const handleCalculation = ({ stats: calculationStats }: { stats: SchedulerStats }) => {
  stats.value = calculationStats
}

const handleReady = ({ stats: readyStats }: { stats: SchedulerStats | null }) => {
  stats.value = readyStats
}
</script>
