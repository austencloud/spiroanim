import { useMediaQuery } from '@vueuse/core'

const installedDisplayQueries = [
  '(display-mode: standalone)',
  '(display-mode: fullscreen)',
  '(display-mode: minimal-ui)',
  '(display-mode: window-controls-overlay)',
] as const

function detectIos(): boolean {
  if (typeof navigator === 'undefined') return false

  const userAgent = navigator.userAgent
  const isIosDevice = /iPhone|iPad|iPod/.test(userAgent)
  const isTouchMac = userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1

  return isIosDevice || isTouchMac
}

function detectIosStandalone(): boolean {
  if (typeof navigator === 'undefined') return false

  return Reflect.get(navigator, 'standalone') === true
}

export function isInstalledDisplayMode(): boolean {
  const matchesInstalledDisplay =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    installedDisplayQueries.some((query) => window.matchMedia(query).matches)

  return matchesInstalledDisplay || detectIosStandalone()
}

export function useAppDisplayMode() {
  const standalone = useMediaQuery(installedDisplayQueries[0])
  const fullscreen = useMediaQuery(installedDisplayQueries[1])
  const minimalUi = useMediaQuery(installedDisplayQueries[2])
  const windowControlsOverlay = useMediaQuery(installedDisplayQueries[3])
  const isDesktop = useMediaQuery('(hover: hover) and (pointer: fine)')
  const isIos = ref(false)
  const iosStandalone = ref(false)

  onMounted(() => {
    isIos.value = detectIos()
    iosStandalone.value = detectIosStandalone()
  })

  const isInstalledDisplay = computed(
    () =>
      standalone.value ||
      fullscreen.value ||
      minimalUi.value ||
      windowControlsOverlay.value ||
      iosStandalone.value,
  )

  return {
    isDesktop: readonly(isDesktop),
    isInstalledDisplay: readonly(isInstalledDisplay),
    isIos: readonly(isIos),
  }
}
