<template>
  <div class="flex h-full flex-col">
    <header class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Work Breakdown Structure</h2>
      <span v-if="loading" class="text-xs text-slate-400">Recalculating...</span>
    </header>
    <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <DataTable
        :value="tasks"
        data-key="id"
        scrollable
        scroll-direction="both"
        scroll-height="flex"
        table-style="width: 100%; table-layout: fixed;"
        class="flex-1 min-h-0"
        :pt="dataTablePt"
        :row-class="rowClass"
        @row-click="handleRowClick"
      >
        <Column
          field="name"
          header="Task"
          :style="{ width: '260px', maxWidth: '260px' }"
          :pt="nameColumnPt"
        >
          <template #body="slotProps">
            <div
              class="flex min-w-0 items-center gap-2"
              :style="{ paddingLeft: `${slotProps.data.level * 1.25}rem` }"
            >
              <button
                v-if="slotProps.data.isSummary"
                type="button"
                class="flex h-6 w-6 flex-none items-center justify-center rounded text-slate-500 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-700"
                :aria-expanded="slotProps.data.isExpanded"
                :aria-label="slotProps.data.isExpanded ? 'Collapse task' : 'Expand task'"
                @click.stop="toggleTask(slotProps.data)"
              >
                <i
                  :class="slotProps.data.isExpanded ? 'pi pi-chevron-down text-xs' : 'pi pi-chevron-right text-xs'"
                ></i>
              </button>
              <span v-else class="inline-block h-6 w-6 flex-none"></span>
              <span
                :class="[
                  'truncate text-slate-700 dark:text-slate-100',
                  slotProps.data.isSummary ? 'font-semibold text-slate-700 dark:text-slate-100' : 'font-medium'
                ]"
                class="block min-w-0 flex-1 truncate"
                :title="slotProps.data.name"
              >
                {{ slotProps.data.name }}
              </span>
              <span
                v-if="highlightCritical && slotProps.data.flags?.critical"
                class="text-[10px] font-semibold uppercase tracking-wide text-rose-500"
              >
                Critical
              </span>
            </div>
          </template>
        </Column>
        <Column field="start" header="Start" :style="{ width: '200px' }" :pt="dateColumnPt">
          <template #body="slotProps">
            <span class="block truncate" :title="formatDateTime(slotProps.data.start)">
              {{ formatDateTime(slotProps.data.start) }}
            </span>
          </template>
        </Column>
        <Column field="finish" header="Finish" :style="{ width: '200px' }" :pt="dateColumnPt">
          <template #body="slotProps">
            <span class="block truncate" :title="formatDateTime(slotProps.data.finish)">
              {{ formatDateTime(slotProps.data.finish) }}
            </span>
          </template>
        </Column>
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
import { format } from 'date-fns'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type { ColumnDef, DisplayTask, SchedulerMessage } from '@/types'

const props = defineProps({
  tasks: {
    type: Array as PropType<DisplayTask[]>,
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
  },
  highlightCritical: {
    type: Boolean,
    default: false
  },
  selectedTaskId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:task', 'edit-task', 'toggle-task'])

const DATE_FORMAT = 'dd.MM.yyyy HH:mm:ss'

const dataTablePt = {
  root: { class: 'h-full flex flex-col' },
  wrapper: { class: 'flex-1 overflow-auto' },
  table: { class: 'min-w-full table-fixed' },
  header: { class: 'bg-slate-100 dark:bg-slate-800 sticky top-0 z-10' },
  bodyRow: { class: 'h-11' }
} as const

const nameColumnPt = {
  headerCell: { class: 'min-w-[260px] max-w-[260px]' },
  bodyCell: { class: 'min-w-[260px] max-w-[260px]' }
} as const

const dateColumnPt = {
  headerCell: { class: 'min-w-[200px] max-w-[200px]' },
  bodyCell: { class: 'min-w-[200px] max-w-[200px]' }
} as const

const formatDateTime = (value?: string | Date) => {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  return format(date, DATE_FORMAT)
}

const getColumnValue = (task: DisplayTask, column: ColumnDef) => {
  if (column.formatter) return column.formatter(task)
  return (task as Record<string, unknown>)[column.key] as string
}

const rowClass = (task: DisplayTask) => {
  const classes: string[] = []
  if (task.id === props.selectedTaskId) {
    classes.push('bg-blue-50', 'dark:bg-slate-700/60')
  }
  if (props.highlightCritical && task.flags?.critical) {
    classes.push('border-l-4', 'border-rose-400')
  }
  return classes.join(' ')
}

const handleRowClick = (event: { data: DisplayTask }) => {
  if (!event?.data) return
  emit('edit-task', event.data.id)
}

const toggleTask = (task: DisplayTask) => {
  if (!task.isSummary) return
  emit('toggle-task', task.id)
}
</script>
