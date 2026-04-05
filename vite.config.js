import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    minify: 'esbuild',
    // Inline small assets as base64 up to 4KB — avoids extra round-trips for icons/tiny images
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // GSAP — lazy-loaded via useScrollReveal
          if (id.includes('/node_modules/gsap')) {
            return 'vendor-gsap'
          }
          // Lenis smooth scroll — lazy-loaded
          if (id.includes('/node_modules/lenis')) {
            return 'vendor-lenis'
          }
          // All other node_modules (react, react-dom, etc.) in one stable chunk
          if (id.includes('/node_modules/')) {
            return 'vendor'
          }
        },
      },
    },
  },
})
