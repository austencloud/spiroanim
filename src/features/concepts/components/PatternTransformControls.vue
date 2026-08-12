<template>
  <fieldset class="concept-pattern-options vtg-pattern-options">
    <legend class="concept-controls__visually-hidden">Pattern options</legend>
    <label>
      <input v-model="swapProps" type="checkbox" :data-role="`${rolePrefix}-swap`" />
      <span>Swap</span>
    </label>
    <label title="Rotate motion plane 180 degrees">
      <input
        v-model="reversePlane"
        type="checkbox"
        aria-label="Rotate motion plane 180 degrees"
        :data-role="`${rolePrefix}-reverse`"
      />
      <span aria-hidden="true">180°</span>
    </label>
    <button type="button" :data-role="`${rolePrefix}-reset`" @click="emit('reset')">Reset</button>
  </fieldset>
</template>

<script setup lang="ts">
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'

withDefaults(
  defineProps<{
    rolePrefix?: string
  }>(),
  { rolePrefix: 'vtg' },
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

.concept-pattern-options span,
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
