import { describe, expect, it } from 'vitest'

import {
  DEV_PWA_HOSTNAME,
  DEV_PWA_MANIFEST_URL,
  PWA_MANIFEST_URL,
  devPwaManifest,
  pwaManifest,
} from '../pwaManifest.ts'

describe('PWA manifests', () => {
  it('labels dev host installs distinctly', () => {
    expect(DEV_PWA_HOSTNAME).toBe('dev.spiroanim.com')
    expect(DEV_PWA_MANIFEST_URL).toBe('/manifest-dev.webmanifest')
    expect(devPwaManifest).toMatchObject({
      name: 'SpiroAnim Dev',
      short_name: 'SpiroAnim Dev',
    })
  })

  it('preserves the production manifest names', () => {
    expect(PWA_MANIFEST_URL).toBe('/manifest.webmanifest')
    expect(pwaManifest).toMatchObject({
      name: 'Spiro Animator',
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
        icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
      })),
    )
    expect(devPwaManifest.shortcuts).toBe(pwaManifest.shortcuts)
  })
})
