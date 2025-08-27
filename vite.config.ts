import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))
const APP_VERSION = pkg.version
const BUILD_TIME = new Date().toISOString()

// 👇 這個物件允許自帶 version 欄位（官方型別沒有 version）
const manifestEx = {
  name: 'AfterClass',
  short_name: 'AfterClass',
  description: '10 分鐘國中數學測驗',
  start_url: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#0ea5e9',
  icons: [
    { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' }
  ],
  version: APP_VERSION // ✅ 想要的自訂欄位
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        cleanupOutdatedCaches: true, // 清掉舊版快取
        skipWaiting: true,
        clientsClaim: true
      },
      manifest: manifestEx as unknown as import ('vite-plugin-pwa').ManifestOptions
    })
  ],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME)    
  }
})