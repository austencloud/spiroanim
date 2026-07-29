import { PRODUCTION_PWA_HOSTNAME } from '@/sys/pwaManifest'
import { isTouchDevice } from '@/utils/device'

const ERUDA_SCRIPT_ID = 'spiroanim-eruda'
const ERUDA_SCRIPT_SOURCE = 'https://cdn.jsdelivr.net/npm/eruda'

interface MobileDevToolsWindow {
  location: Pick<Location, 'hostname'>
  navigator: Pick<Navigator, 'maxTouchPoints' | 'userAgent'>
  eruda?: Window['eruda']
}

export function loadMobileDevTools(
  sourceWindow: MobileDevToolsWindow = window,
  sourceDocument: Document = document,
): void {
  if (
    sourceWindow.location.hostname === PRODUCTION_PWA_HOSTNAME ||
    !isTouchDevice(sourceWindow.navigator)
  ) {
    return
  }

  if (sourceWindow.eruda) {
    sourceWindow.eruda.init()
    return
  }

  if (sourceDocument.getElementById(ERUDA_SCRIPT_ID)) return

  const script = sourceDocument.createElement('script')
  script.id = ERUDA_SCRIPT_ID
  script.src = ERUDA_SCRIPT_SOURCE
  script.onload = () => sourceWindow.eruda?.init()
  sourceDocument.body.appendChild(script)
}
