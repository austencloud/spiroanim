import type { InjectionKey } from 'vue'
import type { Workbox, WorkboxLifecycleEvent } from 'workbox-window'

import {
  reloadOnServiceWorkerControllerReplacement,
  scheduleServiceWorkerUpdates,
} from '@/services/pwaUpdate'

const SERVICE_WORKER_URL = '/sw.js'

export interface PwaUpdateController {
  applyUpdate: () => void
  dismiss: () => void
  needRefresh: Readonly<Ref<boolean>>
  offlineReady: Readonly<Ref<boolean>>
  updateFailed: Readonly<Ref<boolean>>
  updateInstalling: Readonly<Ref<boolean>>
}

export const pwaUpdateControllerKey: InjectionKey<PwaUpdateController> =
  Symbol('pwa-update-controller')

export function usePwaUpdate(): PwaUpdateController {
  const offlineReady = ref(false)
  const needRefresh = ref(false)
  const updateInstalling = ref(false)
  const updateFailed = ref(false)
  let reloadStarted = false
  let workbox: Workbox | undefined
  let stopControllerChangeReload: () => void = () => undefined
  let stopScheduledUpdates: () => void = () => undefined

  function reloadPage() {
    if (reloadStarted) return

    reloadStarted = true
    window.location.reload()
  }

  function showUpdatePrompt() {
    updateInstalling.value = false
    updateFailed.value = false
    needRefresh.value = true
  }

  function handleInstalling(event: WorkboxLifecycleEvent) {
    if (event.isUpdate || event.isExternal) {
      needRefresh.value = false
      updateFailed.value = false
      updateInstalling.value = true
    }
  }

  function handleRedundant(event: WorkboxLifecycleEvent) {
    const updateWasInstalling = updateInstalling.value || event.isUpdate || event.isExternal
    updateInstalling.value = false
    if (updateWasInstalling) {
      needRefresh.value = false
      updateFailed.value = true
    }
  }

  function handleInstalled(event: WorkboxLifecycleEvent) {
    if (typeof event.isUpdate === 'undefined') {
      if (typeof event.isExternal !== 'undefined') {
        if (event.isExternal) showUpdatePrompt()
        else if (!needRefresh.value) offlineReady.value = true
      } else if (!needRefresh.value) {
        offlineReady.value = true
      }
    } else if (!event.isUpdate) {
      offlineReady.value = true
    }
  }

  onMounted(async () => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

    stopControllerChangeReload = reloadOnServiceWorkerControllerReplacement(
      navigator.serviceWorker,
      reloadPage,
    )

    const { Workbox: WorkboxClient } = await import('workbox-window')
    workbox = new WorkboxClient(SERVICE_WORKER_URL)
    workbox.addEventListener('installing', handleInstalling)
    workbox.addEventListener('installed', handleInstalled)
    workbox.addEventListener('waiting', showUpdatePrompt)
    workbox.addEventListener('redundant', handleRedundant)

    try {
      const registration = await workbox.register({ immediate: true })
      if (registration) {
        if (registration.waiting) showUpdatePrompt()
        stopScheduledUpdates = scheduleServiceWorkerUpdates(
          registration,
          SERVICE_WORKER_URL,
          window,
          document,
        )
      }
    } catch (error) {
      if (updateInstalling.value) {
        updateInstalling.value = false
        updateFailed.value = true
      }
      console.error('PWA service worker registration failed.', error)
    }
  })

  onBeforeUnmount(() => {
    stopControllerChangeReload()
    stopScheduledUpdates()
    workbox?.removeEventListener('installing', handleInstalling)
    workbox?.removeEventListener('installed', handleInstalled)
    workbox?.removeEventListener('waiting', showUpdatePrompt)
    workbox?.removeEventListener('redundant', handleRedundant)
  })

  function applyUpdate() {
    workbox?.messageSkipWaiting()
  }

  function dismiss() {
    offlineReady.value = false
    needRefresh.value = false
  }

  return {
    applyUpdate,
    dismiss,
    needRefresh: readonly(needRefresh),
    offlineReady: readonly(offlineReady),
    updateFailed: readonly(updateFailed),
    updateInstalling: readonly(updateInstalling),
  }
}

export function usePwaUpdateController(): PwaUpdateController {
  return inject(pwaUpdateControllerKey) ?? usePwaUpdate()
}
