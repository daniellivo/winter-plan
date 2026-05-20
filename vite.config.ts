import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vercel sirve desde la raíz, gh-pages desde /winter-plan/.
// El script `npm run deploy` (gh-pages) define DEPLOY_TARGET=ghpages para usar
// el subpath; el resto de builds (Vercel) caen en `/`.
const base = process.env.DEPLOY_TARGET === 'ghpages' ? '/winter-plan/' : '/'

export default defineConfig({
  plugins: [react()],
  base,
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
})

