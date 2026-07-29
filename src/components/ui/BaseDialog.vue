<template>
  <dialog ref="dialogElement" class="base-dialog" :aria-labelledby="titleId" @close="onClose">
    <div class="base-dialog__content">
      <header class="base-dialog__header">
        <h2 :id="titleId">{{ title }}</h2>
        <form method="dialog">
          <button class="base-dialog__close" type="submit" :aria-label="closeLabel">
            <BaseIcon :path="mdiClose" :size="22" />
          </button>
        </form>
      </header>
      <div class="base-dialog__body">
        <slot />
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { mdiClose } from '@mdi/js'
import { useId } from 'vue'

import BaseIcon from '@/components/icons/BaseIcon.vue'

interface Props {
  title: string
  closeLabel?: string
}

const { title, closeLabel = 'Close dialog' } = defineProps<Props>()
const isOpen = defineModel<boolean>({ default: false })
const dialogElement = ref<HTMLDialogElement>()
const titleId = useId()

function showDialog() {
  const dialog = dialogElement.value
  if (!dialog || dialog.open) return

  if (typeof dialog.showModal === 'function') {
    dialog.showModal()
  } else {
    dialog.open = true
  }
}

function closeDialog() {
  const dialog = dialogElement.value
  if (!dialog?.open) return

  if (typeof dialog.close === 'function') {
    dialog.close()
  } else {
    dialog.open = false
  }
}

function onClose() {
  isOpen.value = false
}

watch(
  isOpen,
  async (open) => {
    await nextTick()
    if (open) showDialog()
    else closeDialog()
  },
  { immediate: true },
)
</script>

<style scoped>
.base-dialog {
  width: min(34rem, calc(100vw - (2 * var(--space-4))));
  max-width: none;
  padding: 0;
  overflow: hidden;
  color: var(--color-text);
  background: var(--color-surface);
  border: 2px solid color-mix(in srgb, var(--color-action-primary) 55%, var(--color-border));
  border-radius: var(--radius-md);
  box-shadow:
    0 0 0 1px var(--color-workspace-boundary),
    0 1.5rem 4rem rgb(0 0 0 / 55%);
}

.base-dialog::backdrop {
  background: var(--color-modal-backdrop);
  backdrop-filter: blur(0.3rem);
}

.base-dialog__content {
  display: grid;
}

.base-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  background: color-mix(in srgb, var(--color-action-primary) 9%, var(--color-surface));
  border-block-end: 1px solid
    color-mix(in srgb, var(--color-action-primary) 38%, var(--color-border));
}

.base-dialog__body {
  padding: var(--space-6);
}

h2 {
  margin: 0;
  font-size: 1.3rem;
  letter-spacing: 0.01em;
}

.base-dialog__close {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  place-items: center;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.base-dialog__close:hover,
.base-dialog__close:focus-visible {
  color: var(--color-action-primary);
  background: color-mix(in srgb, var(--color-action-primary) 10%, transparent);
}

.base-dialog__close:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

@media (max-width: 32rem) {
  .base-dialog__header,
  .base-dialog__body {
    padding: var(--space-4);
  }
}
</style>
