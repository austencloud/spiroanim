export const PWA_MANIFEST_URL = '/manifest.webmanifest'
export const DEV_PWA_MANIFEST_URL = '/manifest-dev.webmanifest'
export const PRODUCTION_PWA_HOSTNAME = 'spiroanim.com'

export const pwaManifest = {
  id: '/',
  scope: '/',
  start_url: '/',
  name: 'SpiroAnim',
  short_name: 'SpiroAnim',
  description: 'Create, edit, and play procedural spiro animations.',
  lang: 'en',
  display: 'standalone',
  background_color: '#090b0f',
  theme_color: '#090b0f',
  icons: [
    {
      src: '/images/app-icons/pwa-64x64.png',
      sizes: '64x64',
      type: 'image/png',
    },
    {
      src: '/images/app-icons/pwa-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: '/images/app-icons/pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/images/app-icons/maskable-icon-512x512.png',
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
      icons: [
        {
          src: '/images/app-icons/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
      ],
    },
    {
      name: 'About',
      short_name: 'About',
      url: '/about',
      icons: [
        {
          src: '/images/app-icons/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
      ],
    },
  ],
}

export const devPwaManifest = {
  ...pwaManifest,
  name: 'SpiroAnim Dev',
  short_name: 'SpiroAnim Dev',
}
