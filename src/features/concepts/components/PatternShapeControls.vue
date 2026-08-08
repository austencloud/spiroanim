<template>
  <section class="pattern-shape-controls" :data-role="`${rolePrefix}-shape-controls`">
    <div class="pattern-shape-controls__group" role="radiogroup" aria-label="Pattern shape">
      <label v-for="option in patternShapes" :key="option">
        <input
          v-model="shape"
          type="radio"
          :name="`${rolePrefix}-shape`"
          :value="option"
          :data-role="`${rolePrefix}-shape-${option}`"
        />
        <span>{{ shapeLabels[option] }}</span>
      </label>
    </div>
  </section>
</template>

<script setup lang="ts">
import { patternShapes } from '@/types/PatternTypes'
import type { PatternShape } from '@/types/PatternTypes'

withDefaults(defineProps<{ rolePrefix?: string }>(), { rolePrefix: 'vtg' })

const shape = defineModel<PatternShape>('shape', { required: true })

const shapeLabels = {
  diamond: 'Diamond',
  box: 'Box',
} as const satisfies Readonly<Record<PatternShape, string>>
</script>

<style scoped>
.pattern-shape-controls {
  display: contents;
}

.pattern-shape-controls__group {
  display: grid;
  grid-auto-columns: max-content;
  grid-auto-flow: column;
  gap: var(--space-1);
  padding: 0;
  margin: 0;
  border: 0;
}

.pattern-shape-controls__group label {
  position: relative;
  cursor: pointer;
}

.pattern-shape-controls__group input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.pattern-shape-controls__group span {
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

.pattern-shape-controls__group input:checked + span {
  color: var(--color-on-action-primary);
  background: var(--color-action-primary);
  border-color: var(--color-action-primary);
}

.pattern-shape-controls__group input:focus-visible + span {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}
</style>
