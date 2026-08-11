<template>
  <BaseDialog
    v-model="isOpen"
    class="pwa-reset-dialog"
    title="Reset SpiroAnim?"
    close-label="Close reset confirmation"
  >
    <p class="reset-warning">
      <strong>Are you sure?</strong> This removes SpiroAnim's offline files, update workers, saved
      editor preferences, and all other locally stored app data for this address. This cannot be
      undone.
    </p>
    <p class="reset-guidance">Close any other SpiroAnim tabs before continuing.</p>
    <div class="reset-actions">
      <button type="button" @click="isOpen = false">Cancel</button>
      <a class="reset-action" href="/reset/">Continue to Reset</a>
    </div>
  </BaseDialog>
</template>

<script setup lang="ts">
import BaseDialog from '@/components/ui/BaseDialog.vue'

const isOpen = ref(false)

function open() {
  isOpen.value = true
}

defineExpose({ open })
</script>

<style scoped>
:deep(.base-dialog__body) {
  display: grid;
  gap: var(--space-4);
}

p {
  margin: 0;
  line-height: 1.55;
}

.reset-warning {
  padding: var(--space-3) var(--space-4);
  color: var(--color-text-muted);
  background: color-mix(in srgb, var(--color-status-warning) 9%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-status-warning) 45%, var(--color-border));
  border-inline-start: 3px solid var(--color-status-warning);
  border-radius: var(--radius-sm);
}

.reset-warning strong {
  color: var(--color-text);
}

.reset-guidance {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.reset-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: flex-end;
  margin-block-start: var(--space-2);
}

.reset-actions button,
.reset-action {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  padding-inline: var(--space-4);
  color: var(--color-text);
  font: inherit;
  font-weight: 750;
  text-decoration: none;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.reset-action {
  color: var(--color-on-action-primary);
  background: var(--color-status-warning);
  border-color: var(--color-status-warning);
}

.reset-actions button:focus-visible,
.reset-action:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}
</style>
