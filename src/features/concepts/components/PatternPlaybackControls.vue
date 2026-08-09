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
      v-if="showDouble"
      type="button"
      :class="{ 'pattern-playback-controls__button--active': double }"
      :aria-pressed="double"
      :data-role="`${concept}-double`"
      @click="toggleDouble"
    >
      Double
    </button>

    <button
      v-if="transitionAvailable"
      type="button"
      :class="{ 'pattern-playback-controls__button--active': transition }"
      :aria-pressed="transition"
      :data-role="`${concept}-transition`"
      @click="toggleTransition"
    >
      {{ concept === 'vtg' ? "QTR Trans'" : "VTG Trans'" }}
    </button>
  </fieldset>
</template>

<script setup lang="ts">
import { vtgBeats } from '@/features/vtg/types'
import type { VtgBeat } from '@/features/vtg/types'

withDefaults(
  defineProps<{
    concept: 'vtg' | 'qtr'
    showDouble?: boolean
    transitionAvailable?: boolean
  }>(),
  {
    showDouble: false,
    transitionAvailable: true,
  },
)

const beat = defineModel<VtgBeat>('beat', { required: true })
const double = defineModel<boolean>('double', { required: true })
const transition = defineModel<boolean>('transition', { required: true })

const toggleDouble = () => {
  const nextDouble = !double.value
  double.value = nextDouble
  if (!nextDouble) transition.value = false
}

const toggleTransition = () => {
  const nextTransition = !transition.value
  transition.value = nextTransition
  double.value = nextTransition
}
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
.pattern-playback-controls .pattern-playback-controls__button--active {
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
