<template>
  <div class="timeline-pane" data-role="timeline-pane" :style="containerStyle">
    <div
      v-show="paneVisible.top"
      ref="eTop"
      class="timeline-pane__pane"
      data-role="timeline-top-pane"
      :style="topStyle"
    />
    <div
      v-show="paneVisible.bottom"
      ref="eBottom"
      class="timeline-pane__pane"
      :class="{ 'timeline-pane__pane--divided': paneVisible.top && paneVisible.bottom }"
      data-role="timeline-bottom-pane"
      :style="bottomStyle"
    />

    <div v-show="false" ref="eHidden" data-role="timeline-hidden-pane">
      <div
        v-if="viewVisible.player"
        ref="ePlayer"
        class="timeline-pane__player"
        data-type="player"
        data-role="timeline-player-host"
        :style="playerHostStyle"
      >
        <Player
          :store="props.store"
          data-role="player-view"
          :dim="dPlayer"
          :editor-visible="props.editorVisible"
          :concepts-visible="props.conceptsVisible"
          :controls-start-clearance="playerControlsStartClearance"
          :controls-end-clearance="playerControlsEndClearance"
        />
      </div>
      <div
        v-if="viewVisible.timeline"
        ref="eTimeline"
        class="timeline-pane__timeline"
        data-type="timeline"
        data-role="timeline-content-host"
        :style="timelineHostStyle"
      >
        <Timeline
          :store="props.store"
          data-role="timeline-content"
          :dim="dTimeline"
          :landscape="false"
          :cols="timelineColumns"
          @quick-slot-apply="emit('quickSlotApply', $event)"
          @quick-slot-save="emit('quickSlotSave', $event)"
        />
        <PaneSwapButton
          v-if="canShowAllTimelineProps"
          class="timeline-pane__show-all"
          label="Show Full Timeline"
          :icon="mdiFilterOff"
          :style="showAllTimelineStyle"
          @click="showAllTimelineFrames"
        />
      </div>
    </div>

    <PaneSwapButton
      v-if="splitEnabled"
      class="timeline-pane__swap"
      label="Swap Timeline Views"
      :icon="mdiSwapVerticalBold"
      @click="swapViews"
    />
    <PaneSplitter
      v-if="splitEnabled"
      data-role="splitter-timeline"
      :parent="dim"
      :object="topDim"
      :landscape="false"
      @perc="setTopPercentage"
    />
  </div>
</template>

<script setup lang="ts">
import { mdiFilterOff, mdiSwapVerticalBold } from '@mdi/js'

import Player from '@/components/SpiroAnim/AnimPlayer.vue'
import Timeline from '@/components/SpiroAnim/AnimTimeline.vue'
import PaneSplitter from '@/components/layout/PaneSplitter.vue'
import PaneSwapButton from '@/components/layout/PaneSwapButton.vue'
import { useCollapsibleVerticalPanes } from '@/composables/useCollapsibleVerticalPanes'
import { useViewDimensions } from '@/composables/useViewDimensions'
import { useTimelinePaneStore } from '@/features/timeline/stores/useTimelinePaneStore'
import { resolveEmbeddedTimelineColumns } from '@/features/timeline/resolveEmbeddedTimelineColumns'
import { usePropertiesStore } from '@/features/editor/stores/usePropertiesStore'
import { useEditorAccessStore } from '@/features/editor/stores/useEditorAccessStore'
import { useMainPaneStore } from '@/stores/useMainPaneStore'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useSplitterStore } from '@/stores/useSplitterStore'
import {
  PANE_ADJACENT_CONTROL_START_INSET,
  PANE_CORNER_CONTROL_CLEARANCE,
  PANE_CORNER_CONTROL_START_INSET,
  PANE_CYCLE_CONTROL_START_CLEARANCE,
} from '@/components/layout/paneControlLayout'

const emit = defineEmits<{
  quickSlotApply: [path: string]
  quickSlotSave: [slot: number]
}>()

const props = withDefaults(
  defineProps<{
    dim: { width: number; height: number; perc: number }
    editorVisible?: boolean
    playerVisible?: boolean
    paneCycleControlsVisible?: boolean
    conceptsVisible?: boolean
    store?: string
  }>(),
  {
    editorVisible: false,
    playerVisible: false,
    paneCycleControlsVisible: true,
    conceptsVisible: false,
    store: 'main',
  },
)

const dim: Readonly<typeof props.dim> = readonly(props.dim)
const mainPaneStore = useMainPaneStore()
const { parents: mainParents } = storeToRefs(mainPaneStore)
const playerStore = usePlayerStore(props.store)
const { ROOT } = playerStore.raw()
const { ETIMES, PTIMES, UTIMES } = storeToRefs(playerStore)
const { pSELECTED, showFullTimeline } = storeToRefs(usePropertiesStore(props.store))
const { editorLoaded } = storeToRefs(useEditorAccessStore())
const paneStore = useTimelinePaneStore()
const { setViewInPane } = paneStore
const { parents, paneVisible, viewVisible, ePlayer, eTimeline, eTop, eBottom, eHidden } =
  storeToRefs(paneStore)
const splitterStore = useSplitterStore('timeline', 'top', 'bottom')
const { topWidth, topHeight, bottomWidth, bottomHeight, topPerc } = storeToRefs(splitterStore)

const topDim = computed(() => ({
  width: topWidth.value,
  height: topHeight.value,
  perc: dim.perc,
}))
const bottomDim = computed(() => ({
  width: bottomWidth.value,
  height: bottomHeight.value,
  perc: dim.perc,
}))
const paneDimensions = { top: topDim, bottom: bottomDim }
const dPlayer = useViewDimensions('player', parents, paneDimensions)
const dTimeline = useViewDimensions('timeline', parents, paneDimensions)

const fullAnimationTimes = computed(() => {
  const times = [...new Set(PTIMES.value.flat())].sort((first, second) => first - second)
  const overallEnd = UTIMES.value.at(-1) ?? 0

  if (times.length === 0) return [0]
  return overallEnd > times.at(-1)! ? [...times, overallEnd] : times
})
const isShowingFullTimeline = computed(
  () =>
    ETIMES.value.length === fullAnimationTimes.value.length &&
    ETIMES.value.every((time, index) => time === fullAnimationTimes.value[index]),
)
const hasHiddenTimelineProps = computed(() =>
  ROOT.value.props.some((_, index) => pSELECTED.value[index] !== true),
)
const canShowAllTimelineProps = computed(
  () =>
    editorLoaded.value &&
    mainParents.value.editor === 'hidden' &&
    !showFullTimeline.value &&
    (!isShowingFullTimeline.value || hasHiddenTimelineProps.value),
)

const showAllTimelineFrames = () => {
  showFullTimeline.value = true
}

const splitEnabled = computed(() => !props.playerVisible)
const timelineColumns = computed(() => resolveEmbeddedTimelineColumns(viewVisible.value.player))
const playerOwnsBottomEdge = computed(
  () =>
    parents.value.player === 'bottom' ||
    (parents.value.player === 'top' && !paneVisible.value.bottom),
)
const playerControlsStartClearance = computed(() =>
  props.paneCycleControlsVisible && playerOwnsBottomEdge.value
    ? PANE_CYCLE_CONTROL_START_CLEARANCE
    : '0px',
)
const playerControlsEndClearance = computed(() =>
  splitEnabled.value && playerOwnsBottomEdge.value ? PANE_CORNER_CONTROL_CLEARANCE : '0px',
)
const timelineOwnsBottomEdge = computed(
  () =>
    parents.value.timeline === 'bottom' ||
    (parents.value.timeline === 'top' && !paneVisible.value.bottom),
)
const showAllTimelineStyle = computed<CSSProperties>(() => ({
  left:
    props.paneCycleControlsVisible && timelineOwnsBottomEdge.value
      ? PANE_ADJACENT_CONTROL_START_INSET
      : PANE_CORNER_CONTROL_START_INSET,
}))
const paneBottomOffset = (ownsBottomEdge: boolean): string =>
  ownsBottomEdge ? 'var(--space-workspace-bottom-offset)' : 'var(--space-pane-switch-bottom)'
const playerHostStyle = computed<CSSProperties>(() => ({
  '--space-pane-bottom-offset': paneBottomOffset(playerOwnsBottomEdge.value),
}))
const timelineHostStyle = computed<CSSProperties>(() => ({
  '--space-pane-bottom-offset': paneBottomOffset(timelineOwnsBottomEdge.value),
}))
const primaryPane = computed<'top' | 'bottom'>(() =>
  parents.value.timeline === 'top' ? 'top' : 'bottom',
)
const { topFlex, bottomFlex, setTopPercentage } = useCollapsibleVerticalPanes({
  topPercentage: topPerc,
  splitEnabled,
  primaryPane,
  paneVisible,
})

const topStyle = computed<CSSProperties>(() => ({ flex: topFlex.value }))
const bottomStyle = computed<CSSProperties>(() => ({ flex: bottomFlex.value }))
const containerStyle = computed<CSSProperties>(() => ({
  width: `${dim.width}px`,
  height: `${dim.height}px`,
}))

onMounted(() => splitterStore.trackElements(eTop.value, eBottom.value))

const swapViews = () => {
  setViewInPane('player', parents.value.player === 'top' ? 'bottom' : 'top')
}
</script>

<style scoped>
.timeline-pane {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow: clip;
  flex-direction: column;
}

.timeline-pane__pane {
  position: relative;
  box-sizing: border-box;
  min-width: 0;
  min-height: 0;
  overflow: clip;
}

.timeline-pane__pane--divided {
  border-block-start: 1px solid var(--color-border);
}

.timeline-pane__player {
  position: absolute;
  inset: 0;
  min-width: 0;
  min-height: 0;
  overflow: clip;
}

.timeline-pane__timeline {
  position: absolute;
  inset: 0;
  min-width: 0;
  min-height: 0;
  overflow: clip;
}

.timeline-pane__swap {
  position: absolute;
  right: var(--space-2);
  bottom: var(--space-workspace-bottom-offset);
  z-index: 1010;
}

.timeline-pane__show-all {
  position: absolute;
  bottom: var(--space-pane-bottom-offset);
  z-index: 1010;
}

.timeline-pane :deep(.pane-splitter) {
  z-index: 1010;
}
</style>
