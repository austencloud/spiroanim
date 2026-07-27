const RECOVERY_KEY = 'spiroanim:stale-asset-recovery'

interface PreloadErrorSource {
  addEventListener(type: 'vite:preloadError', listener: EventListener): void
  removeEventListener(type: 'vite:preloadError', listener: EventListener): void
}

interface ReloadLocation {
  readonly href: string
  reload(): void
}

interface RecoveryStorage {
  getItem(key: string): string | null
  removeItem(key: string): void
  setItem(key: string, value: string): void
}

export function installStaleAssetRecovery(
  source: PreloadErrorSource,
  location: ReloadLocation,
  storage: RecoveryStorage,
): () => void {
  const handlePreloadError: EventListener = (event) => {
    event.preventDefault()

    if (storage.getItem(RECOVERY_KEY) === location.href) return

    storage.setItem(RECOVERY_KEY, location.href)
    location.reload()
  }

  source.addEventListener('vite:preloadError', handlePreloadError)

  return () => {
    source.removeEventListener('vite:preloadError', handlePreloadError)
  }
}

export function markStaleAssetRecoveryComplete(storage: RecoveryStorage) {
  storage.removeItem(RECOVERY_KEY)
}
