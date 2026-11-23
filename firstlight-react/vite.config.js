import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const ngrokHosts = ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.dev']

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: { input: ['index.html', 'terms.html', 'privacy.html'] },
  },
  // Allow any ngrok tunnel host (leading dot = all subdomains),
  // so the free-tier URL changing on each restart doesn't break dev.
  server: { allowedHosts: ngrokHosts },
  preview: { allowedHosts: ngrokHosts },
})
