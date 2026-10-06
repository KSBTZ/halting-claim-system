import process from 'node:process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Vercel provides the commit being deployed; fall back to the build time elsewhere
const version = process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now())

// Publishes /version.json so open tabs can tell when a newer deploy is live
const appVersion = () => ({
  name: 'app-version',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), appVersion()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
  },
})
