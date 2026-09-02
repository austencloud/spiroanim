<template>
  <span class="concept-stepper" :data-role="dataRole" role="group" :aria-label="label">
    <AppTooltip :text="`Decrease ${label}`">
      <template #activator="{ props: activatorProps }">
        <button
          v-bind="activatorProps"
          type="button"
          :aria-label="`Decrease ${label}`"
          :disabled="disabled || modelValue <= min"
          :data-role="`${dataRole}-decrease`"
          @click="update(-step)"
        >
          <BaseIcon :path="mdiMinus" :size="18" />
        </button>
      </template>
    </AppTooltip>
    <output :aria-label="`${label} value`">{{ displayValue }}</output>
    <AppTooltip :text="`Increase ${label}`">
      <template #activator="{ props: activatorProps }">
        <button
          v-bind="activatorProps"
          type="button"
          :aria-label="`Increase ${label}`"
          :disabled="disabled || modelValue >= max"
          :data-role="`${dataRole}-increase`"
          @click="update(step)"
        >
          <BaseIcon :path="mdiPlus" :size="18" />
        </button>
      </template>
    </AppTooltip>
  </span>
</template>

<script setup lang="ts">
import { mdiMinus, mdiPlus } from '@mdi/js'

import AppTooltip from '@/components/AppTooltip.vue'
import BaseIcon from '@/components/icons/BaseIcon.vue'

const props = defineProps<{
  modelValue: number
  min: number
  max: number
  step: number
  label: string
  dataRole: string
  displayValue?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const update = (delta: number) => {
  const precision = Math.max(0, String(props.step).split('.')[1]?.length ?? 0)
  const value = Math.min(props.max, Math.max(props.min, props.modelValue + delta))
  emit('update:modelValue', Number(value.toFixed(precision)))
}
</script>

<style scoped>
.concept-stepper {
  display: grid;
  min-width: 7.5rem;
  grid-template-columns: auto minmax(2.5rem, 1fr) auto;
  gap: var(--space-1);
  align-items: center;
}

.concept-stepper button,
.concept-stepper output {
  box-sizing: border-box;
  display: grid;
  min-width: var(--size-concept-control-block);
  block-size: var(--size-concept-control-block);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  place-items: center;
}

.concept-stepper button {
  color: var(--color-text);
  padding: 0;
  cursor: pointer;
}

.concept-stepper button:disabled {
  color: var(--color-text-muted);
  cursor: not-allowed;
  opacity: 0.55;
}

.concept-stepper button:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.concept-stepper output {
  color: var(--concept-stepper-value-color, var(--color-text));
  padding-inline: var(--space-2);
  font-weight: 700;
}
</style>
