import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [], // /api/backlog excluded — no runtime API caching
        globPatterns: ['**/*.{js,css,html,svg,png,ico}']
      },
      manifest: {
        name: 'Factory Dashboard',
        short_name: 'Factory',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1a1a2e',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }]
      }
    })
  ]
});
