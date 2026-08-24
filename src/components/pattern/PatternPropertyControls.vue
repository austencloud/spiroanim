<template>
  <details
    class="pattern-property-controls"
    :data-role="`${context}-properties`"
    :data-context="context"
  >
    <summary :data-role="`${context}-properties-toggle`">PROPERTIES...</summary>
    <div class="pattern-property-controls__content">
      <div v-for="property in visibleProperties" :key="property.key">
        <button
          :id="`${controlId}-${property.key}-toggle`"
          class="pattern-property-controls__toggle"
          type="button"
          :aria-expanded="activeProperty === property.key"
          :aria-controls="`${controlId}-${property.key}-controls`"
          :data-role="`${context}-property-${property.key}-toggle`"
          @click="toggleProperty(property.key)"
        >
          {{ property.label }}
        </button>
        <div
          v-show="activeProperty === property.key"
          :id="`${controlId}-${property.key}-controls`"
          class="pattern-property-controls__panel"
          role="region"
          :aria-labelledby="`${controlId}-${property.key}-toggle`"
          :data-role="`${context}-property-${property.key}-controls`"
        >
          <p>{{ property.name }} controls will go here.</p>
        </div>
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
import { useId } from 'vue'

type PatternPropertyContext = 'vtg' | 'builder'
type PatternPropertyKey = 'axis' | 'twist' | 'turns'

const props = withDefaults(
  defineProps<{
    context: PatternPropertyContext
    showTurns?: boolean
  }>(),
  { showTurns: false },
)

const properties = [
  { key: 'axis', name: 'Axis', label: 'Axis' },
  { key: 'twist', name: 'Twist', label: 'Twist - For Roll-Sensitive Props' },
  { key: 'turns', name: 'Turns', label: 'Turns' },
] as const satisfies readonly { key: PatternPropertyKey; name: string; label: string }[]

const controlId = `pattern-properties-${useId()}`
const activeProperty = ref<PatternPropertyKey>()
const visibleProperties = computed(() =>
  properties.filter((property) => property.key !== 'turns' || props.showTurns),
)

const toggleProperty = (property: PatternPropertyKey) => {
  activeProperty.value = activeProperty.value === property ? undefined : property
}
</script>

<style scoped>
.pattern-property-controls {
  box-sizing: border-box;
  width: min(calc(100% - var(--space-2)), 45rem);
  min-width: var(--size-concept-content-min-width);
  margin: var(--space-1) auto 0;
  overflow: hidden;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.pattern-property-controls > summary {
  display: flex;
  padding: var(--space-2) var(--space-3);
  color: var(--color-action-primary);
  font-size: 0.8125rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  cursor: pointer;
  list-style: none;
  background: color-mix(in srgb, var(--color-action-primary) 7%, var(--color-surface));
  align-items: center;
  justify-content: space-between;
  transition: background var(--transition-fast);
}

.pattern-property-controls > summary::-webkit-details-marker {
  display: none;
}

.pattern-property-controls > summary::after {
  content: '+';
  font-size: 1rem;
}

.pattern-property-controls[open] > summary::after {
  content: '-';
}

.pattern-property-controls[open] > summary {
  background: color-mix(in srgb, var(--color-action-primary) 13%, var(--color-surface));
  border-block-end: 1px solid var(--color-border);
}

.pattern-property-controls > summary:hover {
  background: color-mix(in srgb, var(--color-action-primary) 13%, var(--color-surface));
}

.pattern-property-controls > summary:focus-visible,
.pattern-property-controls__toggle:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: -2px;
}

.pattern-property-controls__content {
  display: grid;
  padding: var(--space-2);
  gap: var(--space-1);
}

.pattern-property-controls__toggle {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  color: var(--color-text);
  font-size: 0.875rem;
  font-weight: 700;
  text-align: start;
  cursor: pointer;
  background: color-mix(in srgb, var(--color-surface) 92%, var(--color-action-primary));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.pattern-property-controls__toggle[aria-expanded='true'] {
  color: var(--color-action-primary);
  background: color-mix(in srgb, var(--color-action-primary) 10%, var(--color-surface));
  border-end-start-radius: 0;
  border-end-end-radius: 0;
}

.pattern-property-controls__panel {
  padding: var(--space-2) var(--space-3);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-block-start: 0;
  border-end-start-radius: var(--radius-sm);
  border-end-end-radius: var(--radius-sm);
}

.pattern-property-controls__panel p {
  margin: 0;
}
</style>
