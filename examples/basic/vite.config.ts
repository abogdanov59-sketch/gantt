import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig({
  plugins: [vue()],
  root: __dirname,
  server: {
    port: 5174
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
