const RECOVERY_KEY = 'spiroanim:stale-asset-recovery'
const RECOVERY_COOLDOWN_MS = 30 * 1000

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

interface RecoveryAttempt {
  attemptedAt: number
  href: string
}

function readRecoveryAttempt(value: string | null): RecoveryAttempt | undefined {
  if (!value) return undefined

  try {
    const parsed: unknown = JSON.parse(value)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'attemptedAt' in parsed &&
      typeof parsed.attemptedAt === 'number' &&
      'href' in parsed &&
      typeof parsed.href === 'string'
    ) {
      return {
        attemptedAt: parsed.attemptedAt,
        href: parsed.href,
      }
    }
  } catch {
    // Older releases stored only the URL. Treat it as expired so those tabs can recover.
  }

  return undefined
}

export function installStaleAssetRecovery(
  source: PreloadErrorSource,
  location: ReloadLocation,
  storage: RecoveryStorage,
  now: () => number = Date.now,
): () => void {
  const handlePreloadError: EventListener = (event) => {
    event.preventDefault()

    const attemptedAt = now()
    const previousAttempt = readRecoveryAttempt(storage.getItem(RECOVERY_KEY))
    if (
      previousAttempt?.href === location.href &&
      attemptedAt - previousAttempt.attemptedAt < RECOVERY_COOLDOWN_MS
    ) {
      return
    }

    storage.setItem(RECOVERY_KEY, JSON.stringify({ attemptedAt, href: location.href }))
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
