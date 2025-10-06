import './styles/tailwind.css'

export { default as GanttModule } from './components/GanttModule.vue'
export * from './types'
export * from './composables/useGanttApi'
export { createSchedulerWorker } from './worker/createSchedulerWorker'
