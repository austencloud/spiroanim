<template>
  <component :is="tag" class="quick-slot-visual" :type="tag === 'button' ? 'button' : undefined">
    <slot />
  </component>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    tag?: 'button' | 'span'
  }>(),
  { tag: 'button' },
)
</script>

<style scoped>
.quick-slot-visual {
  --quick-slot-accent: color-mix(
    in srgb,
    var(--color-action-primary) 68%,
    var(--color-status-success)
  );
  --quick-slot-surface: color-mix(in srgb, var(--quick-slot-accent) 9%, var(--color-surface));

  box-sizing: border-box;
  display: grid;
  min-width: 2rem;
  min-height: 2rem;
  padding: var(--space-1);
  font: inherit;
  color: var(--quick-slot-accent);
  font-size: 0.76rem;
  font-weight: 400;
  white-space: nowrap;
  cursor: pointer;
  background: var(--quick-slot-surface);
  border: 1px solid color-mix(in srgb, var(--quick-slot-accent) 48%, var(--color-border));
  border-radius: var(--radius-lg);
  place-items: center;
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast),
    opacity var(--transition-fast);
}

button.quick-slot-visual:hover:not(:disabled) {
  background: color-mix(in srgb, var(--quick-slot-accent) 17%, var(--color-surface));
}

button.quick-slot-visual:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

button.quick-slot-visual:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
