import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'three/webgpu': fileURLToPath(new URL('./src/vendor/three-webgpu.js', import.meta.url)),
      'three/tsl': fileURLToPath(new URL('./src/vendor/three-tsl.js', import.meta.url))
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  },
  build: {
    target: 'esnext'
  },
  server: {
    port: 5173
  }
})
