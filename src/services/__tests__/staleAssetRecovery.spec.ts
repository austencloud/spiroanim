import { describe, expect, it, vi } from 'vitest'

import {
  installStaleAssetRecovery,
  markStaleAssetRecoveryComplete,
} from '@/services/staleAssetRecovery'

class TestPreloadErrorSource extends EventTarget {}

describe('stale asset recovery', () => {
  it('prevents immediate reload loops but retries after a cooldown', () => {
    const source = new TestPreloadErrorSource()
    const reload = vi.fn<() => void>()
    const storage = new Map<string, string>()
    let currentTime = 100_000
    const recoveryStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => storage.delete(key),
      setItem: (key: string, value: string) => storage.set(key, value),
    }
    const stop = installStaleAssetRecovery(
      source,
      { href: 'https://spiroanim.com/app', reload },
      recoveryStorage,
      () => currentTime,
    )

    const firstError = new Event('vite:preloadError', { cancelable: true })
    source.dispatchEvent(firstError)
    source.dispatchEvent(new Event('vite:preloadError', { cancelable: true }))

    expect(firstError.defaultPrevented).toBe(true)
    expect(reload).toHaveBeenCalledOnce()

    currentTime += 30_000
    source.dispatchEvent(new Event('vite:preloadError', { cancelable: true }))
    expect(reload).toHaveBeenCalledTimes(2)

    markStaleAssetRecoveryComplete(recoveryStorage)
    source.dispatchEvent(new Event('vite:preloadError', { cancelable: true }))
    expect(reload).toHaveBeenCalledTimes(3)

    stop()
  })

  it('allows tabs carrying the legacy URL-only recovery value to retry', () => {
    const source = new TestPreloadErrorSource()
    const reload = vi.fn<() => void>()
    const recoveryStorage = {
      getItem: () => 'https://spiroanim.com/app',
      removeItem: vi.fn<() => void>(),
      setItem: vi.fn<(key: string, value: string) => void>(),
    }

    installStaleAssetRecovery(
      source,
      { href: 'https://spiroanim.com/app', reload },
      recoveryStorage,
    )
    source.dispatchEvent(new Event('vite:preloadError', { cancelable: true }))

    expect(reload).toHaveBeenCalledOnce()
  })
})
