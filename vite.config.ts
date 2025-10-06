import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ConstructionGantt',
      fileName: (format) => (format === 'es' ? 'gantt.es.js' : 'gantt.umd.cjs')
    },
    rollupOptions: {
      external: ['vue', 'primevue/datatable', 'primevue/virtualscroller', 'primevue/column', 'primevue/button'],
      output: {
        globals: {
          vue: 'Vue'
        }
      }
    },
    sourcemap: true,
    target: 'es2020'
  }
})
