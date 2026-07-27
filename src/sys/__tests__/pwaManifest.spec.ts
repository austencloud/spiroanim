import { describe, expect, it } from 'vitest'

import {
  DEV_PWA_MANIFEST_URL,
  PRODUCTION_PWA_HOSTNAME,
  PWA_MANIFEST_URL,
  devPwaManifest,
  pwaManifest,
} from '../pwaManifest.ts'

describe('PWA manifests', () => {
  it('labels non-production host installs distinctly', () => {
    expect(PRODUCTION_PWA_HOSTNAME).toBe('spiroanim.com')
    expect(DEV_PWA_MANIFEST_URL).toBe('/manifest-dev.webmanifest')
    expect(devPwaManifest).toMatchObject({
      name: 'SpiroAnim Dev',
      short_name: 'SpiroAnim Dev',
    })
  })

  it('preserves the production manifest names', () => {
    expect(PWA_MANIFEST_URL).toBe('/manifest.webmanifest')
    expect(pwaManifest).toMatchObject({
      name: 'SpiroAnim',
      short_name: 'SpiroAnim',
    })
  })

  it('offers SpiroAnim and About shortcuts in both manifests', () => {
    const shortcuts = [
      { name: 'SpiroAnim', short_name: 'SpiroAnim', url: '/app' },
      { name: 'About', short_name: 'About', url: '/about' },
    ]

    expect(pwaManifest.shortcuts).toEqual(
      shortcuts.map((shortcut) => ({
        ...shortcut,
        icons: [
          {
            src: '/images/app-icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      })),
    )
    expect(devPwaManifest.shortcuts).toBe(pwaManifest.shortcuts)
  })
})
