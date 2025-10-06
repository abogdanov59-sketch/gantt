<template>
  <svg :width="width" :height="height" class="pointer-events-none absolute inset-0">
    <defs>
      <marker
        id="arrowhead"
        markerWidth="10"
        markerHeight="7"
        refX="0"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
      </marker>
    </defs>
    <g stroke="currentColor" stroke-width="1.5" marker-end="url(#arrowhead)">
      <path
        v-for="link in layout"
        :key="link.id"
        :d="link.path"
        :class="link.class"
        fill="none"
      />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import type { Dependency, Project, Task } from '@/types'

const props = defineProps({
  tasks: {
    type: Array as PropType<Task[]>,
    required: true
  },
  dependencies: {
    type: Array as PropType<Dependency[]>,
    required: true
  },
  project: {
    type: Object as PropType<Project>,
    required: true
  },
  scale: {
    type: Number,
    required: true
  },
  rowHeight: {
    type: Number,
    required: true
  }
})

const width = computed(() => 2000)
const height = computed(() => props.tasks.length * props.rowHeight)

const taskIndex = computed(() => {
  const index = new Map<string, number>()
  props.tasks.forEach((task, taskIndex) => index.set(task.id, taskIndex))
  return index
})

const layout = computed(() => {
  const paths: Array<{ id: string; path: string; class: string }> = []
  const startTime = new Date(Math.min(...props.tasks.map((task) => new Date(task.start).getTime())))

  props.dependencies.forEach((dependency) => {
    const predecessor = props.tasks.find((task) => task.id === dependency.predecessorId)
    const successor = props.tasks.find((task) => task.id === dependency.successorId)
    if (!predecessor || !successor) return
    const predecessorIndex = taskIndex.value.get(predecessor.id) ?? 0
    const successorIndex = taskIndex.value.get(successor.id) ?? 0
    const predecessorEnd = new Date(predecessor.finish).getTime()
    const successorStart = new Date(successor.start).getTime()
    const x1 = (predecessorEnd - startTime.getTime()) * props.scale
    const y1 = predecessorIndex * props.rowHeight + props.rowHeight / 2
    const x2 = (successorStart - startTime.getTime()) * props.scale
    const y2 = successorIndex * props.rowHeight + props.rowHeight / 2
    const dx = (x2 - x1) / 2
    const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
    paths.push({
      id: dependency.id,
      path,
      class: dependency.type === 'FS' ? 'text-emerald-500' : 'text-slate-400'
    })
  })

  return paths
})
</script>
