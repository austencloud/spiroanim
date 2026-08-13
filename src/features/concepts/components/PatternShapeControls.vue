<template>
  <section class="pattern-shape-controls" :data-role="`${rolePrefix}-shape-controls`">
    <div class="pattern-shape-controls__group" role="radiogroup" aria-label="Pattern shape">
      <AppTooltip v-for="option in patternShapes" :key="option" :text="shapeDescriptions[option]">
        <template #activator="{ props: activatorProps }">
          <label v-bind="activatorProps">
            <input
              v-model="shape"
              type="radio"
              :name="`${rolePrefix}-shape`"
              :value="option"
              :aria-label="shapeDescriptions[option]"
              :data-role="`${rolePrefix}-shape-${option}`"
            />
            <span>{{ shapeLabels[option] }}</span>
          </label>
        </template>
      </AppTooltip>
    </div>
  </section>
</template>

<script setup lang="ts">
import AppTooltip from '@/components/AppTooltip.vue'
import { patternShapes } from '@/types/PatternTypes'
import type { PatternShape } from '@/types/PatternTypes'

withDefaults(defineProps<{ rolePrefix?: string }>(), { rolePrefix: 'vtg' })

const shape = defineModel<PatternShape>('shape', { required: true })

const shapeLabels = {
  diamond: 'Diamond',
  box: 'Box',
} as const satisfies Readonly<Record<PatternShape, string>>

const shapeDescriptions = {
  diamond: 'Use the Diamond pattern orientation',
  box: 'Use the Box pattern orientation',
} as const satisfies Readonly<Record<PatternShape, string>>
</script>

<style scoped>
.pattern-shape-controls {
  display: contents;
}

.pattern-shape-controls__group {
  display: contents;
}

.pattern-shape-controls__group label {
  position: relative;
  min-width: 0;
  cursor: pointer;
}

.pattern-shape-controls__group input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.pattern-shape-controls__group label > span {
  display: grid;
  padding-block: var(--space-1);
  padding-inline: clamp(var(--space-1), 1.2cqi, var(--space-2));
  color: var(--color-text);
  font-size: clamp(0.625rem, 3cqi, 0.875rem);
  font-weight: 700;
  white-space: nowrap;
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
  background: var(--color-pattern-mode-active);
  border-color: var(--color-pattern-mode-active-border);
}

.pattern-shape-controls__group input:focus-visible + span {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}
</style>
