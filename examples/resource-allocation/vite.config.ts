import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [vue()],
  root: __dirname,
  server: {
    port: 5175
  },
  resolve: {
    alias: {
      '@gantt/module': path.resolve(__dirname, '../../src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
