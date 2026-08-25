<template>
  <details
    class="pattern-property-controls"
    :open="propertiesExpanded"
    :data-role="`${context}-properties`"
    :data-context="context"
    @toggle="emitPropertiesExpanded"
  >
    <summary :data-role="`${context}-properties-toggle`">PROPERTIES...</summary>
    <div class="pattern-property-controls__content">
      <div v-for="property in visibleProperties" :key="property.key">
        <button
          :id="`${controlId}-${property.key}-toggle`"
          class="pattern-property-controls__toggle"
          type="button"
          :aria-expanded="activeProperty === property.key"
          :aria-controls="`${controlId}-${property.key}-controls`"
          :data-role="`${context}-property-${property.key}-toggle`"
          @click="toggleProperty(property.key)"
        >
          {{ propertyLabel(property) }}
        </button>
        <div
          v-show="activeProperty === property.key"
          :id="`${controlId}-${property.key}-controls`"
          class="pattern-property-controls__panel"
          role="region"
          :aria-labelledby="`${controlId}-${property.key}-toggle`"
          :data-role="`${context}-property-${property.key}-controls`"
        >
          <template v-if="property.key === 'axis'">
            <div class="pattern-property-controls__fold-options">
              <fieldset class="pattern-property-controls__option-group">
                <legend class="pattern-property-controls__visually-hidden">Folds detail</legend>
                <label v-for="mode in foldModes" :key="mode">
                  <input
                    type="radio"
                    :name="`${controlId}-fold-mode`"
                    :checked="foldMode === mode"
                    @change="emit('update:foldMode', mode)"
                  />
                  <span>{{ mode === 'simple' ? 'Simple' : 'Advanced' }}</span>
                </label>
              </fieldset>
              <fieldset
                v-if="foldMode === 'simple'"
                class="pattern-property-controls__option-group"
              >
                <legend class="pattern-property-controls__visually-hidden">Fold span</legend>
                <label v-for="span in foldSpans" :key="span">
                  <input
                    type="radio"
                    :name="`${controlId}-fold-span`"
                    :checked="foldSpan === span"
                    @change="emit('update:foldSpan', span)"
                  />
                  <span>{{ span === 'quarter' ? 'Quarter' : 'Eighth' }}</span>
                </label>
              </fieldset>
            </div>
            <div class="pattern-property-controls__twist-columns">
              <section
                v-for="(column, propIndex) in foldColumns"
                :key="column.label"
                class="pattern-property-controls__twist-column"
                :aria-label="`${column.label} Folds`"
              >
                <header class="pattern-property-controls__twist-header">
                  <span>Beat</span>
                  <h3>{{ column.label }}</h3>
                  <span>Value</span>
                </header>
                <div v-if="foldMode === 'simple'" class="pattern-property-controls__fold-schedule">
                  <fieldset class="pattern-property-controls__option-group">
                    <legend class="pattern-property-controls__visually-hidden">
                      {{ column.label }} folds repetition
                    </legend>
                    <label>
                      <input
                        type="checkbox"
                        :checked="foldRepeat[propIndex]"
                        @change="emitFoldRepeat(propIndex, $event)"
                      />
                      <span>Repeat</span>
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        :checked="foldAlternate[propIndex]"
                        :disabled="!foldRepeat[propIndex]"
                        @change="emitFoldAlternate(propIndex, $event)"
                      />
                      <span>Alternate</span>
                    </label>
                  </fieldset>
                  <div class="pattern-property-controls__fold-timing">
                    <label class="pattern-property-controls__select">
                      <span>{{ foldRepeat[propIndex] ? 'Start' : 'Beat' }}</span>
                      <select
                        :value="foldBeat[propIndex]"
                        :aria-label="`${column.label} folds ${foldRepeat[propIndex] ? 'start' : 'beat'}`"
                        @change="emitFoldBeat(propIndex, $event)"
                      >
                        <option v-for="beat in foldBeatOptions" :key="beat" :value="beat">
                          {{ formatBeat(beat) }}
                        </option>
                      </select>
                    </label>
                    <label v-if="foldRepeat[propIndex]" class="pattern-property-controls__select">
                      <span>Every</span>
                      <select
                        :value="foldEvery[propIndex]"
                        :aria-label="`${column.label} repeat folds every`"
                        @change="emitFoldEvery(propIndex, $event)"
                      >
                        <option v-for="beat in foldEveryOptions" :key="beat" :value="beat">
                          {{ formatBeat(beat) }}
                        </option>
                      </select>
                    </label>
                  </div>
                </div>
                <div
                  v-for="frame in column.frames"
                  :key="frame.index"
                  class="pattern-property-controls__fold-frame"
                >
                  <span class="pattern-property-controls__beat">{{ formatBeat(frame.beat) }}</span>
                  <div class="pattern-property-controls__fold-controls">
                    <label
                      v-for="fold in folds"
                      :key="fold.key"
                      class="pattern-property-controls__fold-control"
                      :class="{
                        'pattern-property-controls__twist-frame--inherited':
                          frame.values[fold.key] === undefined,
                        'pattern-property-controls__fold-control--stepper': !sliders,
                      }"
                    >
                      <span>{{ fold.label }}</span>
                      <input
                        v-if="sliders"
                        type="range"
                        :min="fold.min"
                        :max="fold.max"
                        step="45"
                        :value="frame.values[fold.key] ?? fold.default"
                        :aria-label="`${column.label} ${fold.label} at beat ${formatBeat(frame.beat)}`"
                        @input="setFold(propIndex, frame.beat, fold.key, $event)"
                      />
                      <ConceptStepper
                        v-else
                        :model-value="frame.values[fold.key] ?? fold.default"
                        :label="`${column.label} ${fold.label} at beat ${formatBeat(frame.beat)}`"
                        :data-role="`${context}-${fold.key}-${propIndex}-${frame.index}-stepper`"
                        :min="fold.min"
                        :max="fold.max"
                        :step="45"
                        :display-value="`${frame.values[fold.key] ?? fold.default}°`"
                        @update:model-value="emitFoldValue(propIndex, frame.beat, fold.key, $event)"
                      />
                      <output v-if="sliders">{{ frame.values[fold.key] ?? fold.default }}°</output>
                      <button
                        type="button"
                        class="pattern-property-controls__delete"
                        :disabled="frame.values[fold.key] === undefined"
                        :aria-label="`Clear ${column.label} ${fold.label} at beat ${formatBeat(frame.beat)}`"
                        @click="clearFold(propIndex, frame.beat, fold.key)"
                      >
                        <BaseIcon :path="mdiTrashCanOutline" :size="18" />
                      </button>
                    </label>
                  </div>
                </div>
              </section>
            </div>
          </template>
          <template v-else-if="property.key === 'twist'">
            <fieldset
              class="pattern-property-controls__option-group pattern-property-controls__twist-mode"
            >
              <legend class="pattern-property-controls__visually-hidden">Twist detail</legend>
              <label v-for="mode in twistModes" :key="mode">
                <input
                  type="radio"
                  :name="`${controlId}-twist-mode`"
                  :value="mode"
                  :checked="twistMode === mode"
                  @change="emit('update:twistMode', mode)"
                />
                <span>{{ mode === 'simple' ? 'Simple' : 'Advanced' }}</span>
              </label>
            </fieldset>
            <div class="pattern-property-controls__twist-columns">
              <section
                v-for="(column, propIndex) in twistColumns"
                :key="column.label"
                class="pattern-property-controls__twist-column"
                :aria-label="`${column.label} Twist`"
              >
                <header class="pattern-property-controls__twist-header">
                  <span>Beat</span>
                  <h3>{{ column.label }}</h3>
                  <span>Value</span>
                </header>
                <label
                  v-for="frame in column.frames"
                  :key="frame.index"
                  class="pattern-property-controls__twist-frame"
                  :class="{
                    'pattern-property-controls__twist-frame--inherited': !frame.isSet,
                    'pattern-property-controls__twist-frame--stepper': !sliders,
                  }"
                >
                  <span class="pattern-property-controls__beat">{{ formatBeat(frame.beat) }}</span>
                  <input
                    v-if="sliders"
                    type="range"
                    min="-360"
                    max="360"
                    step="45"
                    :value="frame.value"
                    :aria-label="`${column.label} Twist at beat ${formatBeat(frame.beat)}`"
                    :data-role="`${context}-twist-${propIndex}-${frame.index}`"
                    @input="setTwist(propIndex, frame.index, $event)"
                  />
                  <ConceptStepper
                    v-else
                    :model-value="frame.value"
                    :label="`${column.label} Twist at beat ${formatBeat(frame.beat)}`"
                    :data-role="`${context}-twist-${propIndex}-${frame.index}-stepper`"
                    :min="-360"
                    :max="360"
                    :step="45"
                    :display-value="`${frame.value}°`"
                    @update:model-value="emitTwistValue(propIndex, frame.beat, $event)"
                  />
                  <output v-if="sliders">{{ frame.value }}°</output>
                  <button
                    type="button"
                    class="pattern-property-controls__delete"
                    :disabled="!frame.isSet"
                    :aria-label="`Clear ${column.label} Twist at beat ${formatBeat(frame.beat)}`"
                    @click="clearTwist(propIndex, frame.index)"
                  >
                    <BaseIcon :path="mdiTrashCanOutline" :size="18" />
                  </button>
                </label>
              </section>
            </div>
          </template>
          <p v-else>{{ propertyName(property) }} controls will go here.</p>
        </div>
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
import { mdiTrashCanOutline } from '@mdi/js'
import { useId } from 'vue'

import BaseIcon from '@/components/icons/BaseIcon.vue'
import ConceptStepper from '@/features/concepts/components/ConceptStepper.vue'
import type {
  VtgFoldValue,
  VtgFoldValues,
  VtgFoldMode,
  VtgFoldSideSettings,
  VtgFoldSpan,
  VtgPropertyKey,
  VtgTwistMode,
  VtgTwistValues,
} from '@/features/concepts/stores/useConceptsStore'
import type { RootDataFinal } from '@/types/AnimTypes'

type PatternPropertyContext = 'vtg' | 'builder'
type PatternPropertyKey = VtgPropertyKey

const props = withDefaults(
  defineProps<{
    context: PatternPropertyContext
    showTurns?: boolean
    animation?: RootDataFinal
    twistMode?: VtgTwistMode
    twistValues?: VtgTwistValues
    foldValues?: VtgFoldValues
    foldValuesMaterialized?: boolean
    sliders?: boolean
    foldMode?: VtgFoldMode
    foldBeat?: VtgFoldSideSettings<number>
    foldRepeat?: VtgFoldSideSettings<boolean>
    foldEvery?: VtgFoldSideSettings<number>
    foldAlternate?: VtgFoldSideSettings<boolean>
    foldSpan?: VtgFoldSpan
    propertiesExpanded?: boolean
    activeProperty?: PatternPropertyKey | null
  }>(),
  {
    showTurns: false,
    twistMode: 'simple',
    twistValues: () => [{}, {}],
    foldValues: () => [{}, {}],
    foldValuesMaterialized: false,
    sliders: true,
    foldMode: 'simple',
    foldBeat: () => [2, 2],
    foldRepeat: () => [true, true],
    foldEvery: () => [2, 2],
    foldAlternate: () => [false, false],
    foldSpan: 'quarter',
    propertiesExpanded: false,
    activeProperty: null,
  },
)

const emit = defineEmits<{
  twistUpdate: [propIndex: 0 | 1, beat: number, value?: number]
  'update:twistMode': [mode: VtgTwistMode]
  foldUpdate: [propIndex: 0 | 1, beat: number, fold: keyof VtgFoldValue, value?: number]
  'update:foldMode': [mode: VtgFoldMode]
  'update:foldBeat': [propIndex: 0 | 1, beat: number]
  'update:foldRepeat': [propIndex: 0 | 1, repeat: boolean]
  'update:foldEvery': [propIndex: 0 | 1, every: number]
  'update:foldAlternate': [propIndex: 0 | 1, alternate: boolean]
  'update:foldSpan': [span: VtgFoldSpan]
  'update:propertiesExpanded': [expanded: boolean]
  'update:activeProperty': [property: PatternPropertyKey | null]
}>()
const twistModes = ['simple', 'advanced'] as const
const foldModes = ['simple', 'advanced'] as const
const foldSpans = ['quarter', 'eighth'] as const
const folds = [
  { key: 'yaw', label: 'Direct', min: -180, max: 180, default: 90 },
  { key: 'rotate', label: 'Rotate', min: -360, max: 360, default: 0 },
] as const

const properties = [
  { key: 'axis', name: 'Axis', label: 'Axis' },
  { key: 'twist', name: 'Twist', label: 'Twist - For Roll-Sensitive Props' },
  { key: 'turns', name: 'Turns', label: 'Turns' },
] as const satisfies readonly { key: PatternPropertyKey; name: string; label: string }[]

const controlId = `pattern-properties-${useId()}`
const visibleProperties = computed(() =>
  properties.filter((property) => property.key !== 'turns' || props.showTurns),
)
const propertyLabel = (property: (typeof properties)[number]) =>
  props.context === 'vtg' && property.key === 'axis' ? 'Folds' : property.label
const propertyName = (property: (typeof properties)[number]) =>
  props.context === 'vtg' && property.key === 'axis' ? 'Folds' : property.name

const twistColumns = computed(() =>
  ['Left', 'Right'].map((label, propIndex) => {
    const frames = props.animation?.props[propIndex]?.anim ?? []
    let beat = 0
    return {
      label,
      frames: frames
        .map((frame, index) => {
          const authoredValue = props.twistValues[propIndex]?.[String(beat)]
          const isSet = authoredValue !== undefined
          const result = { index, beat, isSet, value: authoredValue ?? 0 }
          beat += frame.beats ?? 0.5
          return result
        })
        .filter((frame) => props.twistMode === 'advanced' || frame.beat === 0.5),
    }
  }),
)
const foldColumnsUnfiltered = computed(() =>
  ['Left', 'Right'].map((label, propIndex) => {
    const frames = props.animation?.props[propIndex]?.anim ?? []
    let beat = 0
    return {
      label,
      frames: frames.map((frame, index) => {
        const storedValues = props.foldValues[propIndex]?.[String(beat)] ?? {}
        const result = {
          index,
          beat,
          values: {
            ...storedValues,
            ...(props.foldMode === 'simple' &&
            props.foldSpan === 'quarter' &&
            props.foldValuesMaterialized &&
            storedValues.rotate !== undefined
              ? { rotate: storedValues.rotate * 2 }
              : {}),
          },
        }
        beat += frame.beats ?? 0.5
        return result
      }),
    }
  }),
)
const foldColumns = computed(() =>
  foldColumnsUnfiltered.value.map((column, propIndex) => ({
    ...column,
    frames: column.frames.filter(
      (frame) => props.foldMode === 'advanced' || frame.beat === props.foldBeat[propIndex],
    ),
  })),
)
const availableFoldBeats = computed(() => {
  const beats = new Set<number>()
  for (const column of foldColumnsUnfiltered.value) {
    for (const frame of column.frames) beats.add(frame.beat)
  }
  return [...beats].sort((first, second) => first - second)
})
const foldBeatOptions = computed(() =>
  availableFoldBeats.value.filter((beat) => props.foldSpan === 'eighth' || Number.isInteger(beat)),
)
const foldEveryOptions = computed(() => foldBeatOptions.value.filter((beat) => beat > 0))

const formatBeat = (beat: number) => (Number.isInteger(beat) ? String(beat) : String(beat))
const isPropIndex = (propIndex: number): propIndex is 0 | 1 => propIndex === 0 || propIndex === 1
const emitFoldRepeat = (propIndex: number, event: Event) => {
  if (!isPropIndex(propIndex)) return
  emit('update:foldRepeat', propIndex, (event.target as HTMLInputElement).checked)
}
const emitFoldAlternate = (propIndex: number, event: Event) => {
  if (!isPropIndex(propIndex)) return
  emit('update:foldAlternate', propIndex, (event.target as HTMLInputElement).checked)
}
const emitFoldBeat = (propIndex: number, event: Event) => {
  if (!isPropIndex(propIndex)) return
  emit('update:foldBeat', propIndex, Number((event.target as HTMLSelectElement).value))
}
const emitFoldEvery = (propIndex: number, event: Event) => {
  if (!isPropIndex(propIndex)) return
  emit('update:foldEvery', propIndex, Number((event.target as HTMLSelectElement).value))
}

const setTwist = (propIndex: number, frameIndex: number, event: Event) => {
  const frame = twistColumns.value[propIndex]?.frames.find(
    (candidate) => candidate.index === frameIndex,
  )
  if (!frame || (propIndex !== 0 && propIndex !== 1)) return
  emit('twistUpdate', propIndex, frame.beat, Number((event.target as HTMLInputElement).value))
}
const emitTwistValue = (propIndex: number, beat: number, value: number) => {
  if (propIndex !== 0 && propIndex !== 1) return
  emit('twistUpdate', propIndex, beat, value)
}

const clearTwist = (propIndex: number, frameIndex: number) => {
  const frame = twistColumns.value[propIndex]?.frames.find(
    (candidate) => candidate.index === frameIndex,
  )
  if (!frame || (propIndex !== 0 && propIndex !== 1)) return
  emit('twistUpdate', propIndex, frame.beat)
}

const setFold = (propIndex: number, beat: number, fold: keyof VtgFoldValue, event: Event) => {
  if (propIndex !== 0 && propIndex !== 1) return
  emit('foldUpdate', propIndex, beat, fold, Number((event.target as HTMLInputElement).value))
}
const emitFoldValue = (
  propIndex: number,
  beat: number,
  fold: keyof VtgFoldValue,
  value: number,
) => {
  if (propIndex !== 0 && propIndex !== 1) return
  emit('foldUpdate', propIndex, beat, fold, value)
}

const clearFold = (propIndex: number, beat: number, fold: keyof VtgFoldValue) => {
  if (propIndex !== 0 && propIndex !== 1) return
  emit('foldUpdate', propIndex, beat, fold)
}

const toggleProperty = (property: PatternPropertyKey) => {
  emit('update:activeProperty', props.activeProperty === property ? null : property)
}
const emitPropertiesExpanded = (event: Event) => {
  emit('update:propertiesExpanded', (event.currentTarget as HTMLDetailsElement).open)
}
</script>

<style scoped>
.pattern-property-controls {
  box-sizing: border-box;
  width: min(calc(100% - var(--space-2)), 68rem);
  min-width: var(--size-concept-content-min-width);
  margin: var(--space-1) auto 0;
  overflow: hidden;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  container-type: inline-size;
}

.pattern-property-controls > summary {
  display: flex;
  padding: var(--space-2) var(--space-3);
  color: var(--color-action-primary);
  font-size: 0.8125rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  cursor: pointer;
  list-style: none;
  background: color-mix(in srgb, var(--color-action-primary) 7%, var(--color-surface));
  align-items: center;
  justify-content: space-between;
  transition: background var(--transition-fast);
}

.pattern-property-controls > summary::-webkit-details-marker {
  display: none;
}

.pattern-property-controls > summary::after {
  content: '+';
  font-size: 1rem;
}

.pattern-property-controls[open] > summary::after {
  content: '-';
}

.pattern-property-controls[open] > summary {
  background: color-mix(in srgb, var(--color-action-primary) 13%, var(--color-surface));
  border-block-end: 1px solid var(--color-border);
}

.pattern-property-controls > summary:hover {
  background: color-mix(in srgb, var(--color-action-primary) 13%, var(--color-surface));
}

.pattern-property-controls > summary:focus-visible,
.pattern-property-controls__toggle:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: -2px;
}

.pattern-property-controls__content {
  display: grid;
  padding: var(--space-2);
  gap: var(--space-1);
}

.pattern-property-controls__toggle {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  color: var(--color-text);
  font-size: 0.875rem;
  font-weight: 700;
  text-align: start;
  cursor: pointer;
  background: color-mix(in srgb, var(--color-surface) 92%, var(--color-action-primary));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.pattern-property-controls__toggle[aria-expanded='true'] {
  color: var(--color-action-primary);
  background: color-mix(in srgb, var(--color-action-primary) 10%, var(--color-surface));
  border-end-start-radius: 0;
  border-end-end-radius: 0;
}

.pattern-property-controls__panel {
  padding: var(--space-2) var(--space-3);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-block-start: 0;
  border-end-start-radius: var(--radius-sm);
  border-end-end-radius: var(--radius-sm);
}

.pattern-property-controls__panel p {
  margin: 0;
}

.pattern-property-controls__twist-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.pattern-property-controls__fold-options {
  display: flex;
  margin: 0 0 var(--space-3);
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: var(--space-2);
}

.pattern-property-controls__twist-mode {
  margin: 0 0 var(--space-3);
  justify-content: center;
}

.pattern-property-controls__option-group {
  display: grid;
  grid-auto-columns: max-content;
  grid-auto-flow: column;
  padding: 0;
  margin: 0;
  border: 0;
  gap: var(--space-1);
}

.pattern-property-controls__option-group label {
  position: relative;
  cursor: pointer;
}

.pattern-property-controls__option-group input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.pattern-property-controls__option-group label > span {
  display: grid;
  padding-block: var(--space-1);
  padding-inline: var(--space-concept-control-inline);
  color: var(--color-text);
  font-size: var(--font-size-concept-control);
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  place-items: center;
}

.pattern-property-controls__option-group input:checked + span {
  color: var(--color-action-primary);
  background: color-mix(in srgb, var(--color-action-primary) 12%, var(--color-surface));
  border-color: var(--color-action-primary);
}

.pattern-property-controls__option-group input:disabled + span {
  color: var(--color-text-muted);
  cursor: not-allowed;
  opacity: 0.5;
}

.pattern-property-controls__option-group input:focus-visible + span,
.pattern-property-controls__select select:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.pattern-property-controls__select {
  display: inline-flex;
  color: var(--color-text-muted);
  font-size: var(--font-size-concept-control);
  align-items: center;
  gap: var(--space-1);
}

.pattern-property-controls__select select {
  padding: var(--space-1) var(--space-2);
  color: var(--color-text);
  font-weight: 700;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.pattern-property-controls__visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  white-space: nowrap;
  border: 0;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
}

.pattern-property-controls__twist-column {
  min-width: 0;
  padding-inline: var(--space-3);
}

.pattern-property-controls__twist-column + .pattern-property-controls__twist-column {
  border-inline-start: 1px solid var(--color-border);
}

.pattern-property-controls__fold-schedule {
  display: grid;
  margin-block-end: var(--space-3);
  justify-items: center;
  gap: var(--space-2);
}

.pattern-property-controls__fold-timing {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2);
}

.pattern-property-controls__twist-header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  margin-block-end: var(--space-2);
  color: var(--color-text-muted);
  font-size: 0.75rem;
  align-items: center;
}

.pattern-property-controls__twist-header h3 {
  margin: 0;
  color: var(--color-text);
  font-size: 0.875rem;
  text-align: center;
}

.pattern-property-controls__twist-header span:last-child {
  text-align: end;
}

.pattern-property-controls__twist-frame {
  display: grid;
  grid-template-columns: 2.25rem minmax(0, 1fr) 3.25rem 2rem;
  min-height: 2rem;
  color: var(--color-text);
  align-items: center;
  gap: var(--space-1);
}

.pattern-property-controls__twist-frame input[type='range'] {
  width: 100%;
  min-width: 0;
}

.pattern-property-controls__twist-frame + .pattern-property-controls__twist-frame {
  border-block-start: 1px solid var(--color-border);
}

.pattern-property-controls__fold-frame {
  display: grid;
  grid-template-columns: 2.25rem minmax(0, 1fr);
  padding-block: var(--space-1);
  align-items: center;
  gap: var(--space-1);
}

.pattern-property-controls__fold-frame + .pattern-property-controls__fold-frame {
  border-block-start: 1px solid var(--color-border);
}

.pattern-property-controls__fold-control {
  display: grid;
  grid-template-columns: 3.25rem minmax(0, 1fr) 3.25rem 2rem;
  min-height: 2rem;
  align-items: center;
  gap: var(--space-1);
}

.pattern-property-controls__fold-control input[type='range'] {
  width: 100%;
  min-width: 0;
}

.pattern-property-controls__fold-control output {
  font-size: 0.75rem;
  text-align: end;
}

.pattern-property-controls__fold-control--stepper {
  grid-template-columns: 3.25rem minmax(7.5rem, 1fr) 2rem;
}

.pattern-property-controls__twist-frame--stepper {
  grid-template-columns: 2.25rem minmax(7.5rem, 1fr) 2rem;
}

.pattern-property-controls__twist-frame--inherited {
  color: var(--color-text-muted);
}

.pattern-property-controls__twist-frame--inherited input {
  opacity: 0.55;
}

.pattern-property-controls__beat {
  font-variant-numeric: tabular-nums;
}

.pattern-property-controls__twist-frame output {
  font-size: 0.75rem;
  text-align: end;
  white-space: nowrap;
}

.pattern-property-controls__delete {
  display: inline-grid;
  padding: var(--space-1);
  color: var(--color-text-muted);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  place-items: center;
}

.pattern-property-controls__delete:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.pattern-property-controls__delete:not(:disabled):hover {
  color: var(--color-action-primary);
}

@container (max-width: 36rem) {
  .pattern-property-controls__twist-columns {
    grid-template-columns: 1fr;
  }

  .pattern-property-controls__twist-column + .pattern-property-controls__twist-column {
    margin-block-start: var(--space-2);
    padding-block-start: var(--space-3);
    border-block-start: 1px solid var(--color-border);
    border-inline-start: 0;
  }
}

@container (max-width: 22rem) {
  .pattern-property-controls__twist-column {
    padding-inline: var(--space-1);
  }

  .pattern-property-controls__twist-frame {
    grid-template-columns: 2rem minmax(0, 1fr) 3rem 1.75rem;
  }
}
</style>
