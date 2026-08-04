<template>
  <section class="eight-step-shape-controls" data-role="eight-step-shape-controls">
    <div
      class="eight-step-shape-controls__group"
      role="radiogroup"
      aria-label="Eight Step display mode"
    >
      <label v-for="option in eightStepShapes" :key="option">
        <input
          v-model="shape"
          type="radio"
          name="eight-step-shape"
          :value="option"
          :data-role="`eight-step-shape-${option}`"
        />
        <span>{{ shapeLabels[option] }}</span>
      </label>
    </div>
  </section>
</template>

<script setup lang="ts">
import { eightStepShapes } from '@/features/eight-step/types'
import type { EightStepShape } from '@/features/eight-step/types'

const shape = defineModel<EightStepShape>('shape', { required: true })

const shapeLabels = {
  diamond: 'Diamond',
  box: 'Box',
} as const satisfies Readonly<Record<EightStepShape, string>>
</script>

<style scoped>
.eight-step-shape-controls {
  display: contents;
}

.eight-step-shape-controls__group {
  display: grid;
  grid-auto-columns: max-content;
  grid-auto-flow: column;
  gap: var(--space-1);
  padding: 0;
  margin: 0;
  border: 0;
}

.eight-step-shape-controls__group label {
  position: relative;
  cursor: pointer;
}

.eight-step-shape-controls__group input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.eight-step-shape-controls__group span {
  display: grid;
  padding: var(--space-2);
  color: var(--color-text);
  font-size: 0.875rem;
  font-weight: 700;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  place-items: center;
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.eight-step-shape-controls__group input:checked + span {
  color: var(--color-on-action-primary);
  background: var(--color-action-primary);
  border-color: var(--color-action-primary);
}

.eight-step-shape-controls__group input:focus-visible + span {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}
</style>
