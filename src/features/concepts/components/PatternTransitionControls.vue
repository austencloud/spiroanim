<template>
  <fieldset class="pattern-transition-controls" data-role="vtg-transition-controls">
    <legend class="pattern-transition-controls__visually-hidden">45 degree transition</legend>

    <AppTooltip text="Apply the reciprocal 45-degree transition">
      <template #activator="{ props: activatorProps }">
        <button
          v-bind="activatorProps"
          type="button"
          class="pattern-transition-controls__button"
          :class="{ 'pattern-transition-controls__button--active': transition }"
          :aria-pressed="transition"
          data-role="vtg-transition"
          @click="transition = !transition"
        >
          45° Trans'
        </button>
      </template>
    </AppTooltip>

    <AppTooltip text="Choose the beat interval between 45-degree transitions">
      <template #activator="{ props: activatorProps }">
        <label v-bind="activatorProps" class="pattern-transition-controls__beats">
          <span class="pattern-transition-controls__visually-hidden">
            45 degree transition beats
          </span>
          <select
            v-model.number="transitionBeats"
            :disabled="!transition"
            aria-label="Choose the beat interval between 45-degree transitions"
            data-role="vtg-transition-beats"
          >
            <option v-for="option in vtgTransitionBeats" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </label>
      </template>
    </AppTooltip>

    <AppTooltip text="Transition one prop at a time for four total changes">
      <template #activator="{ props: activatorProps }">
        <label v-bind="activatorProps" class="pattern-transition-controls__option">
          <input
            v-model="quad"
            type="checkbox"
            :disabled="!transition"
            aria-label="Transition one prop at a time for four total changes"
            data-role="vtg-transition-quad"
          />
          <span>Quad</span>
        </label>
      </template>
    </AppTooltip>

    <AppTooltip text="Start the 45-degree Quad transition with the second prop">
      <template #activator="{ props: activatorProps }">
        <label v-bind="activatorProps" class="pattern-transition-controls__option">
          <input
            v-model="second"
            type="checkbox"
            :disabled="!transition || !quad"
            aria-label="Start the 45-degree Quad transition with the second prop"
            data-role="vtg-transition-second"
          />
          <span>Second</span>
        </label>
      </template>
    </AppTooltip>
  </fieldset>
</template>

<script setup lang="ts">
import AppTooltip from '@/components/AppTooltip.vue'
import { vtgTransitionBeats } from '@/features/vtg/types'
import type { VtgTransitionBeats } from '@/features/vtg/types'

const transition = defineModel<boolean>('transition', { required: true })
const transitionBeats = defineModel<VtgTransitionBeats>('beats', { required: true })
const quad = defineModel<boolean>('quad', { required: true })
const second = defineModel<boolean>('second', { required: true })
</script>

<style scoped>
.pattern-transition-controls {
  container-type: inline-size;
  box-sizing: border-box;
  display: flex;
  width: min(100%, 45rem);
  min-width: var(--size-concept-content-min-width);
  padding: 0 var(--space-1);
  margin: 0 auto;
  border: 0;
  gap: var(--space-1);
  justify-content: center;
}

.pattern-transition-controls__button,
.pattern-transition-controls select,
.pattern-transition-controls__option span {
  display: grid;
  min-width: 2.75rem;
  padding-block: var(--space-1);
  padding-inline: clamp(var(--space-1), 1.2cqi, var(--space-2));
  color: var(--color-text);
  font: inherit;
  font-size: clamp(0.625rem, 3cqi, 0.875rem);
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  place-items: center;
}

.pattern-transition-controls__button--active,
.pattern-transition-controls select,
.pattern-transition-controls__option input:checked + span {
  color: var(--color-on-action-primary);
  background: var(--color-transition-mode-active);
  border-color: var(--color-transition-mode-active-border);
}

.pattern-transition-controls__button:disabled,
.pattern-transition-controls select:disabled,
.pattern-transition-controls__option input:disabled + span {
  color: var(--color-text-muted);
  cursor: not-allowed;
  background: var(--color-surface);
  border-color: var(--color-border);
  opacity: 0.65;
}

.pattern-transition-controls__option {
  position: relative;
  min-width: 0;
  cursor: pointer;
}

.pattern-transition-controls__option input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.pattern-transition-controls__button:focus-visible,
.pattern-transition-controls select:focus-visible,
.pattern-transition-controls__option input:focus-visible + span {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.pattern-transition-controls__visually-hidden {
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
