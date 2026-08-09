<template>
  <fieldset class="pattern-playback-controls" :data-role="`${concept}-playback-controls`">
    <legend class="pattern-playback-controls__visually-hidden">Starting beat and playback</legend>

    <div class="pattern-playback-controls__beats" role="radiogroup" aria-label="Starting beat">
      <label v-for="option in vtgBeats" :key="option">
        <input
          v-model="beat"
          type="radio"
          :name="`${concept}-beat`"
          :value="option"
          :data-role="`${concept}-beat-${option}`"
        />
        <span>{{ option }}</span>
      </label>
    </div>

    <button
      type="button"
      :class="{ 'pattern-playback-controls__double--active': double }"
      :aria-pressed="double"
      :data-role="`${concept}-double`"
      @click="double = !double"
    >
      Double
    </button>
  </fieldset>
</template>

<script setup lang="ts">
import { vtgBeats } from '@/features/vtg/types'
import type { VtgBeat } from '@/features/vtg/types'

defineProps<{ concept: 'vtg' | 'qtr' }>()

const beat = defineModel<VtgBeat>('beat', { required: true })
const double = defineModel<boolean>('double', { required: true })
</script>

<style scoped>
.pattern-playback-controls {
  display: flex;
  width: min(100%, 45rem);
  padding: 0 var(--space-2);
  margin: var(--space-1) auto 0;
  border: 0;
  gap: var(--space-1);
  justify-content: center;
}

.pattern-playback-controls__beats {
  display: grid;
  grid-auto-columns: minmax(2rem, 1fr);
  grid-auto-flow: column;
  gap: var(--space-1);
}

.pattern-playback-controls__beats label {
  position: relative;
  cursor: pointer;
}

.pattern-playback-controls__beats input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.pattern-playback-controls__beats span,
.pattern-playback-controls button {
  display: grid;
  min-width: 2rem;
  height: 100%;
  padding: var(--space-2);
  color: var(--color-text);
  font-family: inherit;
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

.pattern-playback-controls__beats input:checked + span,
.pattern-playback-controls .pattern-playback-controls__double--active {
  color: var(--color-on-action-primary);
  background: var(--color-action-primary);
  border-color: var(--color-action-primary);
}

.pattern-playback-controls__beats input:focus-visible + span,
.pattern-playback-controls button:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.pattern-playback-controls__visually-hidden {
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
