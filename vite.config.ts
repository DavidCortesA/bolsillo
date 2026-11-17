import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// En GitHub Pages la app vive en /bolsillo/; en local, en la raíz.
const base = process.env.GITHUB_ACTIONS ? '/bolsillo/' : '/';

export default defineConfig({
  base,
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Bolsillo — Finanzas personales',
        short_name: 'Bolsillo',
        description: 'Pagos quincenales y mensuales, ingresos y calendario de pagos.',
        lang: 'es-MX',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#f6f4ee',
        theme_color: '#f6f4ee',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
      },
    }),
  ],
});
