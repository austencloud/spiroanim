<template>
  <fieldset class="concept-slider-controls vtg-slider-controls">
    <legend class="concept-controls__visually-hidden">Animation settings</legend>
    <label>
      <span class="concept-slider-controls__label vtg-slider-controls__label">
        <span>Scale</span>
        <output>{{ scale.toFixed(1) }}</output>
      </span>
      <input
        v-model.number="scale"
        type="range"
        :min="vtgScaleControl.min"
        :max="vtgScaleControl.max"
        :step="vtgScaleControl.step"
        :data-role="`${rolePrefix}-scale`"
        @pointerdown="beginSliderHistory"
        @pointerup="endSliderHistory"
        @pointercancel="endSliderHistory"
        @keydown="beginSliderHistory"
        @keyup="endSliderHistory"
        @blur="endSliderHistory"
      />
    </label>
    <label>
      <span class="concept-slider-controls__label vtg-slider-controls__label">
        <span>Thick</span>
        <output>{{ thick }}</output>
      </span>
      <input
        v-model.number="thick"
        type="range"
        :min="vtgThickControl.min"
        :max="vtgThickControl.max"
        :step="vtgThickControl.step"
        :data-role="`${rolePrefix}-thick`"
        @pointerdown="beginSliderHistory"
        @pointerup="endSliderHistory"
        @pointercancel="endSliderHistory"
        @keydown="beginSliderHistory"
        @keyup="endSliderHistory"
        @blur="endSliderHistory"
      />
    </label>
    <label>
      <span class="concept-slider-controls__label vtg-slider-controls__label">
        <span>BPM</span>
        <output>{{ bpm }}</output>
      </span>
      <input
        v-model.number="bpm"
        type="range"
        :min="vtgBpmControl.min"
        :max="vtgBpmControl.max"
        :step="vtgBpmControl.step"
        :data-role="`${rolePrefix}-bpm`"
        @pointerdown="beginSliderHistory"
        @pointerup="endSliderHistory"
        @pointercancel="endSliderHistory"
        @keydown="beginSliderHistory"
        @keyup="endSliderHistory"
        @blur="endSliderHistory"
      />
    </label>
  </fieldset>

  <fieldset
    class="concept-pattern-options concept-render-options vtg-pattern-options vtg-render-options"
  >
    <legend class="concept-controls__visually-hidden">Rendered features</legend>
    <label>
      <input v-model="paths" type="checkbox" :data-role="`${rolePrefix}-paths`" />
      <span>Paths</span>
    </label>
    <label>
      <input v-model="hands" type="checkbox" :data-role="`${rolePrefix}-hands`" />
      <span>Hands</span>
    </label>
    <label>
      <input v-model="arms" type="checkbox" :data-role="`${rolePrefix}-arms`" />
      <span>Arms</span>
    </label>
    <slot name="after-controls" />
  </fieldset>
</template>

<script setup lang="ts">
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'
import {
  vtgBpmControl,
  vtgScaleControl,
  vtgThickControl,
} from '@/features/vtg/data/vtgPlayerSettings'
import { useQSMainStore } from '@/stores/useQSMainStore'
import type { RootDataFinal } from '@/types/AnimTypes'

const props = withDefaults(
  defineProps<{
    animation?: RootDataFinal
    rolePrefix?: string
  }>(),
  { rolePrefix: 'vtg' },
)

const { bpm, scale, thick, paths, hands, arms } = storeToRefs(useConceptsStore())
const { beginHistoryGroup, endHistoryGroup } = useQSMainStore()
let sliderHistoryActive = false

const beginSliderHistory = () => {
  if (sliderHistoryActive || props.animation === undefined) return

  beginHistoryGroup(props.animation)
  sliderHistoryActive = true
}

const endSliderHistory = () => {
  if (!sliderHistoryActive) return

  sliderHistoryActive = false
  endHistoryGroup()
}

onBeforeUnmount(endSliderHistory)
</script>

<style scoped>
.concept-slider-controls {
  display: flex;
  width: min(100%, 45rem);
  padding: var(--space-1) var(--space-2) 0;
  margin: 0 auto;
  border: 0;
  flex-wrap: wrap;
  column-gap: var(--space-4);
  row-gap: var(--space-1);
}

.concept-slider-controls label {
  display: grid;
  flex: 1 1 9rem;
  min-width: 9rem;
  gap: 0;
}

.concept-slider-controls__label {
  display: flex;
  color: var(--color-text);
  font-size: 0.8125rem;
  font-weight: 700;
  justify-content: space-between;
}

.concept-slider-controls output {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.concept-slider-controls input {
  width: 100%;
  margin-block: 0;
  cursor: pointer;
  accent-color: var(--color-action-primary);
}

.concept-slider-controls input:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.concept-pattern-options {
  display: grid;
  grid-auto-columns: max-content;
  grid-auto-flow: column;
  padding: 0;
  margin: 0;
  border: 0;
  gap: var(--space-1);
}

.concept-pattern-options label {
  position: relative;
  cursor: pointer;
}

.concept-pattern-options input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.concept-pattern-options span {
  display: grid;
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

.concept-pattern-options input:checked + span {
  color: var(--color-on-action-primary);
  background: var(--color-action-primary);
  border-color: var(--color-action-primary);
}

.concept-pattern-options input:focus-visible + span {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.concept-render-options {
  width: min(100%, 45rem);
  margin: var(--space-1) auto 0;
  justify-content: center;
}

.concept-controls__visually-hidden {
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
