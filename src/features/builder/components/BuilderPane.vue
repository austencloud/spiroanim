<template>
  <section class="builder-pane" data-role="builder-view" aria-labelledby="builder-pane-title">
    <button
      class="builder-pane__exit"
      type="button"
      aria-label="Exit Pattern Builder"
      data-role="builder-exit"
      @click="exit"
    >
      Exit
    </button>

    <div class="builder-pane__controls">
      <AppTooltip v-if="canUndo" text="Undo">
        <template #activator="{ props: tooltipProps }">
          <button v-bind="tooltipProps" type="button" aria-label="Undo" @click="undo">
            <BaseIcon :path="mdiUndoVariant" size="30" />
          </button>
        </template>
      </AppTooltip>
    </div>

    <div class="builder-pane__scroll scrollbar">
      <header class="builder-pane__header">
        <h1 id="builder-pane-title">Pattern Builder</h1>
      </header>

      <p
        v-if="!isEmptyPattern && !preparedPattern.supported"
        class="builder-pane__support-error"
        data-role="vtg-transition-support-error"
        role="alert"
      >
        Pattern not supported.
      </p>
      <VtgTransitionPreviews
        v-if="resizedPreviewAnimations"
        :key="resizedPreviewAnimations.length"
        :animations="resizedPreviewAnimations"
        :refresh-key="previewRefreshKey"
        :columns="columns"
        :initial-beat-counts="baselineBeatCounts"
        :beat-counts="currentBeatCounts"
        :scale="scale"
        @pattern-drop="acceptPatternDrop"
        @pattern-delete="deletePreview"
        @pattern-preview="previewPattern"
        @beat-change="updatePreviewBeatCount"
        @slider-start="beginSliderHistory"
        @slider-end="endSliderHistory"
      />

      <div ref="miniPlayerHost" class="builder-pane__mini-player" data-role="builder-player">
        <AnimPlayer
          v-if="miniPlayerDimensions.width > 0 && miniPlayerDimensions.height > 0"
          store="main"
          minimal
          :dim="miniPlayerDimensions"
        />
        <div v-if="PLAYBACK_OVERRIDE_ACTIVE" class="builder-pane__player-revert">
          <AppTooltip text="Return to the loaded pattern">
            <template #activator="{ props: tooltipProps }">
              <button
                v-bind="tooltipProps"
                class="builder-pane__player-revert-button"
                type="button"
                aria-label="Return player to loaded pattern"
                @click="playerStore.clearPlaybackOverride"
              >
                <BaseIcon :path="mdiBackupRestore" :size="36" />
              </button>
            </template>
          </AppTooltip>
        </div>
      </div>

      <p class="builder-pane__development-warning" role="note">
        Pattern Builder is under active development. Features and generated patterns may change.
        <br />
        <strong>Not yet tested on MOBILE.</strong>
      </p>
    </div>

    <div class="builder-pane__column-control" role="group" aria-label="Builder Columns">
      <AppTooltip text="Decrease Builder Columns">
        <template #activator="{ props: tooltipProps }">
          <button
            v-bind="tooltipProps"
            type="button"
            aria-label="Decrease Builder Columns"
            :disabled="columns <= MIN_BUILDER_COLUMNS"
            @click="decreaseColumns"
          >
            <BaseIcon :path="mdiMinus" :size="20" />
          </button>
        </template>
      </AppTooltip>
      <output aria-live="polite">{{ columns }}</output>
      <AppTooltip text="Increase Builder Columns">
        <template #activator="{ props: tooltipProps }">
          <button
            v-bind="tooltipProps"
            type="button"
            aria-label="Increase Builder Columns"
            :disabled="columns >= MAX_BUILDER_COLUMNS"
            @click="increaseColumns"
          >
            <BaseIcon :path="mdiPlus" :size="20" />
          </button>
        </template>
      </AppTooltip>
    </div>
  </section>
</template>

<script setup lang="ts">
import { mdiBackupRestore, mdiMinus, mdiPlus, mdiUndoVariant } from '@mdi/js'

import BaseIcon from '@/components/icons/BaseIcon.vue'
import AppTooltip from '@/components/AppTooltip.vue'
import VtgTransitionPreviews from '@/features/vtg/components/VtgTransitionPreviews.vue'
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'
import {
  MAX_BUILDER_COLUMNS,
  MIN_BUILDER_COLUMNS,
  useBuilderSettingsStore,
} from '@/features/builder/stores/useBuilderSettingsStore'
import {
  createVtgTransitionPreviewAnimations,
  getVtgTransitionPreviewBeatCount,
  resizeVtgTransitionPatternPreview,
  removeVtgTransitionPatternPreview,
} from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import { prepareVtg45TransitionPattern } from '@/features/vtg/math/prepareVtg45TransitionPattern'
import { useMainPaneStore } from '@/stores/useMainPaneStore'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useQSMainStore } from '@/stores/useQSMainStore'
import type { BuilderPatternDrop } from '@/features/builder/types'
import type { RootDataFinal } from '@/types/AnimTypes'
import AnimPlayer from '@/components/SpiroAnim/AnimPlayer.vue'
import {
  appendVtgBuilderPattern,
  insertVtgBuilderPattern,
} from '@/features/builder/appendVtgBuilderPattern'
import { isVtgPatternSelection } from '@/features/concepts/types'
import { toVtgBuilderDisplayAnimation } from '@/features/builder/toVtgBuilderDisplayAnimation'

const paneStore = useMainPaneStore()
const playerStore = usePlayerStore('main')
const qsStore = useQSMainStore()
const { ROOT, CURRENT } = playerStore.raw()
const { PLAYBACK_OVERRIDE_ACTIVE } = storeToRefs(playerStore)
const miniPlayerHost = ref<HTMLElement>()
const { width: miniPlayerWidth, height: miniPlayerHeight } = useElementSize(miniPlayerHost)
const miniPlayerDimensions = computed(() => ({
  width: miniPlayerWidth.value,
  height: miniPlayerHeight.value,
  perc: 1,
}))
const { qsHistory } = storeToRefs(qsStore)
const builderSettingsStore = useBuilderSettingsStore()
const { columns } = storeToRefs(builderSettingsStore)
const { decreaseColumns, increaseColumns } = builderSettingsStore
const {
  bpm,
  scale,
  spacing,
  paths,
  hands,
  arms,
  leftPropVisible,
  rightPropVisible,
  leftPropColor,
  rightPropColor,
} = storeToRefs(useConceptsStore())
const canUndo = computed(() => qsHistory.value.length > 1)
const isEmptyPattern = computed(() => ROOT.value.props.length === 0)
const preparedPattern = computed(() => prepareVtg45TransitionPattern(ROOT.value))
const previewAnimations = computed(() =>
  isEmptyPattern.value
    ? []
    : preparedPattern.value.supported
      ? createVtgTransitionPreviewAnimations(preparedPattern.value.pattern)
      : undefined,
)
const currentBeatCounts = computed(
  () => previewAnimations.value?.map(getVtgTransitionPreviewBeatCount) ?? [],
)
const baselineBeatCounts = ref<number[]>([])
watch(
  currentBeatCounts,
  (counts) => {
    if (baselineBeatCounts.value.length !== counts.length) baselineBeatCounts.value = [...counts]
  },
  { immediate: true },
)
const resizedPreviewAnimations = previewAnimations
const builderDisplayAnimation = computed(() =>
  toVtgBuilderDisplayAnimation(ROOT.value, scale.value),
)
watchImmediate(builderDisplayAnimation, playerStore.setPlaybackOverride)
const previewPattern = (animation: RootDataFinal) => {
  playerStore.setPlaybackOverride(toVtgBuilderDisplayAnimation(animation, scale.value))
  CURRENT.value = 0
  playerStore.PLAYING = true
}
const acceptPatternDrop = (drop: BuilderPatternDrop) => {
  const previewCount = resizedPreviewAnimations.value?.length
  if (previewCount === undefined || !isVtgPatternSelection(drop.selection)) return

  const updated =
    drop.previewIndex === previewCount
      ? appendVtgBuilderPattern(preparedPattern.value.pattern, drop.selection)
      : insertVtgBuilderPattern(preparedPattern.value.pattern, drop.selection, drop.previewIndex)
  if (updated) ROOT.value = updated
}
const updatePreviewBeatCount = (index: number, beatCount: number) => {
  const updated = resizeVtgTransitionPatternPreview(preparedPattern.value.pattern, index, beatCount)
  if (updated !== undefined) ROOT.value = updated
}
const deletePreview = (index: number) => {
  const updated = removeVtgTransitionPatternPreview(preparedPattern.value.pattern, index)
  if (updated !== undefined) ROOT.value = updated
}
const previewRefreshKey = computed(() =>
  [
    bpm.value,
    scale.value,
    spacing.value,
    paths.value,
    hands.value,
    arms.value,
    leftPropVisible.value,
    rightPropVisible.value,
    leftPropColor.value,
    rightPropColor.value,
  ].join('|'),
)

const undo = () => {
  const previous = qsStore.undoQS()
  if (previous !== undefined) ROOT.value = previous
}

const { beginHistoryGroup, endHistoryGroup } = qsStore
let sliderHistoryActive = false
const beginSliderHistory = () => {
  if (sliderHistoryActive) return
  beginHistoryGroup(ROOT.value)
  sliderHistoryActive = true
}
const endSliderHistory = () => {
  baselineBeatCounts.value = [...currentBeatCounts.value]
  if (!sliderHistoryActive) return
  sliderHistoryActive = false
  endHistoryGroup()
}
onBeforeUnmount(() => {
  endSliderHistory()
  playerStore.clearPlaybackOverride()
})

const exit = () => {
  playerStore.clearPlaybackOverride()
  paneStore.exitPaneHijack()
}
</script>

<style scoped>
.builder-pane {
  position: absolute;
  z-index: 1009;
  inset: 0;
  container-type: inline-size;
  overflow: hidden;
  color: var(--color-text);
  background: transparent;
}

.builder-pane__scroll {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding-block-end: var(--size-pane-switch-bottom-clearance);
  overflow-y: auto;
  overflow-x: hidden;
}

.builder-pane__header {
  display: flex;
  align-items: center;
  width: min(calc(100% - 8rem), 28rem);
  padding-block: var(--space-3) var(--space-2);
  margin-inline: auto;
  gap: var(--space-2);
}

.builder-pane__header::before,
.builder-pane__header::after {
  height: 2px;
  content: '';
  background: linear-gradient(to right, transparent, var(--color-action-primary), transparent);
  flex: 1;
}

.builder-pane__header h1 {
  padding: var(--space-1) var(--space-2);
  margin: 0;
  color: transparent;
  font-size: clamp(1.05rem, 3.2cqi, 1.35rem);
  font-weight: 800;
  letter-spacing: 0.1em;
  line-height: 1.2;
  text-align: center;
  text-transform: uppercase;
  white-space: nowrap;
  background: linear-gradient(
    135deg,
    var(--color-action-primary),
    var(--color-text),
    var(--color-action-primary)
  );
  background-clip: text;
  filter: drop-shadow(0 1px 3px color-mix(in srgb, var(--color-action-primary) 28%, transparent));
}

.builder-pane__support-error {
  box-sizing: border-box;
  width: min(calc(100% - var(--space-4)), 45rem);
  padding: var(--space-2) var(--space-3);
  margin: var(--space-2) auto 0;
  color: var(--color-status-error);
  font-size: var(--font-size-concept-control);
  font-weight: 700;
  text-align: center;
  background: color-mix(in srgb, var(--color-status-error) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-status-error) 55%, var(--color-border));
  border-inline-start-width: 3px;
  border-radius: var(--radius-sm);
}

.builder-pane__mini-player {
  position: relative;
  width: min(calc(100% - var(--space-4)), 45rem);
  height: clamp(14rem, 48cqi, 26rem);
  margin: var(--space-4) auto 0;
  overflow: hidden;
  background: color-mix(in srgb, var(--color-surface) 30%, transparent);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.builder-pane__player-revert {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  z-index: 2;
}

.builder-pane__player-revert-button {
  display: grid;
  width: 3rem;
  height: 3rem;
  padding: 0;
  color: var(--color-action-primary);
  cursor: pointer;
  background: color-mix(in srgb, var(--color-surface) 72%, transparent);
  border: 1px solid var(--color-border);
  border-radius: 50%;
  box-shadow: var(--shadow-sm);
  place-items: center;
}

.builder-pane__player-revert-button:hover {
  color: var(--color-text);
  background: color-mix(in srgb, var(--color-action-primary) 18%, transparent);
}

.builder-pane__player-revert-button:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.builder-pane__development-warning {
  box-sizing: border-box;
  width: min(calc(100% - var(--space-4)), 45rem);
  padding: var(--space-2) var(--space-3);
  margin: var(--space-4) auto var(--space-6);
  color: var(--color-text);
  font-size: var(--font-size-concept-control);
  font-weight: 700;
  line-height: 1.4;
  text-align: center;
  background: color-mix(in srgb, var(--color-status-warning) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-status-warning) 55%, var(--color-border));
  border-inline-start-width: 3px;
  border-radius: var(--radius-sm);
}

.builder-pane__controls {
  position: absolute;
  z-index: 2;
  top: 2px;
  right: 2px;
  display: flex;
  width: max-content;
  height: 0;
  gap: var(--space-1);
  align-items: flex-start;
}

.builder-pane__column-control {
  position: absolute;
  bottom: var(--space-workspace-bottom-offset);
  left: 50%;
  z-index: 2;
  display: flex;
  height: var(--size-pane-switch-button);
  overflow: hidden;
  color: var(--color-text);
  background: color-mix(in srgb, var(--color-surface) 50%, transparent);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
  transform: translateX(-50%);
}

.builder-pane__column-control button {
  display: grid;
  width: var(--size-pane-switch-button);
  padding: 0;
  color: var(--color-action-primary);
  cursor: pointer;
  background: transparent;
  border: 0;
  place-items: center;
}

.builder-pane__column-control button:hover {
  color: var(--color-text);
  background: color-mix(in srgb, var(--color-action-primary) 10%, transparent);
}

.builder-pane__column-control button:disabled {
  color: var(--color-text-muted);
  cursor: not-allowed;
  opacity: 0.5;
}

.builder-pane__column-control button:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: -2px;
}

.builder-pane__column-control output {
  display: grid;
  min-width: var(--size-pane-switch-button);
  padding-inline: var(--space-1);
  border-inline: 1px solid var(--color-border);
  font-variant-numeric: tabular-nums;
  place-items: center;
}

.builder-pane__controls button:not(.builder-pane__exit) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  color: var(--color-text-muted);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
}

.builder-pane__exit {
  position: absolute;
  bottom: var(--space-workspace-bottom-offset);
  left: var(--space-2);
  z-index: 3;
  min-width: 5rem;
  min-height: var(--size-pane-switch-button);
  padding: var(--space-2) var(--space-3);
  color: var(--color-text);
  font: inherit;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.builder-pane__controls button:hover,
.builder-pane__exit:hover {
  color: var(--color-action-primary);
}

.builder-pane__controls button:focus-visible,
.builder-pane__exit:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}
</style>
