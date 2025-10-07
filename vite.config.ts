import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

const rootDir = process.cwd()

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(rootDir, 'src')
    }
  },
  build: {
    lib: {
      entry: resolve(rootDir, 'src/index.ts'),
      name: 'ConstructionGantt',
      fileName: (format) => (format === 'es' ? 'gantt.es.js' : 'gantt.umd.cjs')
    },
    rollupOptions: {
      external: ['vue', 'primevue/datatable', 'primevue/virtualscroller', 'primevue/column', 'primevue/button'],
      output: {
        globals: {
          vue: 'Vue',
          'primevue/datatable': 'PrimeVueDataTable',
          'primevue/column': 'PrimeVueColumn',
          'primevue/virtualscroller': 'PrimeVueVirtualScroller',
          'primevue/button': 'PrimeVueButton'
        }
      }
    },
    sourcemap: true,
    target: 'es2020'
  }
})
