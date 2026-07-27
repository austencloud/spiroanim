import { describe, expect, it, vi } from 'vitest'

import {
  installStaleAssetRecovery,
  markStaleAssetRecoveryComplete,
} from '@/services/staleAssetRecovery'

class TestPreloadErrorSource extends EventTarget {}

describe('stale asset recovery', () => {
  it('reloads once when a Vite dynamic preload fails at the current URL', () => {
    const source = new TestPreloadErrorSource()
    const reload = vi.fn<() => void>()
    const storage = new Map<string, string>()
    const recoveryStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => storage.delete(key),
      setItem: (key: string, value: string) => storage.set(key, value),
    }
    const stop = installStaleAssetRecovery(
      source,
      { href: 'https://spiroanim.com/app', reload },
      recoveryStorage,
    )

    const firstError = new Event('vite:preloadError', { cancelable: true })
    source.dispatchEvent(firstError)
    source.dispatchEvent(new Event('vite:preloadError', { cancelable: true }))

    expect(firstError.defaultPrevented).toBe(true)
    expect(reload).toHaveBeenCalledOnce()

    markStaleAssetRecoveryComplete(recoveryStorage)
    source.dispatchEvent(new Event('vite:preloadError', { cancelable: true }))
    expect(reload).toHaveBeenCalledTimes(2)

    stop()
  })
})
