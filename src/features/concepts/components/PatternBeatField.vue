<template>
  <section class="pattern-beat-field" :data-role="fieldRole">
    <div class="pattern-beat-field__group" role="radiogroup" :aria-label="ariaLabel">
      <label v-for="option in options" :key="option">
        <input
          v-model="selection"
          type="radio"
          :name="inputName"
          :value="option"
          :data-role="`${inputName}-${option}`"
        />
        <span>{{ option }}</span>
      </label>
    </div>
  </section>
</template>

<script setup lang="ts">
import { vtgBeats } from '@/features/vtg/types'
import type { VtgBeat } from '@/features/vtg/types'

const props = defineProps<{ concept: 'vtg' | 'qtr' }>()
const options = vtgBeats
const selection = defineModel<VtgBeat>('selection', { required: true })
const fieldRole = computed(() => `${props.concept}-radio-field`)
const inputName = computed(() => `${props.concept}-selection`)
const ariaLabel = computed(() => `${props.concept.toUpperCase()} starting beat`)
</script>

<style scoped>
.pattern-beat-field__group {
  display: grid;
  width: min(100%, 11rem);
  margin: var(--space-1) auto 0;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  gap: var(--space-1);
}

.pattern-beat-field__group label {
  position: relative;
  cursor: pointer;
}

.pattern-beat-field__group input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.pattern-beat-field__group span {
  display: grid;
  min-width: 2rem;
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

.pattern-beat-field__group input:checked + span {
  color: var(--color-on-action-primary);
  background: var(--color-action-primary);
  border-color: var(--color-action-primary);
}

.pattern-beat-field__group input:focus-visible + span {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}
</style>
