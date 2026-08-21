<template>
  <div class="spiro-workspace" data-role="main-container" :style="containerStyle">
    <div v-show="paneVisible.left" ref="eLeft" data-role="left-pane" :style="leftStyle">
      <PaneRotate pane="left" />
      <PaneSwapButton
        v-if="parents.timeline === 'left' && canShowAllTimelineProps"
        class="timeline-show-all"
        label="Show Full Timeline"
        :icon="mdiFilterOff"
        @click="showAllTimelineFrames"
      />
    </div>
    <div v-show="paneVisible.right" ref="eRight" data-role="right-pane" :style="rightStyle">
      <PaneRotate pane="right" />
      <PaneSwapButton
        v-if="parents.timeline === 'right' && canShowAllTimelineProps"
        class="timeline-show-all"
        label="Show Full Timeline"
        :icon="mdiFilterOff"
        @click="showAllTimelineFrames"
      />
    </div>
    <div v-show="false" ref="eHidden" data-role="hidden-pane">
      <Player
        v-if="viewVisible.player"
        ref="cPlayer"
        store="main"
        data-type="player"
        data-role="player-view"
        :dim="dPlayer"
        :editor-visible="viewVisible.editor"
      />
      <Editor
        v-if="viewVisible.editor"
        ref="cEditor"
        store="main"
        data-type="editor"
        data-role="editor-view"
        :dim="dEditor"
        :landscape="isLandscape"
        :vtl="viewVisible.timeline"
        @quick-slot-apply="applyQuickSlotFromView($event, 'editor')"
        @quick-slot-save="saveCurrentPatternToQuickSlot"
      />
      <Timeline
        v-if="viewVisible.timeline"
        ref="cTimeline"
        store="main"
        data-type="timeline"
        data-role="timeline-view"
        :dim="dTimeline"
        :landscape="isLandscape"
        @quick-slot-apply="applyQuickSlotFromView($event, 'timeline')"
        @quick-slot-save="saveCurrentPatternToQuickSlot"
      />
      <ConceptsPane
        v-if="viewVisible.concepts"
        ref="cConcepts"
        :animation="ROOT"
        :animation-ready="animationReady"
        :builder-active="paneStore.isPaneHijacked"
        :builder-full-catalog="builderFullCatalog"
        :builder-full-catalog-forced="builderFullCatalogForced"
        :builder-full-grid="builderFullGrid"
        data-type="concepts"
        data-role="concepts-view"
        @pattern-select="applyConceptPattern"
        @pattern-preview="previewConceptPattern"
        @customize="applyBuilderCustomization"
        @quick-slot-apply="applyQuickSlotFromView($event, 'concepts')"
        @quick-slot-save="saveCurrentPatternToQuickSlot"
        @quick-slots-create="saveAnimationsToQuickSlots"
        @builder-open="toggleBuilder"
        @update:builder-full-grid="builderFullGrid = $event"
      />
      <BuilderPane
        v-if="viewVisible.builder"
        ref="cBuilder"
        data-type="builder"
        data-role="builder-pane-view"
        :allow-first-drop="builderFullGrid"
        @quick-slots-create="saveAnimationsToQuickSlots"
        @preview-selection-change="selectedBuilderPreviewIndex = $event"
      />
    </div>
    <AppNavigationMenu />
    <PaneSplitter
      data-role="splitter-main"
      :parent="parentDim"
      :object="leftDim"
      :landscape="isLandscape"
      @perc="onEmitPerc"
    />
  </div>
</template>

<script setup lang="ts">
// src\views\SpiroAnim.vue

import PaneSplitter from '@/components/layout/PaneSplitter.vue'
import PaneRotate from '@/components/layout/PaneRotate.vue'
import PaneSwapButton from '@/components/layout/PaneSwapButton.vue'
import AppNavigationMenu from '@/components/layout/AppNavigationMenu.vue'

import Player from '@/components/SpiroAnim/AnimPlayer.vue'
import Editor from '@/components/SpiroAnim/AnimEditor.vue'
import Timeline from '@/components/SpiroAnim/AnimTimeline.vue'
import ConceptsPane from '@/features/concepts/components/ConceptsPane.vue'
import BuilderPane from '@/features/builder/components/BuilderPane.vue'
import { applyConceptPattern as createConceptPattern } from '@/features/concepts/applyConceptPattern'
import type { ConceptPatternSelection } from '@/features/concepts/types'
import { applyVtgCustomization } from '@/features/vtg/applyVtgCustomization'
import { toVtgBuilderDisplayAnimation } from '@/features/builder/toVtgBuilderDisplayAnimation'
import type { VtgPatternSelection } from '@/features/vtg/types'

import { useViewDimensions } from '@/composables/useViewDimensions'
import { useScrollSelectScale } from '@/composables/useScrollSelectScale'
import { useMainRoute } from '@/composables/useMainRoute'
import { useSpiroAnimKeyboard } from '@/composables/useSpiroAnimKeyboard'

import { useViewportStore } from '@/stores/useViewportStore'
import { useSplitterStore } from '@/stores/useSplitterStore'
import { useMainPaneStore } from '@/stores/useMainPaneStore'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useQSMainStore } from '@/stores/useQSMainStore'
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'
import { findConceptForPath } from '@/features/concepts/conceptRoutes'
import { useQueryVersionStore } from '@/stores/useQueryVersionStore'
import { UnsupportedSpiroAnimQSVersionError } from '@/services/query/versions'
import { usePropertiesStore } from '@/features/editor/stores/usePropertiesStore'
import { mdiFilterOff } from '@mdi/js'

useScrollSelectScale()
const { animationReady, saveCurrentPatternToQuickSlot, saveAnimationsToQuickSlots } = useMainRoute() // Handles updates to route path and query
useSpiroAnimKeyboard()

const { viewWidth, viewHeight, viewLeft, viewTop, isLandscape } = storeToRefs(useViewportStore())

const splitterStore = useSplitterStore('main')
const { leftWidth, leftHeight, rightWidth, rightHeight, leftPerc } = storeToRefs(splitterStore)

const paneStore = useMainPaneStore()
const playerStore = usePlayerStore('main')
const conceptsStore = useConceptsStore()
const qsStore = useQSMainStore()
const queryVersionStore = useQueryVersionStore()
const { ROOT } = playerStore.raw()
const selectedBuilderPreviewIndex = ref<number>()
const builderFullGrid = ref(false)
const builderFullCatalogForced = computed(
  () =>
    paneStore.isPaneHijacked &&
    (ROOT.value.props.length === 0 || selectedBuilderPreviewIndex.value === 0),
)
const builderFullCatalog = computed(() => builderFullCatalogForced.value || builderFullGrid.value)
const { ETIMES, PTIMES, UTIMES } = storeToRefs(playerStore)
const { pSELECTED, showFullTimeline } = storeToRefs(usePropertiesStore('main'))
const { registerComponentEl } = paneStore

const {
  parents,
  paneVisible,
  viewVisible,
  ePlayer,
  eEditor,
  eTimeline,
  eConcepts,
  eBuilder,
  eLeft,
  eRight,
  eHidden,
} = storeToRefs(paneStore)

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
    parents.value.editor === 'hidden' &&
    !showFullTimeline.value &&
    (!isShowingFullTimeline.value || hasHiddenTimelineProps.value),
)

function showAllTimelineFrames() {
  showFullTimeline.value = true
}

watch(
  () => parents.value.editor,
  (editorPane) => {
    if (editorPane !== 'hidden') showFullTimeline.value = false
  },
)

// Component references
const cPlayer = ref<ComponentPublicInstance>()
const cEditor = ref<ComponentPublicInstance>()
const cTimeline = ref<ComponentPublicInstance>()
const cConcepts = ref<ComponentPublicInstance>()
const cBuilder = ref<ComponentPublicInstance>()

// Supply root elements from components to Pane Store
registerComponentEl(cPlayer, ePlayer)
registerComponentEl(cEditor, eEditor)
registerComponentEl(cTimeline, eTimeline)
registerComponentEl(cConcepts, eConcepts)
registerComponentEl(cBuilder, eBuilder)

const applyConceptPattern = (selection: ConceptPatternSelection) => {
  const animation = createConceptPattern(ROOT.value, selection)
  if (animation) {
    ROOT.value = animation
    playerStore.cameraReset = Symbol()
  }
}

const applyBuilderCustomization = (selection: ConceptPatternSelection) => {
  if (playerStore.PLAYBACK_PREVIEW_ACTIVE) playerStore.endPlaybackPreview()
  ROOT.value = applyVtgCustomization(ROOT.value, selection as VtgPatternSelection)
}

const previewConceptPattern = (selection: ConceptPatternSelection) => {
  if (!paneStore.isPaneHijacked) return
  const animation = createConceptPattern(ROOT.value, selection)
  if (!animation) return

  playerStore.startPlaybackPreview(toVtgBuilderDisplayAnimation(animation, conceptsStore.scale))
}

const toggleBuilder = () => {
  builderFullGrid.value = false
  if (paneStore.isPaneHijacked) paneStore.exitPaneHijack()
  else paneStore.hijackOppositePane('builder', 'concepts')
}

watch(
  () => paneStore.isPaneHijacked,
  async () => {
    await nextTick()
    const conceptsPane = parents.value.concepts
    const pane =
      conceptsPane === 'left' ? eLeft.value : conceptsPane === 'right' ? eRight.value : undefined
    if (!pane) return

    // Changing Builder controls above the focused toggle can make Chromium scroll an
    // overflow-hidden pane to retain the focus position. Reset that inaccessible offset after
    // the DOM update and once more after layout settles.
    pane.scrollTop = 0
    requestAnimationFrame(() => {
      pane.scrollTop = 0
    })
  },
  { flush: 'post' },
)

const applyQuickSlot = async (path: string): Promise<boolean> => {
  const conceptRoute = findConceptForPath(path)
  const query = Object.fromEntries(new URLSearchParams(path.split('?', 2)[1] ?? ''))
  try {
    const animation = await qsStore.decodeVer(query)
    if (conceptRoute) {
      conceptsStore.selectedConcept = conceptRoute.concept
      conceptsStore.qtrEnabled = conceptRoute.qtrEnabled
    }
    ROOT.value = animation
    playerStore.cameraReset = Symbol()
    return true
  } catch (error: unknown) {
    if (error instanceof UnsupportedSpiroAnimQSVersionError) {
      queryVersionStore.reportUnsupportedVersion(error.version)
    }
    console.warn('Failed to apply animation data from the Quick Slot.', error)
    return false
  }
}

type QuickSlotHostView = 'editor' | 'timeline' | 'concepts'
type QuickSlotTargetView = 'player' | QuickSlotHostView

const quickSlotViewByRoutePart: Readonly<Record<string, QuickSlotTargetView>> = {
  play: 'player',
  player: 'player',
  edit: 'editor',
  editor: 'editor',
  time: 'timeline',
  timeline: 'timeline',
  cnc: 'concepts',
  concepts: 'concepts',
  vtg: 'concepts',
  qtr: 'concepts',
  '8stp': 'concepts',
  qst: 'concepts',
  to: 'concepts',
  tka: 'concepts',
  'vulcan-tech-gospel': 'concepts',
  quarterspacing: 'concepts',
  'eight-step': 'concepts',
  'quarter-space-tech': 'concepts',
  'third-order': 'concepts',
  'the-kinetic-alphabet': 'concepts',
}

const quickSlotTargetViews = (path: string): QuickSlotTargetView[] => {
  const page = path.split(/[?#]/, 1)[0]?.replace(/^\//, '')
  if (!page) return []
  const fullPageView = quickSlotViewByRoutePart[page]
  if (fullPageView) return [fullPageView]
  return page
    .split('-')
    .map((part) => quickSlotViewByRoutePart[part])
    .filter((view): view is QuickSlotTargetView => view !== undefined)
}

const applyQuickSlotFromView = async (path: string, sourceView: QuickSlotHostView) => {
  if (!(await applyQuickSlot(path))) return

  const sourcePane = parents.value[sourceView]
  if (sourcePane === 'hidden') return

  const otherPane = sourcePane === 'left' ? 'right' : 'left'
  const otherView = Object.entries(parents.value).find(([, pane]) => pane === otherPane)?.[0]
  const targetView =
    quickSlotTargetViews(path).find((view) => view !== otherView) ?? quickSlotTargetViews(path)[0]
  if (sourceView === 'editor' && targetView === 'timeline') return
  if (targetView && targetView !== sourceView) paneStore.setViewInPane(targetView, sourcePane)
}

const parentDim = computed(() => ({ width: viewWidth.value, height: viewHeight.value }))

const leftDim = computed(() => {
  const width = viewWidth.value
  const height = viewHeight.value
  return {
    width: leftWidth.value,
    height: leftHeight.value,
    perc: isLandscape.value
      ? Math.round((leftWidth.value / width) * 100)
      : Math.round((leftHeight.value / height) * 100),
  }
})

const rightDim = computed(() => {
  const width = viewWidth.value
  const height = viewHeight.value
  return {
    width: rightWidth.value,
    height: rightHeight.value,
    perc: isLandscape.value
      ? Math.round((rightWidth.value / width) * 100)
      : Math.round((rightHeight.value / height) * 100),
  }
})

// Dimensions of each pane for tracking view dimensions
const dimComputeds = {
  left: leftDim,
  right: rightDim,
}

// Dimensions of the current pane a view is mounted in, to pass into each component
const dPlayer = useViewDimensions('player', parents, dimComputeds)
const dEditor = useViewDimensions('editor', parents, dimComputeds)
const dTimeline = useViewDimensions('timeline', parents, dimComputeds)

const flexDirection = ref<CSSProperties['flex-direction']>('row')
const flexLeft = ref<CSSProperties['flex']>('0 0 0')
const flexRight = ref<CSSProperties['flex']>('0 0 0')

// Change layout based on isLandscape
watchImmediate(isLandscape, (val) => {
  if (val) flexDirection.value = 'row'
  else flexDirection.value = 'column'
})

// Percentage updates
watchImmediate(leftPerc, (val) => {
  // Update sizes of left/right
  flexLeft.value = `0 0 ${val}%`
  flexRight.value = `0 0 ${100 - val}%`

  const vis = paneVisible.value
  if (val <= 0) vis.left = !(vis.right = true)
  else if (val >= 100) vis.right = !(vis.left = true)
  else vis.right = vis.left = true
})

onMounted(() => {
  // Register elements with splitterStore
  splitterStore.trackElements(eLeft.value, eRight.value)
})

// Emitted from PaneSplitter
const onEmitPerc = (val: number) => {
  if (val < 5)
    val = 0 // Snap to the left
  else if (val < 20) val = 20
  else if (val > 95)
    val = 100 // Snap to the right
  else if (val > 80) val = 80
  leftPerc.value = val
}

const containerStyle = computed<CSSProperties>(() => ({
  width: `${viewWidth.value}px`,
  height: `${viewHeight.value}px`,
  // Mobile browser chrome can move the visual viewport relative to the layout viewport.
  left: `${viewLeft.value}px`,
  top: `${viewTop.value}px`,
  position: 'fixed',
  display: 'flex',
  'flex-direction': flexDirection.value,
}))

const leftStyle = computed<CSSProperties>(() => ({
  flex: flexLeft.value,
  position: 'relative',
  overflow: 'hidden',
  'overflow-anchor': 'none',
}))

const rightStyle = computed<CSSProperties>(() => ({
  flex: flexRight.value,
  position: 'relative',
  'overflow-x': 'auto',
  'overflow-y': 'hidden',
  'overflow-anchor': 'none',
}))
</script>

<style scoped>
.spiro-workspace {
  min-inline-size: 0;
  min-block-size: 0;
  background:
    radial-gradient(
      ellipse at 8% 12%,
      color-mix(in srgb, var(--color-action-primary) 24%, transparent),
      transparent 42%
    ),
    radial-gradient(
      ellipse at 92% 88%,
      color-mix(in srgb, var(--color-workspace-separator) 26%, transparent),
      transparent 46%
    ),
    linear-gradient(
      132deg,
      transparent 24%,
      color-mix(in srgb, var(--color-workspace-boundary) 12%, transparent) 48%,
      transparent 72%
    ),
    repeating-linear-gradient(
      118deg,
      transparent 0 5rem,
      color-mix(in srgb, var(--color-border) 8%, transparent) 5rem 5.08rem,
      transparent 5.08rem 10rem
    ),
    var(--color-canvas);
}

/* Keep keyboard focus visible without the heavy outlines used outside the workspace. */
.spiro-workspace :deep(:focus-visible) {
  outline: 1px solid color-mix(in srgb, var(--color-action-primary) 55%, var(--color-text-muted));
  outline-offset: 1px;
}

.spiro-workspace :deep(.range--custom:focus-visible::-webkit-slider-thumb),
.spiro-workspace :deep(.range--selection:focus-visible::-webkit-slider-thumb) {
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-action-primary) 40%, transparent);
}

.spiro-workspace :deep(.range--custom:focus-visible::-moz-range-thumb),
.spiro-workspace :deep(.range--selection:focus-visible::-moz-range-thumb) {
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-action-primary) 40%, transparent);
}

.timeline-show-all {
  position: absolute;
  bottom: var(--space-workspace-bottom-offset);
  left: calc(1px + var(--size-pane-switch-button) + var(--space-2));
  z-index: 1010;
}
</style>
