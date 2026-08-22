<template>
  <fieldset class="pattern-playback-controls" :data-role="`${concept}-playback-controls`">
    <legend class="pattern-playback-controls__visually-hidden">Starting beat and playback</legend>

    <slot name="before-controls" />

    <AppTooltip text="Use Quarter Spacing relationships">
      <template #activator="{ props: activatorProps }">
        <label v-bind="activatorProps" class="pattern-playback-controls__qtr">
          <input
            v-model="qtr"
            type="checkbox"
            aria-label="Use Quarter Spacing relationships"
            :data-role="`${concept}-qtr`"
          />
          <span>QTR</span>
        </label>
      </template>
    </AppTooltip>

    <AppTooltip v-if="showOrientation" text="Rotate wall plane by the selected angle">
      <template #activator="{ props: activatorProps }">
        <label v-bind="activatorProps" class="pattern-playback-controls__orientation">
          <span class="pattern-playback-controls__visually-hidden">Pattern rotation</span>
          <select
            v-model.number="orientation"
            aria-label="Rotate wall plane by the selected angle"
            :data-role="`${concept}-orientation`"
            :disabled="orientationOptions.length === 1"
          >
            <option v-for="option in orientationOptions" :key="option" :value="option">
              {{ option }}°
            </option>
          </select>
        </label>
      </template>
    </AppTooltip>

    <AppTooltip :text="`Start on beat ${beat}`">
      <template #activator="{ props: activatorProps }">
        <div v-bind="activatorProps" class="pattern-playback-controls__beat-slider">
          <span class="pattern-playback-controls__visually-hidden">Starting beat</span>
          <input
            v-if="sliders"
            v-model.number="beat"
            type="range"
            :min="vtgBeats[0]"
            :max="vtgBeats.at(-1)"
            step="0.5"
            aria-label="Starting beat"
            :aria-valuetext="`Beat ${beat}`"
            :data-role="`${concept}-beat`"
            @pointerdown="emit('sliderStart')"
            @pointerup="emit('sliderEnd')"
            @pointercancel="emit('sliderEnd')"
            @keydown="emit('sliderStart')"
            @keyup="emit('sliderEnd')"
            @blur="emit('sliderEnd')"
          />
          <output v-if="sliders">{{ beat }}</output>
          <ConceptStepper
            v-else
            :model-value="beat"
            label="Starting beat"
            :data-role="`${concept}-beat-stepper`"
            :min="vtgBeats[0]"
            :max="vtgBeats.at(-1) ?? vtgBeats[0]"
            :step="0.5"
            :display-value="String(beat)"
            @update:model-value="updateBeat"
          />
        </div>
      </template>
    </AppTooltip>
  </fieldset>
</template>

<script setup lang="ts">
import AppTooltip from '@/components/AppTooltip.vue'
import { vtgBeats, vtgPatternOrientations } from '@/features/vtg/types'
import type { VtgBeat, VtgPatternOrientation } from '@/features/vtg/types'
import ConceptStepper from '@/features/concepts/components/ConceptStepper.vue'
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'

withDefaults(
  defineProps<{
    concept: 'vtg' | 'qtr'
    showOrientation?: boolean
    orientationOptions?: readonly VtgPatternOrientation[]
  }>(),
  {
    orientationOptions: () => vtgPatternOrientations,
  },
)

const emit = defineEmits<{
  sliderStart: []
  sliderEnd: []
}>()

const beat = defineModel<VtgBeat>('beat', { required: true })
const qtr = defineModel<boolean>('qtr', { required: true })
const orientation = defineModel<VtgPatternOrientation>('orientation', { default: 0 })
const { sliders } = storeToRefs(useConceptsStore())

const updateBeat = (value: number) => {
  if (vtgBeats.includes(value as VtgBeat)) beat.value = value as VtgBeat
}
</script>

<style scoped>
.pattern-playback-controls {
  container-type: inline-size;
  box-sizing: border-box;
  display: flex;
  width: min(100%, 45rem);
  min-width: var(--size-concept-content-min-width);
  padding-block: 0;
  padding-inline: var(--space-concept-control-row-inline);
  margin: 0 auto;
  border: 0;
  gap: var(--space-1);
  justify-content: center;
}

.pattern-playback-controls__qtr {
  position: relative;
  min-width: 0;
  cursor: pointer;
}

.pattern-playback-controls__qtr input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.pattern-playback-controls__qtr > span,
.pattern-playback-controls__orientation select {
  box-sizing: border-box;
  display: grid;
  block-size: var(--size-concept-control-block);
  min-width: 2rem;
  padding-block: var(--space-1);
  padding-inline: var(--space-concept-control-inline);
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-concept-control);
  font-weight: 700;
  white-space: nowrap;
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

.pattern-playback-controls__qtr input:checked + span,
.pattern-playback-controls__orientation select {
  color: var(--color-on-action-primary);
  background: var(--color-pattern-mode-active);
  border-color: var(--color-pattern-mode-active-border);
}

.pattern-playback-controls__orientation select:disabled {
  color: var(--color-text-muted);
  cursor: not-allowed;
  background: var(--color-surface);
  border-color: var(--color-border);
  opacity: 0.65;
}

.pattern-playback-controls__qtr input:focus-visible + span,
.pattern-playback-controls__orientation select:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.pattern-playback-controls__beat-slider {
  display: grid;
  min-width: min(11rem, 42cqi);
  padding-block: var(--space-1);
  padding-inline: var(--space-2);
  gap: var(--space-1);
  color: var(--color-text);
  font-size: var(--font-size-concept-control);
  font-weight: 700;
  grid-template-columns: minmax(4.5rem, 1fr) auto;
  align-items: center;
}

.pattern-playback-controls__beat-slider input {
  width: 100%;
  min-width: 0;
  accent-color: var(--color-action-primary);
  cursor: pointer;
}

.pattern-playback-controls__beat-slider input:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.pattern-playback-controls__beat-slider output {
  min-width: 2em;
  text-align: end;
  white-space: nowrap;
}

.pattern-playback-controls__beat-slider .concept-stepper {
  grid-column: 1 / -1;
  width: 100%;
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
