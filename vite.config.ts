import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { viteSingleFile } from "vite-plugin-singlefile"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile(), 
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'inline', // Keeps the registration code inside your HTML
      manifest: {
        name: 'Body Composition System',
        short_name: 'BCS',
        description: 'Offline Body Composition & Macro System',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.png', // This must exist in your /public folder
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'favicon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})