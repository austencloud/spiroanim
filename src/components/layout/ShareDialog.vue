<template>
  <BaseDialog
    v-model="isOpen"
    class="share-dialog"
    title="Share This"
    close-label="Close share dialog"
  >
    <p class="share-note">
      Pretty much any portion of this app can be shared. The link will open it close to how you're
      currently seeing it.
    </p>

    <label :for="urlFieldId">Share URL</label>
    <div class="share-controls">
      <input
        :id="urlFieldId"
        ref="urlField"
        :value="shareUrl"
        type="text"
        readonly
        @focus="selectUrl"
        @click="selectUrl"
      />
      <button v-if="canCopy" class="copy-button" type="button" @click="copyUrl">
        <BaseIcon :path="mdiContentCopy" :size="20" />
        <span>{{ copyLabel }}</span>
      </button>
    </div>
    <p v-if="copyStatus" class="copy-status" role="status">{{ copyStatus }}</p>
  </BaseDialog>
</template>

<script setup lang="ts">
import { mdiContentCopy } from '@mdi/js'
import { useId } from 'vue'

import BaseIcon from '@/components/icons/BaseIcon.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'

const isOpen = ref(false)
const urlField = ref<HTMLInputElement>()
const shareUrl = ref('')
const copyStatus = ref('')
const urlFieldId = useId()
const canCopy = computed(
  () => typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function',
)
const copyLabel = computed(() => (copyStatus.value === 'Copied.' ? 'Copied' : 'Copy'))

async function open() {
  shareUrl.value = window.location.href
  copyStatus.value = ''
  isOpen.value = true
  await nextTick()
  selectUrl()
}

function selectUrl() {
  urlField.value?.select()
}

async function copyUrl() {
  if (!canCopy.value) return

  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copyStatus.value = 'Copied.'
  } catch {
    copyStatus.value = 'Unable to copy. Select and copy the URL manually.'
  }
}

defineExpose({ open })
</script>

<style scoped>
:deep(.base-dialog__body) {
  display: grid;
  gap: var(--space-3);
}

p {
  margin: 0;
}

.share-note {
  padding: var(--space-3) var(--space-4);
  color: var(--color-text-muted);
  background: color-mix(in srgb, var(--color-action-primary) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 25%, var(--color-border));
  border-inline-start: 3px solid var(--color-action-primary);
  border-radius: var(--radius-sm);
  line-height: 1.5;
}

label {
  margin-block-start: var(--space-1);
  font-weight: 700;
}

.share-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-3);
}

input {
  min-width: 0;
  min-height: 3rem;
  padding-inline: var(--space-3);
  color: var(--color-text);
  font: inherit;
  background: color-mix(in srgb, var(--color-canvas) 60%, var(--color-surface));
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.copy-button {
  display: inline-flex;
  min-height: 3rem;
  align-items: center;
  gap: var(--space-2);
  padding-inline: var(--space-3);
  color: var(--color-on-action-primary);
  font: inherit;
  font-weight: 700;
  background: var(--color-action-primary);
  border: 2px solid
    color-mix(in srgb, var(--color-action-primary) 65%, var(--color-workspace-boundary));
  border-radius: var(--radius-sm);
}

input:focus-visible,
button:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.copy-status {
  min-height: 1.25rem;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

@media (max-width: 32rem) {
  .share-controls {
    grid-template-columns: 1fr;
  }
}
</style>
