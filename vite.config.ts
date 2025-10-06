import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [vue()],
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
          vue: 'Vue'
        }
      }
    },
    sourcemap: true,
    target: 'es2020'
  }
})
