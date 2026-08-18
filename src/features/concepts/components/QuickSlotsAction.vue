<template>
  <span class="quick-slots-action">
    <AppTooltip :text="tooltip">
      <template #activator="{ props: activatorProps }">
        <button
          v-bind="activatorProps"
          type="button"
          class="quick-slots-action__button"
          :disabled="disabled"
          :aria-label="tooltip"
          :data-role="dataRole"
          @click="requestQSlots"
        >
          {{ label }}
        </button>
      </template>
    </AppTooltip>

    <BaseDialog
      v-model="warningOpen"
      class="qslots-warning"
      title="Use QSlots?"
      close-label="Close QSlots warning"
    >
      <p><strong>Are you sure?</strong> This will replace your current Quick Slots.</p>
      <label class="qslots-warning__choice">
        <input v-model="skipWarningChoice" type="checkbox" />
        <span>Do not show again</span>
      </label>
      <div class="qslots-warning__actions">
        <button type="button" class="qslots-warning__cancel" @click="cancel">Cancel</button>
        <button type="button" class="qslots-warning__proceed" @click="confirm">Continue</button>
      </div>
    </BaseDialog>
  </span>
</template>

<script setup lang="ts">
import AppTooltip from '@/components/AppTooltip.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    warningRequired?: boolean
    tooltip?: string
    dataRole?: string
    label?: string
  }>(),
  {
    disabled: false,
    warningRequired: false,
    tooltip: 'Use the detected transition with Quick Slots',
    dataRole: 'vtg-transition-qslots',
    label: 'QSlots',
  },
)
const emit = defineEmits<{ qSlots: [] }>()
const warningOpen = ref(false)
const skipWarningChoice = ref(false)
const suppressWarning = ref(false)

const perform = () => emit('qSlots')
const requestQSlots = () => {
  if (props.disabled) return
  if (!props.warningRequired || suppressWarning.value) {
    perform()
    return
  }
  skipWarningChoice.value = false
  warningOpen.value = true
}
const cancel = () => {
  warningOpen.value = false
  skipWarningChoice.value = false
}
const confirm = () => {
  suppressWarning.value = skipWarningChoice.value
  warningOpen.value = false
  perform()
}
</script>

<style scoped>
.quick-slots-action {
  display: inline-flex;
}

.quick-slots-action__button {
  box-sizing: border-box;
  display: grid;
  block-size: var(--size-concept-control-block);
  min-width: 2.25rem;
  padding-block: var(--space-1);
  padding-inline: var(--space-concept-control-inline);
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-concept-control);
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.quick-slots-action__button:disabled {
  color: var(--color-text-muted);
  cursor: not-allowed;
  opacity: 0.62;
}

.quick-slots-action__button:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

:deep(.qslots-warning .base-dialog__body) {
  display: grid;
  gap: var(--space-6);
}

.qslots-warning p {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.55;
}

.qslots-warning__choice {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  font-weight: 700;
}

.qslots-warning__choice input {
  width: 1.15rem;
  height: 1.15rem;
  accent-color: var(--color-action-primary);
}

.qslots-warning__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: flex-end;
}

.qslots-warning__actions button {
  min-height: 2.75rem;
  padding-inline: var(--space-4);
  color: var(--color-text);
  font: inherit;
  font-weight: 750;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.qslots-warning__actions .qslots-warning__proceed {
  color: var(--color-on-action-primary);
  background: var(--color-action-primary);
  border-color: var(--color-action-primary);
}

.qslots-warning__actions button:focus-visible,
.qslots-warning__choice input:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}
</style>
