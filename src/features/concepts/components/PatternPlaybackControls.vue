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

    <div class="pattern-playback-controls__beats" role="radiogroup" aria-label="Starting beat">
      <AppTooltip v-for="option in vtgBeats" :key="option" :text="`Start on beat ${option}`">
        <template #activator="{ props: activatorProps }">
          <label v-bind="activatorProps">
            <input
              v-model="beat"
              type="radio"
              :name="`${concept}-beat`"
              :value="option"
              :aria-label="`Start on beat ${option}`"
              :data-role="`${concept}-beat-${option}`"
            />
            <span>{{ option }}</span>
          </label>
        </template>
      </AppTooltip>
    </div>

    <AppTooltip v-if="showOrientation" text="Rotate wall plane by the selected angle">
      <template #activator="{ props: activatorProps }">
        <label v-bind="activatorProps" class="pattern-playback-controls__orientation">
          <span class="pattern-playback-controls__visually-hidden">Pattern rotation</span>
          <select
            v-model.number="orientation"
            aria-label="Rotate wall plane by the selected angle"
            :data-role="`${concept}-orientation`"
          >
            <option v-for="option in vtgPatternOrientations" :key="option" :value="option">
              {{ option }}°
            </option>
          </select>
        </label>
      </template>
    </AppTooltip>
  </fieldset>
</template>

<script setup lang="ts">
import AppTooltip from '@/components/AppTooltip.vue'
import { vtgBeats, vtgPatternOrientations } from '@/features/vtg/types'
import type { VtgBeat, VtgPatternOrientation } from '@/features/vtg/types'

defineProps<{ concept: 'vtg' | 'qtr'; showOrientation?: boolean }>()

const beat = defineModel<VtgBeat>('beat', { required: true })
const qtr = defineModel<boolean>('qtr', { required: true })
const orientation = defineModel<VtgPatternOrientation>('orientation', { default: 0 })
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

.pattern-playback-controls__beats {
  display: grid;
  grid-auto-columns: minmax(2rem, 1fr);
  grid-auto-flow: column;
  gap: var(--space-1);
}

.pattern-playback-controls__beats label,
.pattern-playback-controls__qtr {
  position: relative;
  min-width: 0;
  cursor: pointer;
}

.pattern-playback-controls__beats input,
.pattern-playback-controls__qtr input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.pattern-playback-controls__beats label > span,
.pattern-playback-controls__qtr > span,
.pattern-playback-controls__orientation select {
  display: grid;
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

.pattern-playback-controls__beats input:checked + span {
  color: var(--color-on-action-primary);
  background: var(--color-action-primary);
  border-color: var(--color-action-primary);
}

.pattern-playback-controls__qtr input:checked + span,
.pattern-playback-controls__orientation select {
  color: var(--color-on-action-primary);
  background: var(--color-pattern-mode-active);
  border-color: var(--color-pattern-mode-active-border);
}

.pattern-playback-controls__orientation select {
  block-size: calc(1.2em + 2 * var(--space-1) + 2px);
}

.pattern-playback-controls__beats input:focus-visible + span,
.pattern-playback-controls__qtr input:focus-visible + span,
.pattern-playback-controls__orientation select:focus-visible {
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
