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
          // React core — changes rarely, long-lived cache
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react'
          }
          // GSAP — lazy-loaded but still gets its own chunk for caching
          if (id.includes('node_modules/gsap')) {
            return 'vendor-gsap'
          }
          // Lenis smooth scroll — lazy-loaded, separate chunk
          if (id.includes('node_modules/lenis')) {
            return 'vendor-lenis'
          }
          // Everything else in node_modules
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
      },
    },
  },
})
