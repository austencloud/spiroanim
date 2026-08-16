<template>
  <div class="delsel-container">
    <AppTooltip>
      <template #activator="{ props: tooltipProps }">
        <a v-bind="tooltipProps" href="#" @click.prevent="clickDeleteSel">Delete Selection</a>
      </template>
      <template #html>
        <strong>Delete Selection</strong><br />
        Removes {{ frameName }} frames from the selected props at the current timeline position.<br />
        When a timeline range is selected, every {{ frameName }} frame within that range is removed.
      </template>
    </AppTooltip>
    <BaseDialog
      v-model="confirmationOpen"
      class="delete-selection-confirmation"
      title="Delete selection?"
      close-label="Close Delete Selection confirmation"
    >
      <p>
        <strong>Are you sure?</strong> This will delete the selected {{ frameName.toLowerCase() }}
        frames.
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
import { useManageProperties } from '@/features/editor/composables/useManageProperties'
import { useProperties } from '@/features/editor/composables/useProperties'

const store = inject('store', ref('main'))

const playerStore = usePlayerStore(store.value)
const { ROOT } = playerStore.raw()
const { PLAYING } = storeToRefs(playerStore)
const { pFRAMES } = useProperties(store.value)
const confirmationOpen = ref(false)
const skipConfirmationChoice = ref(false)
const suppressConfirmation = ref(false)

const { propSelection, cameraSelection } = useManageProperties(store.value)
const frameName = computed(() =>
  pFRAMES.value === 'animation' ? 'Animation' : pFRAMES.value === 'motion' ? 'Motion' : 'Camera',
)

const performDelete = () => {
  if (PLAYING.value) return

  let deleted = false
  if (pFRAMES.value === 'camera') {
    cameraSelection((start, end) => {
      if (start === -1 || end === -1) return
      const count = end - start + 1
      if (ROOT.value.camera.length - count < 1) return
      ROOT.value.camera.splice(start, count)
      deleted = true
    })
    if (deleted) triggerRef(ROOT)
    return
  }

  propSelection((ind, start, end) => {
    const prop = ROOT.value.props[ind]!
    const frames = pFRAMES.value === 'animation' ? prop.anim : prop.motion

    if (start != -1 && end != -1) {
      frames.splice(start, end - start + 1)
      deleted = true
    }
  })
  if (deleted) triggerRef(ROOT)
}

const clickDeleteSel = () => {
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
.delsel-container {
  padding: 5px;
}

:deep(.delete-selection-confirmation .base-dialog__body) {
  display: grid;
  gap: var(--space-6);
}

.delete-selection-confirmation p {
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
