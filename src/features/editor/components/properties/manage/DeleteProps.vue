<template>
  <div class="delprp-container">
    <AppTooltip>
      <template #activator="{ props: tooltipProps }">
        <a v-bind="tooltipProps" href="#" @click.prevent="clickDeleteProps">Delete Props</a>
      </template>
      <template #html>
        <strong>Delete Props</strong><br />
        Removes every currently selected prop and all animation data owned by those props.<br />
        If any props remain, the first one is selected automatically.
      </template>
    </AppTooltip>
    <BaseDialog
      v-model="confirmationOpen"
      class="delete-props-confirmation"
      title="Delete selected props?"
      close-label="Close Delete Props confirmation"
    >
      <p>
        <strong>Are you sure?</strong> This will delete every selected prop and all animation data
        owned by those props.
      </p>
      <label class="delete-confirmation__choice">
        <input v-model="skipConfirmationChoice" type="checkbox" />
        <span>Do not show again</span>
      </label>
      <div class="delete-confirmation__actions">
        <button type="button" class="delete-confirmation__cancel" @click="cancelDelete">
          Cancel
        </button>
        <button type="button" class="delete-confirmation__proceed" @click="confirmDelete">
          Delete
        </button>
      </div>
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import AppTooltip from '@/components/AppTooltip.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useProperties } from '@/features/editor/composables/useProperties'

const store = inject('store', ref('main'))

const playerStore = usePlayerStore(store.value)
const { ROOT } = playerStore.raw()
const { PLAYING } = storeToRefs(playerStore)

const { pSELECTED } = useProperties(store.value)
const confirmationOpen = ref(false)
const skipConfirmationChoice = ref(false)
const suppressConfirmation = ref(false)

const performDelete = () => {
  if (PLAYING.value) return

  const props = []

  for (const i in ROOT.value.props)
    if (!pSELECTED.value[i]) props.push(toRaw(ROOT.value.props[Number(i)]!))

  ROOT.value.props = props
  pSELECTED.value = {}

  // Select the first prop
  if (ROOT.value.props.length > 0) {
    pSELECTED.value[0] = true
  }

  triggerRef(ROOT)
}

const clickDeleteProps = () => {
  if (PLAYING.value) return
  if (suppressConfirmation.value) {
    performDelete()
    return
  }

  skipConfirmationChoice.value = false
  confirmationOpen.value = true
}

const cancelDelete = () => {
  confirmationOpen.value = false
  skipConfirmationChoice.value = false
}

const confirmDelete = () => {
  suppressConfirmation.value = skipConfirmationChoice.value
  confirmationOpen.value = false
  performDelete()
}
</script>

<style scoped>
.delprp-container {
  padding: 5px;
}

:deep(.delete-props-confirmation .base-dialog__body) {
  display: grid;
  gap: var(--space-6);
}

.delete-props-confirmation p {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.55;
}

.delete-confirmation__choice {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  font-weight: 700;
}

.delete-confirmation__choice input {
  width: 1.15rem;
  height: 1.15rem;
  accent-color: var(--color-action-primary);
}

.delete-confirmation__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: flex-end;
}

.delete-confirmation__actions button {
  min-height: 2.75rem;
  padding-inline: var(--space-4);
  color: var(--color-text);
  font: inherit;
  font-weight: 750;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.delete-confirmation__actions .delete-confirmation__proceed {
  color: var(--color-on-action-primary);
  background: var(--color-action-primary);
  border-color: var(--color-action-primary);
}

.delete-confirmation__actions button:focus-visible,
.delete-confirmation__choice input:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}
</style>
