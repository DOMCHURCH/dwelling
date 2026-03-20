import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Never inline assets as base64 — always serve as separate files
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split framer-motion into its own chunk
          if (id.includes('framer-motion') || id.includes('motion/react')) {
            return 'vendor-framer'
          }
          // Split react into its own chunk
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react'
          }
          // All other node_modules together
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
      },
    },
  },
})
