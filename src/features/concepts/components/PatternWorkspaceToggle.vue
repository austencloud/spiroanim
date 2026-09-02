<template>
  <label
    class="pattern-workspace-toggle"
    :class="{
      'pattern-workspace-toggle--grouped': grouped,
      'pattern-workspace-toggle--advanced': variant === 'advanced',
    }"
  >
    <input
      type="checkbox"
      :checked="checked"
      :disabled="disabled"
      :data-role="controlRole"
      @click.prevent="requestToggle"
    />
    <span>{{ label }}</span>
  </label>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    checked?: boolean
    disabled?: boolean
    grouped?: boolean
    controlRole?: string
    variant?: 'default' | 'advanced'
  }>(),
  {
    checked: false,
    disabled: false,
    grouped: false,
    variant: 'default',
  },
)

const emit = defineEmits<{ toggle: [] }>()
const requestToggle = () => {
  if (!props.disabled) emit('toggle')
}
</script>

<style scoped>
.pattern-workspace-toggle {
  display: flex;
  width: max-content;
  margin: var(--space-2) auto 0;
  cursor: pointer;
}

.pattern-workspace-toggle--grouped {
  width: max-content;
  margin: 0;
  flex: 0 0 auto;
}

.pattern-workspace-toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.pattern-workspace-toggle span {
  position: relative;
  display: flex;
  min-width: 10.5rem;
  min-height: 2.75rem;
  padding: var(--space-2) var(--space-4);
  overflow: hidden;
  color: var(--color-text);
  font: inherit;
  font-size: clamp(0.875rem, 3cqi, 1rem);
  font-weight: 800;
  letter-spacing: 0.055em;
  background:
    linear-gradient(
      115deg,
      color-mix(in srgb, var(--color-action-primary) 16%, transparent),
      transparent 42%
    ),
    var(--color-surface);
  border: 2px solid color-mix(in srgb, var(--color-action-primary) 52%, var(--color-border));
  border-radius: var(--radius-md);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--color-text) 12%, transparent),
    var(--shadow-sm);
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  text-transform: uppercase;
}

.pattern-workspace-toggle--grouped span {
  box-sizing: border-box;
  width: max-content;
  min-width: 0;
  padding-inline: clamp(var(--space-2), 4cqi, var(--space-4));
  white-space: nowrap;
}

.pattern-workspace-toggle--advanced span {
  padding-inline: var(--space-3);
  background:
    linear-gradient(
      245deg,
      color-mix(in srgb, var(--color-action-primary) 16%, transparent),
      transparent 42%
    ),
    var(--color-surface);
}

.pattern-workspace-toggle span::before {
  flex: 0 0 0.75rem;
  width: 0.75rem;
  height: 0.75rem;
  content: '';
  border: 2px solid var(--color-action-primary);
  border-radius: 2px;
  box-shadow: inset 0 0 0 2px var(--color-surface);
  transform: rotate(45deg);
}

.pattern-workspace-toggle:hover span {
  color: var(--color-action-primary);
  border-color: var(--color-action-primary);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--color-text) 16%, transparent),
    0 0 0 1px color-mix(in srgb, var(--color-action-primary) 25%, transparent),
    var(--shadow-sm);
}

.pattern-workspace-toggle input:checked + span {
  color: var(--color-on-action-primary);
  background: var(--color-action-primary);
  border-color: var(--color-action-primary);
}

.pattern-workspace-toggle input:checked + span::before {
  background: var(--color-on-action-primary);
  border-color: var(--color-on-action-primary);
  box-shadow: inset 0 0 0 2px var(--color-action-primary);
}

.pattern-workspace-toggle input:focus-visible + span {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.pattern-workspace-toggle:has(input:disabled) {
  cursor: not-allowed;
  opacity: 0.55;
}
</style>
