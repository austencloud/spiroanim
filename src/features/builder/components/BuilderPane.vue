<template>
  <section
    ref="builderPaneHost"
    class="builder-pane"
    data-role="builder-view"
    aria-labelledby="builder-pane-title"
  >
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

    <div
      v-show="paneVisible.top"
      ref="eTop"
      class="builder-pane__pane"
      data-role="top-pane"
      :style="topStyle"
    />
    <div
      v-show="paneVisible.bottom"
      ref="eBottom"
      class="builder-pane__pane"
      :class="{ 'builder-pane__pane--divided': paneVisible.top && paneVisible.bottom }"
      data-role="bottom-pane"
      :style="bottomStyle"
    />

    <div v-show="false" ref="eHidden">
      <div
        ref="eThumbnails"
        class="builder-pane__thumbnails"
        data-type="thumbnails"
        data-role="builder-thumbnails"
      >
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
            v-if="resizedPreviewAnimations && previewRelationships"
            :key="resizedPreviewAnimations.length"
            :animations="resizedPreviewAnimations"
            :refresh-key="previewRefreshKey"
            :columns="columns"
            :initial-beat-counts="baselineBeatCounts"
            :beat-counts="currentBeatCounts"
            :relationships="previewRelationships"
            :scale="scale"
            :display-settings="builderDisplaySettings"
            :selected-index="selectedPreviewIndex"
            :allow-first-drop="allowFirstDrop"
            @pattern-drop="acceptPatternDrop"
            @pattern-delete="deletePreview"
            @pattern-reverse="reversePreview"
            @pattern-swap="swapPreviewProps"
            @selection-change="selectPreview"
            @beat-change="updatePreviewBeatCount"
            @slider-start="beginSliderHistory"
            @slider-end="endSliderHistory"
          />

          <div class="builder-pane__qslots">
            <QuickSlotsAction
              tooltip="Use the current Builder pattern with Quick Slots"
              label="Load to Quick Slots"
              data-role="builder-qslots"
              :disabled="!preparedPattern.supported || !resizedPreviewAnimations"
              :warning-required="hasPopulatedQuickSlots"
              @q-slots="createBuilderQSlots"
            />
            <p v-if="quickSlotCreationError" role="alert">{{ quickSlotCreationError }}</p>
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
      </div>

      <div ref="ePlayer" class="builder-pane__player" data-type="player" data-role="builder-player">
        <div ref="miniPlayerHost" class="builder-pane__mini-player">
          <AnimPlayer
            v-if="miniPlayerDimensions.width > 0 && miniPlayerDimensions.height > 0"
            store="main"
            minimal
            :dim="miniPlayerDimensions"
          />
          <div
            v-if="PLAYBACK_PREVIEW_ACTIVE"
            class="builder-pane__player-revert"
            :class="{
              'builder-pane__player-revert--left': hijackedPane === 'right',
              'builder-pane__player-revert--right': hijackedPane !== 'right',
            }"
          >
            <AppTooltip
              :text="
                PREVIEW_PLAYING
                  ? `Return to the loaded pattern (${remainingSeconds}s remaining)`
                  : 'Return to the loaded pattern'
              "
            >
              <template #activator="{ props: tooltipProps }">
                <button
                  v-bind="tooltipProps"
                  class="builder-pane__player-revert-button"
                  type="button"
                  :aria-label="
                    PREVIEW_PLAYING
                      ? `Return player to loaded pattern, ${remainingSeconds} seconds remaining`
                      : 'Return player to loaded pattern'
                  "
                  data-role="builder-preview-countdown"
                  @click="playerStore.endPlaybackPreview"
                >
                  <BaseIcon v-if="!PREVIEW_PLAYING" :path="mdiExitToApp" :size="20" />
                  <template v-else>{{ remainingSeconds }}</template>
                </button>
              </template>
            </AppTooltip>
          </div>
        </div>
      </div>
    </div>

    <PaneSwapButton
      class="builder-pane__swap"
      label="Swap Builder Views"
      :icon="mdiSwapVerticalBold"
      @click="swapViews"
    />
    <PaneSplitter
      data-role="splitter-builder"
      :parent="builderDimensions"
      :object="topDimensions"
      :landscape="false"
      @perc="setTopPercentage"
    />
  </section>
</template>

<script setup lang="ts">
import { mdiExitToApp, mdiMinus, mdiPlus, mdiSwapVerticalBold, mdiUndoVariant } from '@mdi/js'

import BaseIcon from '@/components/icons/BaseIcon.vue'
import AppTooltip from '@/components/AppTooltip.vue'
import PaneSplitter from '@/components/layout/PaneSplitter.vue'
import PaneSwapButton from '@/components/layout/PaneSwapButton.vue'
import VtgTransitionPreviews from '@/features/vtg/components/VtgTransitionPreviews.vue'
import QuickSlotsAction from '@/features/concepts/components/QuickSlotsAction.vue'
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
  reverseVtgTransitionPatternPreview,
  resolveVtgTransitionQuickSlotAnimations,
} from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import { prepareVtg45TransitionPattern } from '@/features/vtg/math/prepareVtg45TransitionPattern'
import { resolveVtgBuilderPreviewRelationships } from '@/features/builder/resolveVtgBuilderPreviewRelationships'
import { useMainPaneStore } from '@/stores/useMainPaneStore'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useQSMainStore } from '@/stores/useQSMainStore'
import type { BuilderPatternDrop } from '@/features/builder/types'
import type { RootDataFinal } from '@/types/AnimTypes'
import AnimPlayer from '@/components/SpiroAnim/AnimPlayer.vue'
import {
  appendVtgBuilderPattern,
  insertVtgBuilderPattern,
  replaceFirstVtgBuilderPattern,
  swapVtgBuilderPatternProps,
} from '@/features/builder/appendVtgBuilderPattern'
import { isVtgPatternSelection } from '@/features/concepts/types'
import { toVtgBuilderDisplayAnimation } from '@/features/builder/toVtgBuilderDisplayAnimation'
import { rootCompile } from '@/math/animation/AnimFunc'
import { findExplicitPlaneOrTurnsFrameIndices } from '@/math/animation/findExplicitPlaneOrTurnsFrameIndices'
import { PROPTIMES } from '@/math/animation/PlayerFunc'
import { useBuilderPaneStore } from '@/features/builder/stores/useBuilderPaneStore'
import { useSplitterStore } from '@/stores/useSplitterStore'
import { usePatternMatchingClient } from '@/features/concepts/composables/usePatternMatchingWorker'
import { createBuilderQuickSlotCandidates } from '@/features/builder/createBuilderQuickSlotCandidates'
import { preserveVtgBuilderScale } from '@/features/builder/preserveVtgBuilderScale'

const props = withDefaults(defineProps<{ allowFirstDrop?: boolean }>(), { allowFirstDrop: false })

const emit = defineEmits<{
  quickSlotsCreate: [animations: readonly RootDataFinal[]]
  previewSelectionChange: [index: number | undefined]
}>()

const paneStore = useMainPaneStore()
const { hijackedPane } = storeToRefs(paneStore)
const builderPaneStore = useBuilderPaneStore()
const { setViewInPane } = builderPaneStore
const { parents, paneVisible, ePlayer, eThumbnails, eTop, eBottom, eHidden } =
  storeToRefs(builderPaneStore)
const splitterStore = useSplitterStore('builder', 'top', 'bottom')
const { topWidth, topHeight, topPerc } = storeToRefs(splitterStore)
const builderPaneHost = ref<HTMLElement>()
const { width: builderWidth, height: builderHeight } = useElementSize(builderPaneHost)
const builderDimensions = computed(() => ({
  width: builderWidth.value,
  height: builderHeight.value,
  perc: 1,
}))
const topDimensions = computed(() => ({
  width: topWidth.value,
  height: topHeight.value,
  perc: 1,
}))
const topFlex = computed(() => `0 0 ${topPerc.value}%`)
const bottomFlex = computed(() => `0 0 ${100 - topPerc.value}%`)
const topStyle = computed<CSSProperties>(() => ({ flex: topFlex.value }))
const bottomStyle = computed<CSSProperties>(() => ({ flex: bottomFlex.value }))

watchImmediate(topPerc, (percentage) => {
  paneVisible.value.top = percentage > 0
  paneVisible.value.bottom = percentage < 100
})

onMounted(() => splitterStore.trackElements(eTop.value, eBottom.value))

const setTopPercentage = (percentage: number) => {
  if (percentage < 5) percentage = 0
  else if (percentage < 20) percentage = 20
  else if (percentage > 95) percentage = 100
  else if (percentage > 80) percentage = 80
  topPerc.value = percentage
}

const swapViews = () => {
  setViewInPane('player', parents.value.player === 'top' ? 'bottom' : 'top')
}
const playerStore = usePlayerStore('main')
const qsStore = useQSMainStore()
const { ROOT, CURRENT } = playerStore.raw()
const { PLAYBACK_MAX, PREVIEW_PLAYING, PLAYBACK_PREVIEW_ACTIVE } = storeToRefs(playerStore)
const remainingSeconds = computed(() =>
  Math.max(0, Math.ceil((PLAYBACK_MAX.value - CURRENT.value) / 1000)),
)
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
const conceptsStore = useConceptsStore()
const {
  bpm,
  scale,
  thick,
  spacing,
  paths,
  hands,
  arms,
  leftPropVisible,
  rightPropVisible,
  leftPropColor,
  rightPropColor,
  prop,
} = storeToRefs(conceptsStore)
const canUndo = computed(() => qsHistory.value.length > 1)
const hasPopulatedQuickSlots = computed(
  () =>
    conceptsStore.quickSlotCount > 0 &&
    conceptsStore.quickSlotPaths.some((path) => typeof path === 'string'),
)
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
const patternMatcher = usePatternMatchingClient(computed(() => true))
const previewRelationships =
  shallowRef<Awaited<ReturnType<typeof resolveVtgBuilderPreviewRelationships>>>()
let previewRelationshipRevision = 0
watchImmediate(resizedPreviewAnimations, async (previews) => {
  const revision = ++previewRelationshipRevision
  if (!previews) {
    previewRelationships.value = undefined
    return
  }

  const relationships = await resolveVtgBuilderPreviewRelationships(
    previews,
    patternMatcher.matchVtg,
  )
  // Keep the mounted controls and their active pointer capture while a beat resize is rematched.
  // Replacing the relationships only after they resolve prevents range input drags from being
  // interrupted by an avoidable thumbnail-grid unmount.
  if (revision === previewRelationshipRevision && relationships) {
    previewRelationships.value = relationships
  }
})
const quickSlotCreationError = ref<string>()
const createBuilderQSlots = async () => {
  quickSlotCreationError.value = undefined
  const previews = resizedPreviewAnimations.value
  if (!preparedPattern.value.supported || !previews) return

  try {
    const resolution = await resolveVtgTransitionQuickSlotAnimations(
      createBuilderQuickSlotCandidates(ROOT.value, previews),
      async (animation, rotationFilter) => {
        const result = await patternMatcher.matchVtg({
          animation,
          preferences: { swapProps: false, reversePlane: false, quarters: 1 },
          rotationFilter,
        })
        if (result.status !== 'matched') return false
        return result.match.initialTurnsOffset === undefined ? 'exact' : 'transitionTurns'
      },
    )
    if (resolution.status === 'partial') {
      console.warn(
        `Builder Quick Slot${resolution.unmatchedSlots.length === 1 ? '' : 's'} ${resolution.unmatchedSlots.join(', ')} did not resolve to a known pattern; the generated extraction${resolution.unmatchedSlots.length === 1 ? ' was' : 's were'} used.`,
      )
    }
    emit('quickSlotsCreate', resolution.animations)
  } catch (error) {
    quickSlotCreationError.value =
      'Quick Slots could not be created. Your current Quick Slots were not changed.'
    console.warn('Builder Quick Slot normalization failed.', error)
  }
}
const builderDisplaySettings = computed(() => ({
  bpm: bpm.value,
  scale: scale.value,
  thick: thick.value,
  spacing: spacing.value,
  paths: paths.value,
  hands: hands.value,
  arms: arms.value,
  leftPropVisible: leftPropVisible.value,
  rightPropVisible: rightPropVisible.value,
  propColors: [leftPropColor.value, rightPropColor.value] as const,
  prop: prop.value,
}))
const selectedPreviewIndex = ref<number>()
const previewRevision = ref(0)
const selectedPreviewAnimation = computed(() => {
  const index = selectedPreviewIndex.value
  const animation = index === undefined ? undefined : resizedPreviewAnimations.value?.[index]
  return animation === undefined
    ? undefined
    : toVtgBuilderDisplayAnimation(animation, builderDisplaySettings.value)
})
const restoreBuilderPlayback = () => {
  const animation = selectedPreviewAnimation.value
  if (animation === undefined) playerStore.clearPlaybackOverride()
  else playerStore.setPlaybackOverride(animation, true)
}
watchImmediate(selectedPreviewAnimation, (animation) => {
  if (PLAYBACK_PREVIEW_ACTIVE.value) return
  if (animation === undefined) playerStore.clearPlaybackOverride()
  else playerStore.setPlaybackOverride(animation, true)
})
watch(PLAYBACK_PREVIEW_ACTIVE, (active) => {
  if (!active) restoreBuilderPlayback()
})
const getPreviewStartMS = (animation: RootDataFinal, index: number): number => {
  const sliceStarts = [
    0,
    ...findExplicitPlaneOrTurnsFrameIndices(animation, 2).map((frameIndex) => frameIndex - 1),
  ]
  const startFrame = sliceStarts[index]
  return startFrame === undefined ? 0 : (PROPTIMES(rootCompile(animation))[0]?.[startFrame] ?? 0)
}
const selectPreview = (index: number | undefined) => {
  if (PLAYBACK_PREVIEW_ACTIVE.value) playerStore.endPlaybackPreview()
  if (index === undefined) {
    const deselectedIndex = selectedPreviewIndex.value
    selectedPreviewIndex.value = undefined
    emit('previewSelectionChange', undefined)
    if (deselectedIndex === undefined) return
    CURRENT.value = getPreviewStartMS(preparedPattern.value.pattern, deselectedIndex)
    return
  }

  selectedPreviewIndex.value = index
  emit('previewSelectionChange', index)
  CURRENT.value = 0
}

const applyBuilderPatternUpdate = (
  updated: RootDataFinal,
  current?: number,
  preservePreviewSelection = false,
) => {
  if (PLAYBACK_PREVIEW_ACTIVE.value) playerStore.endPlaybackPreview()
  if (!preservePreviewSelection) selectPreview(undefined)
  ROOT.value = updated
  previewRevision.value += 1
  if (current !== undefined) CURRENT.value = current
}

const acceptPatternDrop = (drop: BuilderPatternDrop) => {
  const previewCount = resizedPreviewAnimations.value?.length
  if (previewCount === undefined || !isVtgPatternSelection(drop.selection)) return
  const dropAllowed =
    previewCount === 0 ||
    props.allowFirstDrop ||
    (selectedPreviewIndex.value === 0 ? drop.previewIndex === 0 : drop.previewIndex > 0)
  if (!dropAllowed) return

  const replacesFirst = selectedPreviewIndex.value === 0 && drop.previewIndex === 0
  const generated = replacesFirst
    ? replaceFirstVtgBuilderPattern(preparedPattern.value.pattern, drop.selection)
    : drop.previewIndex === previewCount
      ? appendVtgBuilderPattern(preparedPattern.value.pattern, drop.selection)
      : insertVtgBuilderPattern(preparedPattern.value.pattern, drop.selection, drop.previewIndex)
  if (!generated) return
  const updated = replacesFirst ? preserveVtgBuilderScale(ROOT.value, generated) : generated

  const insertedStartMS = getPreviewStartMS(updated, drop.previewIndex)

  applyBuilderPatternUpdate(updated, insertedStartMS, replacesFirst)
}
const updatePreviewBeatCount = (index: number, beatCount: number) => {
  const updated = resizeVtgTransitionPatternPreview(preparedPattern.value.pattern, index, beatCount)
  if (updated !== undefined) applyBuilderPatternUpdate(updated)
}
const deletePreview = (index: number) => {
  const generated = removeVtgTransitionPatternPreview(preparedPattern.value.pattern, index)
  if (generated === undefined) return
  const updated = index === 0 ? preserveVtgBuilderScale(ROOT.value, generated) : generated

  const nextPreviewStartMS =
    selectedPreviewIndex.value === index ? getPreviewStartMS(updated, index) : undefined
  applyBuilderPatternUpdate(updated, nextPreviewStartMS)
}
const reversePreview = (index: number) => {
  const updated = reverseVtgTransitionPatternPreview(preparedPattern.value.pattern, index)
  if (updated === undefined) return

  applyBuilderPatternUpdate(
    updated,
    undefined,
    PREVIEW_PLAYING.value && selectedPreviewIndex.value === index,
  )
}
const swapPreviewProps = (index: number) => {
  const updated = swapVtgBuilderPatternProps(preparedPattern.value.pattern, index)
  if (updated === undefined) return

  applyBuilderPatternUpdate(
    updated,
    undefined,
    PREVIEW_PLAYING.value && selectedPreviewIndex.value === index,
  )
}
const previewRefreshKey = computed(() =>
  [
    bpm.value,
    scale.value,
    spacing.value,
    paths.value,
    hands.value,
    arms.value,
    leftPropColor.value,
    rightPropColor.value,
    prop.value,
    previewRevision.value,
  ].join('|'),
)

const undo = () => {
  const previous = qsStore.undoQS()
  if (previous !== undefined) applyBuilderPatternUpdate(previous)
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
  emit('previewSelectionChange', undefined)
  playerStore.endPlaybackPreview()
})

const exit = () => {
  selectPreview(undefined)
  playerStore.endPlaybackPreview()
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
  display: flex;
  flex-direction: column;
}

.builder-pane__pane {
  position: relative;
  box-sizing: border-box;
  min-height: 0;
  overflow: hidden;
}

.builder-pane__pane--divided {
  border-block-start: 1px solid var(--color-border);
}

.builder-pane__thumbnails,
.builder-pane__player {
  position: absolute;
  inset: 0;
  min-width: 0;
  min-height: 0;
}

.builder-pane__thumbnails {
  container-type: inline-size;
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
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: var(--shadow-sm);
}

.builder-pane__player-revert {
  position: absolute;
  top: 50%;
  z-index: 2;
  transform: translateY(-50%);
}

.builder-pane__player-revert--left {
  left: var(--space-2);
}

.builder-pane__player-revert--right {
  right: var(--space-2);
}

.builder-pane__player-revert-button {
  display: grid;
  width: 3rem;
  height: 3rem;
  padding: 0;
  color: var(--color-action-primary);
  font: inherit;
  font-size: var(--font-size-control);
  font-weight: 800;
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

.builder-pane__qslots {
  display: grid;
  margin-block-start: var(--space-4);
  gap: var(--space-2);
  place-items: center;
}

.builder-pane__qslots p {
  margin: 0;
  color: var(--color-status-error);
  font-size: var(--font-size-concept-control);
  font-weight: 700;
  text-align: center;
}

.builder-pane__controls {
  position: absolute;
  z-index: 3;
  top: calc(var(--space-2) + var(--size-pane-switch-button) + var(--space-2));
  right: calc(var(--space-2) + var(--size-editor-scrollbar));
  display: flex;
  width: max-content;
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

.builder-pane__swap {
  position: absolute;
  right: var(--space-2);
  bottom: var(--space-workspace-bottom-offset);
  z-index: 3;
}

.builder-pane :deep(.pane-splitter) {
  z-index: 3;
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
  top: var(--space-2);
  right: calc(var(--space-2) + var(--size-editor-scrollbar));
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
