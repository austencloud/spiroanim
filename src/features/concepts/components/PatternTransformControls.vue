<template>
  <fieldset class="concept-pattern-options vtg-pattern-options">
    <legend class="concept-controls__visually-hidden">Pattern options</legend>
    <AppTooltip v-if="showMore" text="Choose separate timing ratios for each prop">
      <template #activator="{ props: activatorProps }">
        <label v-bind="activatorProps">
          <input
            v-model="more"
            type="checkbox"
            aria-label="Choose separate timing ratios for each prop"
            :data-role="`${rolePrefix}-more`"
          />
          <span>More</span>
        </label>
      </template>
    </AppTooltip>
    <AppTooltip v-if="showClassic" text="Use the classic transposed pattern table layout">
      <template #activator="{ props: activatorProps }">
        <label v-bind="activatorProps">
          <input
            v-model="classic"
            type="checkbox"
            aria-label="Use the classic pattern table layout"
            :data-role="`${rolePrefix}-classic`"
          />
          <span>Classic</span>
        </label>
      </template>
    </AppTooltip>
    <AppTooltip v-if="showElemental" text="Show pattern relationships as the Four Elements">
      <template #activator="{ props: activatorProps }">
        <label v-bind="activatorProps">
          <input
            v-model="elemental"
            type="checkbox"
            aria-label="Show pattern relationships as the Four Elements"
            :data-role="`${rolePrefix}-elemental`"
          />
          <span>Elemental</span>
        </label>
      </template>
    </AppTooltip>
    <AppTooltip v-if="showSwap" text="Exchange the completed left and right animation tracks">
      <template #activator="{ props: activatorProps }">
        <label v-bind="activatorProps">
          <input
            v-model="swapProps"
            type="checkbox"
            aria-label="Exchange the completed left and right animation tracks"
            :data-role="`${rolePrefix}-swap`"
          />
          <span>Swap</span>
        </label>
      </template>
    </AppTooltip>
    <AppTooltip :text="reverseDescription">
      <template #activator="{ props: activatorProps }">
        <label v-bind="activatorProps">
          <input
            v-model="reversePlane"
            type="checkbox"
            :aria-label="reverseDescription"
            :data-role="`${rolePrefix}-reverse`"
          />
          <span aria-hidden="true">{{ reverseLabel }}</span>
        </label>
      </template>
    </AppTooltip>
    <AppTooltip text="Reset the pattern and its controls">
      <template #activator="{ props: activatorProps }">
        <button
          v-bind="activatorProps"
          type="button"
          :data-role="`${rolePrefix}-reset`"
          @click="requestReset"
        >
          Reset
        </button>
      </template>
    </AppTooltip>
  </fieldset>

  <BaseDialog
    v-if="confirmationOpen"
    v-model="confirmationOpen"
    class="pattern-reset-dialog"
    title="Reset pattern?"
    close-label="Close reset confirmation"
  >
    <p class="pattern-reset-dialog__message">
      <strong>Are you sure?</strong> This restores the current pattern and its controls to their
      defaults.
    </p>
    <div class="pattern-reset-dialog__actions">
      <button type="button" @click="confirmationOpen = false">Cancel</button>
      <button type="button" class="pattern-reset-dialog__confirm" @click="performReset">
        Reset
      </button>
    </div>
  </BaseDialog>
</template>

<script setup lang="ts">
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'
import AppTooltip from '@/components/AppTooltip.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'

const props = withDefaults(
  defineProps<{
    rolePrefix?: string
    reverseLabel?: string
    reverseDescription?: string
    confirmReset?: boolean
    showSwap?: boolean
    showMore?: boolean
    showClassic?: boolean
    showElemental?: boolean
  }>(),
  {
    rolePrefix: 'vtg',
    reverseLabel: '180°',
    reverseDescription: 'Rotate floor plane by 180 degrees',
    confirmReset: false,
    showSwap: true,
    showMore: false,
    showClassic: false,
    showElemental: false,
  },
)

const emit = defineEmits<{
  reset: []
}>()

const more = defineModel<boolean>('more', { default: false })
const classic = defineModel<boolean>('classic', { default: false })
const elemental = defineModel<boolean>('elemental', { default: false })

const { swapProps, reversePlane } = storeToRefs(useConceptsStore())
const confirmationOpen = ref(false)

function requestReset() {
  if (props.confirmReset) {
    confirmationOpen.value = true
    return
  }

  emit('reset')
}

function performReset() {
  confirmationOpen.value = false
  emit('reset')
}
</script>

<style scoped>
.concept-pattern-options {
  display: grid;
  grid-auto-columns: max-content;
  grid-auto-flow: column;
  padding: 0;
  margin: 0;
  border: 0;
  gap: var(--space-1);
}

.concept-pattern-options label {
  position: relative;
  cursor: pointer;
}

.concept-pattern-options input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.concept-pattern-options label > span,
.concept-pattern-options button {
  display: grid;
  padding-block: var(--space-1);
  padding-inline: var(--space-concept-control-inline);
  color: var(--color-text);
  font-size: var(--font-size-concept-control);
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  place-items: center;
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.concept-pattern-options button {
  font-family: inherit;
}

.concept-pattern-options input:checked + span {
  color: var(--color-on-action-primary);
  background: var(--color-action-primary);
  border-color: var(--color-action-primary);
}

.concept-pattern-options input:focus-visible + span,
.concept-pattern-options button:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.concept-controls__visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  white-space: nowrap;
  border: 0;
  clip-path: inset(50%);
}

:deep(.pattern-reset-dialog .base-dialog__body) {
  display: grid;
  gap: var(--space-6);
}

.pattern-reset-dialog__message {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.55;
}

.pattern-reset-dialog__message strong {
  color: var(--color-text);
}

.pattern-reset-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: flex-end;
}

.pattern-reset-dialog__actions button {
  min-height: 2.75rem;
  padding-inline: var(--space-4);
  color: var(--color-text);
  font: inherit;
  font-weight: 750;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.pattern-reset-dialog__actions .pattern-reset-dialog__confirm {
  color: var(--color-on-action-primary);
  background: var(--color-status-warning);
  border-color: var(--color-status-warning);
}

.pattern-reset-dialog__actions button:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}
</style>
