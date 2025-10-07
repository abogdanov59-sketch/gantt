import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const exampleRoot = fileURLToPath(new URL('./', import.meta.url))
const projectRoot = fileURLToPath(new URL('../../', import.meta.url))

export default defineConfig({
  plugins: [vue()],
  root: exampleRoot,
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src'),
      '@gantt/module': resolve(projectRoot, 'src')
    }
  },
  server: {
    fs: {
      allow: [exampleRoot, projectRoot]
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(exampleRoot, 'index.html')
    }
  }
})
