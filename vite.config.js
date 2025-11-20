import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true // Enable access from network devices
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Increase warning limit slightly while we split chunks
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Better manual chunking to separate vendor libraries
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react'
            }
            if (id.includes('recharts')) {
              return 'vendor-recharts'
            }
            if (id.includes('jspdf-autotable')) {
              return 'vendor-jspdf-autotable'
            }
            if (id.includes('jspdf')) {
              return 'vendor-jspdf'
            }
            if (id.includes('html2canvas')) {
              return 'vendor-html2canvas'
            }
            if (id.includes('axios')) {
              return 'vendor-axios'
            }
            // default vendor chunk for other node_modules
            return 'vendor'
          }
        }
      }
    }
  }
})
