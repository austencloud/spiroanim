<template>
  <aside
    v-if="offlineReady || needRefresh || updateInstalling || unsupportedVersion !== undefined"
    class="pwa-update"
    :class="promptClass"
    :role="updateInstalling ? 'status' : 'alert'"
    :aria-live="updateInstalling ? 'polite' : 'assertive'"
  >
    <div class="pwa-update-message">
      <span v-if="updateInstalling" class="update-spinner" aria-hidden="true" />
      <p>{{ message }}</p>
    </div>
    <div v-if="!updateInstalling" class="pwa-update-actions">
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

const { applyUpdate, dismiss, needRefresh, offlineReady, updateInstalling } = usePwaUpdate()
const queryVersionStore = useQueryVersionStore()
const { unsupportedVersion } = storeToRefs(queryVersionStore)
const { clearUnsupportedVersion } = queryVersionStore

const message = computed(() => {
  if (needRefresh.value) {
    return unsupportedVersion.value === undefined
      ? 'A SpiroAnim update is ready.'
      : `Update ready for format v${unsupportedVersion.value}.`
  }
  if (updateInstalling.value) {
    return unsupportedVersion.value === undefined
      ? 'Downloading a SpiroAnim update...'
      : `Downloading an update for format v${unsupportedVersion.value}...`
  }
  if (unsupportedVersion.value !== undefined) {
    return `Format v${unsupportedVersion.value} needs a newer SpiroAnim.`
  }
  return 'Ready to use offline.'
})

const promptClass = computed(() => ({
  'pwa-update--downloading': updateInstalling.value,
  'pwa-update--ready': needRefresh.value,
  'pwa-update--unsupported': !needRefresh.value && unsupportedVersion.value !== undefined,
  'pwa-update--offline':
    offlineReady.value && !needRefresh.value && unsupportedVersion.value === undefined,
}))

const reloadPage = () => window.location.reload()

const dismissPrompt = () => {
  dismiss()
  clearUnsupportedVersion()
}
</script>

<style scoped>
.pwa-update {
  --pwa-update-accent: var(--color-action-primary);

  position: fixed;
  right: max(var(--space-4), var(--safe-area-inset-right));
  bottom: max(var(--space-4), var(--safe-area-inset-bottom));
  z-index: var(--z-pwa-prompt);
  width: min(calc(100vw - (2 * var(--space-4))), 24rem);
  padding: var(--space-4);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--pwa-update-accent);
  border-inline-start-width: 0.3rem;
  border-radius: var(--radius-md);
  box-shadow: 0 1rem 2.5rem color-mix(in srgb, var(--color-text) 20%, transparent);
}

.pwa-update--unsupported {
  --pwa-update-accent: var(--color-status-warning);
}

.pwa-update--offline {
  --pwa-update-accent: var(--color-status-success);
}

.pwa-update-message {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.pwa-update-message p {
  margin: 0;
  font-weight: 600;
  line-height: 1.5;
}

.update-spinner {
  flex: 0 0 auto;
  width: 1.25rem;
  height: 1.25rem;
  border: 3px solid color-mix(in srgb, var(--pwa-update-accent) 25%, transparent);
  border-top-color: var(--pwa-update-accent);
  border-radius: 50%;
  animation: pwa-update-spin 800ms linear infinite;
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

@keyframes pwa-update-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .update-spinner {
    animation-duration: 1600ms;
    animation-timing-function: steps(4, end);
  }
}
</style>
