import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the site from https://GerardoCianciulli.github.io/Personal-finance-app/
  base: '/Personal-finance-app/',
  plugins: [react(), svgr()],
})
