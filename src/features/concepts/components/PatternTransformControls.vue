<template>
  <fieldset class="concept-pattern-options vtg-pattern-options">
    <legend class="concept-controls__visually-hidden">Pattern options</legend>
    <AppTooltip text="Exchange the completed left and right animation tracks">
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
          @click="emit('reset')"
        >
          Reset
        </button>
      </template>
    </AppTooltip>
  </fieldset>
</template>

<script setup lang="ts">
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'
import AppTooltip from '@/components/AppTooltip.vue'

withDefaults(
  defineProps<{
    rolePrefix?: string
    reverseLabel?: string
    reverseDescription?: string
  }>(),
  {
    rolePrefix: 'vtg',
    reverseLabel: '180°',
    reverseDescription: 'Rotate motion plane 180 degrees',
  },
)

const emit = defineEmits<{
  reset: []
}>()

const { swapProps, reversePlane } = storeToRefs(useConceptsStore())
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
  padding: var(--space-2);
  color: var(--color-text);
  font-size: 0.875rem;
  font-weight: 700;
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
</style>
