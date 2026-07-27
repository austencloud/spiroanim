import type { ManifestOptions } from 'vite-plugin-pwa'

export const PWA_MANIFEST_URL = '/manifest.webmanifest'
export const DEV_PWA_MANIFEST_URL = '/manifest-dev.webmanifest'
export const DEV_PWA_HOSTNAME = 'dev.spiroanim.com'

export const pwaManifest = {
  id: '/',
  scope: '/',
  start_url: '/',
  name: 'Spiro Animator',
  short_name: 'SpiroAnim',
  description: 'Create, edit, and play procedural spiro animations.',
  lang: 'en',
  display: 'standalone',
  background_color: '#090b0f',
  theme_color: '#090b0f',
  icons: [
    {
      src: '/pwa-64x64.png',
      sizes: '64x64',
      type: 'image/png',
    },
    {
      src: '/pwa-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: '/pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/maskable-icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
  shortcuts: [
    {
      name: 'SpiroAnim',
      short_name: 'SpiroAnim',
      url: '/app',
      icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
    },
    {
      name: 'About',
      short_name: 'About',
      url: '/about',
      icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
    },
  ],
} satisfies Partial<ManifestOptions>

export const devPwaManifest = {
  ...pwaManifest,
  name: 'SpiroAnim Dev',
  short_name: 'SpiroAnim Dev',
} satisfies Partial<ManifestOptions>
