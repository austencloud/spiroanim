<template>
  <BaseDialog
    v-model="isOpen"
    class="quick-slot-sets-dialog"
    title="Quick Slots"
    close-label="Close Quick Slots dialog"
  >
    <div class="quick-slot-sets">
      <p class="quick-slot-sets__note">
        Save the current Quick Slots as a named set, or load a previously saved set.
      </p>

      <p v-if="quickSlotCount === 0" class="quick-slot-sets__status" role="status">
        Quick Slots aren't currently enabled.
      </p>
      <p v-else-if="!hasQuickSlotValues" class="quick-slot-sets__status" role="status">
        The current Quick Slots don't contain any saved animations yet.
      </p>

      <label>
        <span>Saved set</span>
        <select v-model="selectedSetId" data-role="quick-slot-set-select" @change="feedback = ''">
          <option :value="null">No saved set selected</option>
          <option v-for="set in quickSlotSets" :key="set.id" :value="set.id">
            {{ set.name }}
          </option>
        </select>
      </label>

      <label>
        <span>Set name</span>
        <input
          v-model="setName"
          type="text"
          maxlength="80"
          autocomplete="off"
          data-role="quick-slot-set-name"
        />
      </label>

      <div class="quick-slot-sets__actions">
        <button type="button" :disabled="selectedSetId === null" @click="loadSelectedSet">
          Load
        </button>
        <button type="button" :disabled="!canSave || selectedSetId !== null" @click="saveNewSet">
          Save New
        </button>
        <button
          type="button"
          :disabled="!canSave || selectedSetId === null"
          @click="overwriteSelectedSet"
        >
          Overwrite
        </button>
        <button
          class="quick-slot-sets__delete"
          type="button"
          :disabled="selectedSetId === null"
          @click="deleteSelectedSet"
        >
          Delete
        </button>
      </div>

      <p v-if="feedback" class="quick-slot-sets__feedback" aria-live="polite">
        {{ feedback }}
      </p>
    </div>
  </BaseDialog>

  <BaseDialog
    v-model="deleteConfirmationOpen"
    class="quick-slot-set-delete-dialog"
    title="Delete Quick Slot set?"
    close-label="Close Quick Slot set deletion confirmation"
  >
    <div class="quick-slot-set-delete-confirmation">
      <p>
        Are you sure you want to delete
        <strong>{{ selectedSet?.name ?? 'this Quick Slot set' }}</strong
        >? This cannot be undone.
      </p>
      <label class="quick-slot-set-delete-confirmation__choice">
        <input v-model="skipDeleteConfirmationChoice" type="checkbox" />
        <span>Do not show again</span>
      </label>
      <div class="quick-slot-set-delete-confirmation__actions">
        <button type="button" @click="cancelDelete">Cancel</button>
        <button
          type="button"
          class="quick-slot-set-delete-confirmation__confirm"
          @click="confirmDelete"
        >
          Delete set
        </button>
      </div>
    </div>
  </BaseDialog>
</template>

<script setup lang="ts">
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'

const isOpen = ref(false)
const conceptsStore = useConceptsStore()
const { quickSlotCount, quickSlotPaths, quickSlotSets, selectedQuickSlotSetId } =
  storeToRefs(conceptsStore)
const selectedSetId = ref<string | null>(null)
const setName = ref('')
const feedback = ref('')
const deleteConfirmationOpen = ref(false)
const skipDeleteConfirmationChoice = ref(false)
const suppressDeleteConfirmation = ref(false)
const hasQuickSlotValues = computed(() => quickSlotPaths.value.some((path) => path !== null))
const canSave = computed(() => hasQuickSlotValues.value && setName.value.trim().length > 0)

const selectedSet = computed(() =>
  quickSlotSets.value.find((set) => set.id === selectedSetId.value),
)

watch(selectedSetId, () => {
  setName.value = selectedSet.value?.name ?? conceptsStore.nextQuickSlotSetName()
})

function saveNewSet() {
  if (!canSave.value) return
  selectedSetId.value = conceptsStore.saveNewQuickSlotSet(setName.value)
  feedback.value = `Saved ${selectedSet.value?.name ?? setName.value}.`
}

function overwriteSelectedSet() {
  if (!canSave.value || selectedSetId.value === null) return
  if (conceptsStore.overwriteQuickSlotSet(selectedSetId.value, setName.value)) {
    feedback.value = `Overwrote ${selectedSet.value?.name ?? setName.value}.`
  }
}

function loadSelectedSet() {
  if (selectedSetId.value === null) return
  if (conceptsStore.loadQuickSlotSet(selectedSetId.value)) isOpen.value = false
}

function performDelete() {
  if (selectedSetId.value === null) return
  const deletedName = selectedSet.value?.name ?? 'Quick Slot set'
  if (!conceptsStore.deleteQuickSlotSet(selectedSetId.value)) return

  selectedSetId.value = selectedQuickSlotSetId.value ?? quickSlotSets.value[0]?.id ?? null
  setName.value = selectedSet.value?.name ?? conceptsStore.nextQuickSlotSetName()
  feedback.value = `Deleted ${deletedName}.`
}

function deleteSelectedSet() {
  if (selectedSetId.value === null) return
  if (suppressDeleteConfirmation.value) {
    performDelete()
    return
  }

  skipDeleteConfirmationChoice.value = false
  deleteConfirmationOpen.value = true
}

function cancelDelete() {
  deleteConfirmationOpen.value = false
  skipDeleteConfirmationChoice.value = false
}

function confirmDelete() {
  suppressDeleteConfirmation.value = skipDeleteConfirmationChoice.value
  deleteConfirmationOpen.value = false
  performDelete()
}

function open() {
  const rememberedId = selectedQuickSlotSetId.value
  selectedSetId.value = quickSlotSets.value.some((set) => set.id === rememberedId)
    ? rememberedId
    : (quickSlotSets.value[0]?.id ?? null)
  setName.value = selectedSet.value?.name ?? conceptsStore.nextQuickSlotSetName()
  feedback.value = ''
  isOpen.value = true
}

defineExpose({ open })
</script>

<style scoped>
:global(.quick-slot-sets-dialog) {
  width: min(30rem, calc(100vw - (2 * var(--space-4))));
}

.quick-slot-sets,
.quick-slot-sets label {
  display: grid;
}

.quick-slot-sets {
  gap: var(--space-4);
}

.quick-slot-sets__note,
.quick-slot-sets__status,
.quick-slot-sets__feedback {
  margin: 0;
}

:deep(.quick-slot-set-delete-dialog .base-dialog__body) {
  padding: var(--space-6);
}

.quick-slot-set-delete-confirmation {
  display: grid;
  gap: var(--space-6);
}

.quick-slot-set-delete-confirmation p {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.55;
}

.quick-slot-set-delete-confirmation__choice {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  font-weight: 700;
}

.quick-slot-set-delete-confirmation__choice input {
  width: 1.15rem;
  height: 1.15rem;
  accent-color: var(--color-action-primary);
}

.quick-slot-set-delete-confirmation__actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  flex-wrap: wrap;
}

.quick-slot-set-delete-confirmation__actions button {
  min-height: 2.75rem;
  padding-inline: var(--space-4);
  color: var(--color-text);
  font: inherit;
  font-weight: 700;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.quick-slot-set-delete-confirmation__actions .quick-slot-set-delete-confirmation__confirm {
  color: var(--color-on-action-primary);
  background: var(--color-status-warning);
  border-color: var(--color-status-warning);
}

.quick-slot-sets__note {
  color: var(--color-text-muted);
}

.quick-slot-sets__status {
  padding: var(--space-3);
  color: var(--color-status-warning);
  background: color-mix(in srgb, var(--color-status-warning) 9%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--color-status-warning) 45%, var(--color-border));
  border-radius: var(--radius-sm);
}

.quick-slot-sets label {
  gap: var(--space-2);
  font-weight: 700;
}

.quick-slot-sets input,
.quick-slot-sets select {
  min-height: 2.75rem;
  padding-inline: var(--space-3);
  color: var(--color-text);
  font: inherit;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.quick-slot-sets input:focus-visible,
.quick-slot-sets select:focus-visible,
.quick-slot-sets button:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.quick-slot-sets__actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.quick-slot-sets__actions button {
  min-height: 2.75rem;
  padding-inline: var(--space-4);
  color: var(--color-on-action-primary);
  font: inherit;
  font-weight: 700;
  background: var(--color-action-primary);
  border: 1px solid var(--color-action-primary);
  border-radius: var(--radius-sm);
}

.quick-slot-sets__actions button:disabled {
  color: var(--color-text-muted);
  cursor: not-allowed;
  background: var(--color-surface);
  border-color: var(--color-border);
  opacity: 0.65;
}

.quick-slot-sets__actions .quick-slot-sets__delete {
  color: var(--color-status-warning);
  background: color-mix(in srgb, var(--color-status-warning) 8%, var(--color-surface));
  border-color: color-mix(in srgb, var(--color-status-warning) 55%, var(--color-border));
}

.quick-slot-sets__feedback {
  color: var(--color-status-success);
  font-weight: 700;
}
</style>
