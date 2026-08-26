<template>
  <details
    ref="rootElement"
    class="pattern-property-controls"
    :open="propertiesExpanded"
    :data-role="`${context}-properties`"
    :data-context="context"
    @toggle="emitPropertiesExpanded"
  >
    <summary :data-role="`${context}-properties-toggle`">PROPERTIES...</summary>
    <div class="pattern-property-controls__content">
      <div v-for="property in visibleProperties" :key="property.key">
        <BaseTooltip
          class="pattern-property-controls__property-tooltip"
          :text="propertyTooltip(property)"
          :disabled="touchDevice || (property.key !== 'axis' && property.key !== 'twist')"
        >
          <template #activator="{ props: tooltipProps }">
            <button
              v-bind="tooltipProps"
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
          </template>
        </BaseTooltip>
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
              <div class="pattern-property-controls__fold-option-row">
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
              </div>
              <div v-if="foldMode === 'simple'" class="pattern-property-controls__fold-option-row">
                <fieldset class="pattern-property-controls__option-group">
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
                <fieldset class="pattern-property-controls__option-group">
                  <legend class="pattern-property-controls__visually-hidden">Fold mirroring</legend>
                  <label>
                    <input
                      type="checkbox"
                      :checked="foldMirror"
                      aria-label="Mirror folds"
                      @change="emitFoldMirror"
                    />
                    <span>Mirror</span>
                  </label>
                </fieldset>
              </div>
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
                  <h3>{{ foldMirror && foldMode === 'simple' ? '' : column.label }}</h3>
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
                        'pattern-property-controls__value-set':
                          frame.values[fold.key] !== undefined,
                        'pattern-property-controls__fold-control--stepper': !sliders,
                      }"
                    >
                      <span>{{ fold.label }}</span>
                      <input
                        v-if="sliders"
                        type="range"
                        min="0"
                        :max="angleOptions(fold.min, fold.max).length - 1"
                        step="1"
                        :value="angleSliderIndex(frame.displayValues[fold.key], fold.min, fold.max)"
                        :aria-valuetext="`${frame.displayValues[fold.key]}°`"
                        :aria-label="`${column.label} ${fold.label} at beat ${formatBeat(frame.beat)}`"
                        @input="setFold(propIndex, frame.beat, fold.key, $event)"
                      />
                      <ConceptStepper
                        v-else
                        :model-value="frame.displayValues[fold.key]"
                        :label="`${column.label} ${fold.label} at beat ${formatBeat(frame.beat)}`"
                        :data-role="`${context}-${fold.key}-${propIndex}-${frame.index}-stepper`"
                        :min="fold.min"
                        :max="fold.max"
                        :step="90"
                        :display-value="`${frame.displayValues[fold.key]}°`"
                        @update:model-value="emitFoldValue(propIndex, frame.beat, fold.key, $event)"
                      />
                      <output v-if="sliders">{{ frame.displayValues[fold.key] }}°</output>
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
                    'pattern-property-controls__value-set': frame.isSet,
                    'pattern-property-controls__twist-frame--stepper': !sliders,
                  }"
                >
                  <span class="pattern-property-controls__beat">{{ formatBeat(frame.beat) }}</span>
                  <input
                    v-if="sliders"
                    type="range"
                    min="0"
                    :max="angleOptions(-360, 360).length - 1"
                    step="1"
                    :value="angleSliderIndex(frame.value, -360, 360)"
                    :aria-valuetext="`${frame.value}°`"
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
                    :step="90"
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
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
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
import { isTouchDevice } from '@/utils/device'

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
    foldMirror?: boolean
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
    foldSpan: 'eighth',
    foldMirror: true,
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
  'update:foldMirror': [mirror: boolean]
  'update:propertiesExpanded': [expanded: boolean]
  'update:activeProperty': [property: PatternPropertyKey | null]
}>()
const twistModes = ['simple', 'advanced'] as const
const foldModes = ['simple', 'advanced'] as const
const foldSpans = ['quarter', 'eighth'] as const
const folds = [
  { key: 'rotate', label: 'Rotate', min: -360, max: 360 },
  { key: 'yaw', label: 'Direct', min: -90, max: 90 },
] as const

const properties = [
  { key: 'axis', name: 'Axis', label: 'Axis' },
  { key: 'twist', name: 'Twist', label: 'Twist - For Roll-Sensitive Props' },
  { key: 'turns', name: 'Turns', label: 'Turns' },
] as const satisfies readonly { key: PatternPropertyKey; name: string; label: string }[]

const controlId = `pattern-properties-${useId()}`
const touchDevice = typeof navigator !== 'undefined' && isTouchDevice()
const rootElement = ref<HTMLDetailsElement>()
const visibleProperties = computed(() =>
  properties.filter((property) => property.key !== 'turns' || props.showTurns),
)
const propertyLabel = (property: (typeof properties)[number]) =>
  props.context === 'vtg' && property.key === 'axis' ? 'Rotate' : property.label
const propertyName = (property: (typeof properties)[number]) =>
  props.context === 'vtg' && property.key === 'axis' ? 'Rotate' : property.name
const propertyTooltip = (property: (typeof properties)[number]) =>
  property.key === 'axis'
    ? 'Set Direct and Rotate changes by beat for the left and right props.'
    : property.key === 'twist'
      ? 'Set twist changes by beat for roll-sensitive props.'
      : ''

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
    let inheritedYaw = 90
    return {
      label,
      frames: frames.map((frame, index) => {
        const storedValues = props.foldValues[propIndex]?.[String(beat)] ?? {}
        const values = {
          ...storedValues,
          ...(props.foldMode === 'simple' &&
          props.foldSpan === 'quarter' &&
          props.foldValuesMaterialized &&
          storedValues.rotate !== undefined
            ? { rotate: storedValues.rotate * 2 }
            : {}),
        }
        const result = {
          index,
          beat,
          values,
          displayValues: { yaw: values.yaw ?? inheritedYaw, rotate: values.rotate ?? 0 },
        }
        if (values.yaw !== undefined) inheritedYaw = values.yaw
        beat += frame.beats ?? 0.5
        return result
      }),
    }
  }),
)
const foldColumns = computed(() =>
  foldColumnsUnfiltered.value
    .filter((_, propIndex) => props.foldMode !== 'simple' || !props.foldMirror || propIndex === 0)
    .map((column, propIndex) => ({
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
const foldBeatOptions = computed(() => availableFoldBeats.value)
const foldEveryOptions = computed(() => foldBeatOptions.value.filter((beat) => beat > 0))

const angleOptions = (min: number, max: number) => {
  const values: number[] = []
  for (let value = Math.ceil(min / 90) * 90; value <= max; value += 90) {
    if (value !== 0) values.push(value)
  }
  return values
}
const angleSliderIndex = (value: number, min: number, max: number) => {
  const options = angleOptions(min, max)
  const exact = options.indexOf(value)
  if (exact >= 0) return exact
  return options.reduce(
    (closest, option, index) =>
      Math.abs(option - value) < Math.abs(options[closest]! - value) ? index : closest,
    0,
  )
}
const angleFromSlider = (event: Event, min: number, max: number) => {
  const options = angleOptions(min, max)
  return options[Number((event.target as HTMLInputElement).value)] ?? options[0]!
}
const skipZero = (value: number, previous: number) =>
  value === 0 ? (previous < 0 ? 90 : -90) : value

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
const emitFoldMirror = (event: Event) => {
  emit('update:foldMirror', (event.target as HTMLInputElement).checked)
}

const setTwist = (propIndex: number, frameIndex: number, event: Event) => {
  const frame = twistColumns.value[propIndex]?.frames.find(
    (candidate) => candidate.index === frameIndex,
  )
  if (!frame || (propIndex !== 0 && propIndex !== 1)) return
  emit('twistUpdate', propIndex, frame.beat, angleFromSlider(event, -360, 360))
}
const emitTwistValue = (propIndex: number, beat: number, value: number) => {
  if (propIndex !== 0 && propIndex !== 1) return
  const previous =
    twistColumns.value[propIndex]?.frames.find((frame) => frame.beat === beat)?.value ?? 0
  emit('twistUpdate', propIndex, beat, skipZero(value, previous))
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
  const limits = folds.find(({ key }) => key === fold)
  if (!limits) return
  emit('foldUpdate', propIndex, beat, fold, angleFromSlider(event, limits.min, limits.max))
}
const emitFoldValue = (
  propIndex: number,
  beat: number,
  fold: keyof VtgFoldValue,
  value: number,
) => {
  if (propIndex !== 0 && propIndex !== 1) return
  const previous =
    foldColumns.value[propIndex]?.frames.find((frame) => frame.beat === beat)?.displayValues[
      fold
    ] ?? 0
  emit('foldUpdate', propIndex, beat, fold, skipZero(value, previous))
}

const clearFold = (propIndex: number, beat: number, fold: keyof VtgFoldValue) => {
  if (propIndex !== 0 && propIndex !== 1) return
  emit('foldUpdate', propIndex, beat, fold)
}

const toggleProperty = (property: PatternPropertyKey) => {
  emit('update:activeProperty', props.activeProperty === property ? null : property)
}

const revealOpenedProperty = async (property: PatternPropertyKey | null) => {
  if (property !== 'axis' && property !== 'twist') return
  await nextTick()
  const root = rootElement.value
  const target = root?.querySelector<HTMLElement>(
    `[data-role="${props.context}-property-${property}-toggle"]`,
  )
  if (!root || !target) return

  let scrollParent: HTMLElement | null = root.parentElement
  while (scrollParent) {
    const style = getComputedStyle(scrollParent)
    if (/(auto|scroll)/.test(style.overflowY)) break
    scrollParent = scrollParent.parentElement
  }
  if (!scrollParent) return

  const parentRect = scrollParent.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  if (targetRect.top >= parentRect.top && targetRect.top <= parentRect.bottom) return
  scrollParent.scrollTo({
    top: scrollParent.scrollTop + targetRect.top - parentRect.top,
    behavior: 'auto',
  })
}
watch(() => props.activeProperty, revealOpenedProperty)
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

.pattern-property-controls__property-tooltip {
  display: flex;
  width: 100%;
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
  display: grid;
  margin: 0 0 var(--space-3);
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: var(--space-2);
}

.pattern-property-controls__fold-option-row {
  display: flex;
  justify-content: center;
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

.pattern-property-controls__value-set {
  --concept-stepper-value-color: var(--color-property-value-defined);
}

.pattern-property-controls__value-set > output {
  color: var(--color-property-value-defined);
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
