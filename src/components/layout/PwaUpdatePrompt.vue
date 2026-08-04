<template>
  <aside
    v-if="offlineReady || needRefresh || unsupportedVersion !== undefined"
    class="pwa-update"
    role="alert"
    aria-live="assertive"
  >
    <p>{{ message }}</p>
    <div class="pwa-update-actions">
      <button v-if="needRefresh" class="primary-action" type="button" @click="applyUpdate">
        Update Now
      </button>
      <button
        v-else-if="unsupportedVersion !== undefined"
        class="primary-action"
        type="button"
        @click="reloadPage"
      >
        Reload and Check Again
      </button>
      <button type="button" @click="dismissPrompt">
        {{ needRefresh ? 'Later' : 'Dismiss' }}
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { usePwaUpdate } from '@/composables/usePwaUpdate'
import { useQueryVersionStore } from '@/stores/useQueryVersionStore'

const { applyUpdate, dismiss, needRefresh, offlineReady } = usePwaUpdate()
const queryVersionStore = useQueryVersionStore()
const { unsupportedVersion } = storeToRefs(queryVersionStore)
const { clearUnsupportedVersion } = queryVersionStore

const message = computed(() => {
  if (needRefresh.value) {
    return unsupportedVersion.value === undefined
      ? 'A new version of SpiroAnim is available.'
      : `This URL uses unsupported format v${unsupportedVersion.value}. A newer version of SpiroAnim is available and may be required to open it safely.`
  }
  if (unsupportedVersion.value !== undefined) {
    return `This URL uses unsupported format v${unsupportedVersion.value}. Its data has not been loaded or changed. SpiroAnim may need to update; make sure you are online, then reload to check again.`
  }
  return 'SpiroAnim is ready offline.'
})

const reloadPage = () => window.location.reload()

const dismissPrompt = () => {
  dismiss()
  clearUnsupportedVersion()
}
</script>

<style scoped>
.pwa-update {
  position: fixed;
  right: max(var(--space-4), var(--safe-area-inset-right));
  bottom: max(var(--space-4), var(--safe-area-inset-bottom));
  z-index: var(--z-pwa-prompt);
  width: min(calc(100vw - (2 * var(--space-4))), 24rem);
  padding: var(--space-4);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-workspace-boundary);
  border-radius: var(--radius-md);
  box-shadow: 0 1rem 2.5rem color-mix(in srgb, var(--color-text) 20%, transparent);
}

.pwa-update p {
  margin: 0;
  line-height: 1.5;
}

.pwa-update-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-block-start: var(--space-3);
}

.pwa-update button {
  min-height: 2.5rem;
  padding-inline: var(--space-3);
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.pwa-update .primary-action {
  color: var(--color-on-action-primary);
  background: var(--color-action-primary);
  border-color: var(--color-action-primary);
}

.pwa-update button:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}
</style>
