<template>
  <div class="min-h-screen bg-slate-900 p-6 text-slate-100">
    <header class="mb-6 space-y-1">
      <h1 class="text-2xl font-semibold">Resource Allocation Scenario</h1>
      <p class="text-sm text-slate-400">
        Uses the exposed component API to add follow-up work packages and assignments on the fly.
      </p>
      <div class="flex gap-2">
        <button
          class="rounded bg-emerald-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-950"
          @click="addFollowUpTask"
        >
          Add Follow-up Task
        </button>
        <button
          class="rounded border border-emerald-400 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200"
          @click="assignStandbyCrew"
        >
          Assign Standby Crew
        </button>
      </div>
    </header>

    <GanttModule
      ref="module"
      v-model="model"
      :options="moduleOptions"
      @calculationComplete="handleCalculation"
    />

    <footer class="mt-6 grid grid-cols-2 gap-4 text-xs">
      <div class="rounded border border-slate-700 bg-slate-800 p-4">
        <h2 class="mb-2 font-semibold uppercase tracking-wide text-slate-400">Critical Path</h2>
        <p class="text-slate-300">{{ criticalPath.join(' → ') || 'pending calculation' }}</p>
      </div>
      <div class="rounded border border-slate-700 bg-slate-800 p-4">
        <h2 class="mb-2 font-semibold uppercase tracking-wide text-slate-400">Assignments</h2>
        <ul class="space-y-1">
          <li v-for="assignment in model.assignments ?? []" :key="assignment.id">
            <strong>{{ assignment.resourceId }}</strong> → {{ assignment.taskId }} (units {{ assignment.units ?? 1 }})
          </li>
        </ul>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { GanttModule } from '../../src'
import type { SchedulerStats } from '../../src/types'
import { resourceModel } from './data'

type GanttInstance = InstanceType<typeof GanttModule>

const model = ref(resourceModel)
const module = ref<GanttInstance | null>(null)
const moduleOptions = {
  showBaselines: true,
  showCritical: true,
  theme: 'dark'
}

const criticalPath = ref<string[]>([])

const handleCalculation = ({ stats }: { stats: SchedulerStats }) => {
  void stats
  if (!module.value) return
  criticalPath.value = module.value.getCriticalPath()
}

const addFollowUpTask = () => {
  if (!module.value) return
  const newTaskId = `t-follow-${Date.now()}`
  module.value.addTask({
    id: newTaskId,
    name: 'Demobilize crane',
    type: 'task',
    start: '2025-02-20T07:00:00Z',
    finish: '2025-02-21T18:00:00Z'
  })
}

const assignStandbyCrew = () => {
  if (!module.value) return
  module.value.assignResource({
    id: `a-standby-${Date.now()}`,
    taskId: 't-test',
    resourceId: 'r-crew',
    units: 0.5,
    work: 16
  })
}
</script>
