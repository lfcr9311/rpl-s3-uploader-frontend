import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Em produção o app é servido em http://<servidor>/rpl/
  base: command === 'build' ? '/rpl/' : '/',
}))
