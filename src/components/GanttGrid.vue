<template>
  <div class="h-full">
    <header class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Work Breakdown Structure</h2>
      <span v-if="loading" class="text-xs text-slate-400">Recalculating...</span>
    </header>
    <div class="h-[calc(100%-40px)]">
      <DataTable
        :value="tasks"
        data-key="id"
        scrollable
        table-style="min-width: 100%"
        class="h-full"
      >
        <Column
          field="name"
          header="Task"
          :style="{ width: '200px' }"
        >
          <template #body="slotProps">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ slotProps.data.name }}</span>
              <span v-if="slotProps.data.flags?.critical" class="text-xs text-critical">Critical</span>
            </div>
          </template>
        </Column>
        <Column field="start" header="Start" :style="{ width: '160px' }" />
        <Column field="finish" header="Finish" :style="{ width: '160px' }" />
        <Column field="duration" header="Duration (m)" :style="{ width: '120px' }" />
        <Column
          v-for="column in columns"
          :key="column.key"
          :field="column.key"
          :header="column.title"
          :style="{ width: column.width ? `${column.width}px` : 'auto' }"
        >
          <template #body="slotProps">
            {{ getColumnValue(slotProps.data, column) }}
          </template>
        </Column>
      </DataTable>
    </div>
    <footer v-if="messages.length" class="border-t border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-700">
      <ul class="space-y-1">
        <li v-for="message in messages" :key="message.id">
          <strong>{{ message.code }}:</strong> {{ message.text }}
        </li>
      </ul>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { type PropType } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type { ColumnDef, SchedulerMessage, Task } from '@/types'

defineProps({
  tasks: {
    type: Array as PropType<Task[]>,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  columns: {
    type: Array as PropType<ColumnDef[]>,
    default: () => []
  },
  messages: {
    type: Array as PropType<SchedulerMessage[]>,
    default: () => []
  }
})

defineEmits(['update:task'])

const getColumnValue = (task: Task, column: ColumnDef) => {
  if (column.formatter) return column.formatter(task)
  return (task as Record<string, unknown>)[column.key] as string
}
</script>
