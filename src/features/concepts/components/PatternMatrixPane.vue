<template>
  <section
    ref="paneElement"
    class="vtg-pane"
    aria-labelledby="vtg-pane-title"
    data-role="vtg-pane"
    :data-blank-width="blankWidth"
    :data-blank-height="blankHeight"
    :data-selected-cell="selectedCellReference"
    :data-speed-ratio="speedRatio"
    data-concept="vtg"
  >
    <h1 id="vtg-pane-title" class="vtg-pane__visually-hidden">VTG generator</h1>

    <div class="vtg-top-options">
      <fieldset class="vtg-speed-ratio">
        <legend class="vtg-pane__visually-hidden">Speed ratio</legend>
        <div class="vtg-radio-options">
          <AppTooltip
            v-for="ratio in speedRatios"
            :key="ratio"
            :text="`Use the ${ratio} speed ratio`"
          >
            <template #activator="{ props: activatorProps }">
              <label v-bind="activatorProps">
                <input
                  v-model="speedRatio"
                  type="radio"
                  name="vtg-speed-ratio"
                  :value="ratio"
                  :aria-label="`Use the ${ratio} speed ratio`"
                />
                <span>{{ ratio }}</span>
              </label>
            </template>
          </AppTooltip>
        </div>
      </fieldset>

      <PatternTransformControls
        :reverse-label="isQtr ? 'Flip' : '180°'"
        :reverse-description="
          isQtr
            ? shape === 'box'
              ? 'Flip QTR direction'
              : 'Flip QTR orientation and direction'
            : 'Rotate motion plane 180 degrees'
        "
        @reset="resetPatternControls"
      />
    </div>

    <div class="vtg-board">
      <AppTooltip class="vtg-shuffle-tooltip" text="Select a random VTG pattern">
        <template #activator="{ props: activatorProps }">
          <button
            v-bind="activatorProps"
            type="button"
            class="vtg-shuffle"
            aria-label="Shuffle VTG rules"
            data-role="vtg-shuffle"
            @click="selectRandomTile"
          >
            <BaseIcon :path="mdiShuffleVariant" size="42%" />
          </button>
        </template>
      </AppTooltip>

      <div class="vtg-column-headers" data-role="vtg-column-headers">
        <VtgRuleCard
          v-for="rule in columnRules"
          :key="`column-${rule.number}`"
          :labels="rule.labels"
          :display-labels="isQtr ? qtrColumnRuleLabels[rule.number] : undefined"
          :number="rule.number"
          :diagram="rule.diagram"
          :description="rule.description"
          orientation="vertical"
          :accent="rule.number === selectedCell?.column"
          :show-divider="!isQtr"
          :show-props="!isQtr"
          :tooltip-disabled="isQtr"
          :mirror-props="!isQtr"
          @select="selectColumn(rule.number)"
        />
      </div>

      <div class="vtg-sidebar" data-role="vtg-sidebar">
        <VtgRuleCard
          v-for="rule in displayedSideRules"
          :key="`side-${rule.number}`"
          :labels="rule.labels"
          :display-labels="isQtr ? qtrSideRuleLabels[rule.number] : undefined"
          :number="rule.number"
          :diagram="rule.diagram"
          :description="rule.description"
          orientation="horizontal"
          :accent="rule.number === selectedCell?.row"
          :show-divider="!isQtr"
          :prop-colors="isQtr ? vtgHeaderPropColors : undefined"
          :tooltip-disabled="isQtr"
          :reversed="reversePlane"
          :mirror-props="!isQtr"
          @select="selectRow(rule.number)"
        />
      </div>

      <div class="vtg-matrix" data-role="vtg-matrix">
        <div class="vtg-tile-grid">
          <BaseTooltip
            v-for="tile in matrixTiles"
            :key="tile.reference"
            class="vtg-tile-tooltip"
            :text="getTileDescription(tile)"
          >
            <template #activator="{ props: activatorProps }">
              <button
                v-bind="activatorProps"
                type="button"
                class="vtg-tile"
                :class="{
                  'vtg-tile--highlighted': isTileHighlighted(tile),
                  'vtg-tile--selected': tile.reference === selectedCellReference,
                }"
                :aria-label="`${tile.label}, cell ${tile.reference}`"
                :aria-pressed="tile.reference === selectedCellReference"
                :data-board-column="tile.boardColumn"
                :data-board-row="tile.boardRow"
                :data-cell-reference="tile.reference"
                data-role="vtg-tile"
                @click="selectTile(tile)"
              >
                {{ tile.label }}
              </button>
              <AppTooltip
                v-if="tile.reference === selectedCellReference && isSpinToggleCell(tile.reference)"
                class="vtg-spin-toggle-tooltip"
                :text="`Use the ${isAnti ? 'Spin' : 'Anti'} variant for this cell`"
              >
                <template #activator="{ props: controlActivatorProps }">
                  <button
                    v-bind="controlActivatorProps"
                    type="button"
                    class="vtg-tile__spin-toggle"
                    :class="{
                      'vtg-tile__spin-toggle--bottom': isBottomSpinToggleCell(tile.reference),
                    }"
                    :aria-label="`Use ${isAnti ? 'Spin' : 'Anti'} pattern for cell ${tile.reference}`"
                    :aria-pressed="isAnti"
                    data-role="vtg-spin-toggle"
                    @click.stop="toggleSpinDirection(tile)"
                  >
                    {{ isAnti ? 'Anti' : 'Spin' }}
                  </button>
                </template>
              </AppTooltip>
            </template>
            <template #html>
              <span class="vtg-tile-tooltip__text">{{ getTileDescription(tile) }}</span>
            </template>
          </BaseTooltip>
        </div>

        <div class="vtg-blank-grid">
          <div
            v-for="(dimensions, index) in blankDimensions"
            :key="`blank-${index}`"
            class="vtg-blank"
            :class="`vtg-blank--${index + 1}`"
            data-role="vtg-blank"
            :data-blank-index="index"
            :data-width="dimensions.width"
            :data-height="dimensions.height"
            aria-hidden="true"
          >
            <img
              v-if="previewUrls[index]"
              :src="previewUrls[index]"
              alt=""
              class="vtg-blank__preview"
              data-role="vtg-preview"
              :data-preview-reference="patternPreviewReferences[index]"
            />
          </div>
        </div>
      </div>
    </div>

    <ConceptAnimationControls :animation="animation">
      <template #before-controls>
        <PatternPlaybackControls
          v-model:beat="beat"
          v-model:qtr="isQtr"
          v-model:transition="transition"
          concept="vtg"
          :transition-available="transitionAvailable"
        >
          <template #before-controls>
            <PatternShapeControls v-model:shape="shape" />
          </template>
          <template #after-transition>
            <AppTooltip
              v-if="transition && transitionAvailable"
              text="Choose the beat interval between 45-degree transitions"
            >
              <template #activator="{ props: activatorProps }">
                <label v-bind="activatorProps" class="vtg-transition-beats">
                  <span class="vtg-pane__visually-hidden">45 degree transition beats</span>
                  <select
                    v-model.number="transitionBeats"
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
          </template>
        </PatternPlaybackControls>
      </template>
      <template #after-controls>
        <AppTooltip
          v-if="transition && transitionAvailable"
          text="Transition one prop at a time for four total changes"
        >
          <template #activator="{ props: activatorProps }">
            <label v-bind="activatorProps" class="vtg-transition-option">
              <input
                v-model="transitionQuad"
                type="checkbox"
                aria-label="Transition one prop at a time for four total changes"
                data-role="vtg-transition-quad"
              />
              <span>Quad</span>
            </label>
          </template>
        </AppTooltip>
        <AppTooltip
          v-if="transition && transitionAvailable && transitionQuad"
          text="Start the 45-degree transition with the second prop"
        >
          <template #activator="{ props: activatorProps }">
            <label v-bind="activatorProps" class="vtg-transition-option">
              <input
                v-model="transitionSecond"
                type="checkbox"
                aria-label="Start the 45-degree transition with the second prop"
                data-role="vtg-transition-second"
              />
              <span>Second</span>
            </label>
          </template>
        </AppTooltip>
      </template>
    </ConceptAnimationControls>
  </section>
</template>

<script setup lang="ts">
import { mdiShuffleVariant } from '@mdi/js'

import BaseIcon from '@/components/icons/BaseIcon.vue'
import AppTooltip from '@/components/AppTooltip.vue'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import { COLORS, COLSET } from '@/domain/animation/AnimStruct'
import ConceptAnimationControls from '@/features/concepts/components/ConceptAnimationControls.vue'
import PatternPlaybackControls from '@/features/concepts/components/PatternPlaybackControls.vue'
import PatternShapeControls from '@/features/concepts/components/PatternShapeControls.vue'
import PatternTransformControls from '@/features/concepts/components/PatternTransformControls.vue'
import { describePatternSelectionRelationships } from '@/features/concepts/math/describePatternSelectionRelationships'
import { isPatternPropVisible } from '@/features/concepts/patternPropVisibility'
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'
import type { ConceptPatternSelection } from '@/features/concepts/types'
import { qtrColumnRuleLabels, qtrSideRuleLabels } from '@/features/vtg/qtr/data/qtrLabels'
import { createQtrSideDiagram, vtgPropBounds } from '@/features/vtg/qtr/math/createQtrHeaderDiagram'
import VtgRuleCard from '@/features/vtg/components/VtgRuleCard.vue'
import {
  patternPreviewReferences,
  usePatternPreviews,
} from '@/features/concepts/composables/usePatternPreviews'
import {
  vtgBpmControl,
  vtgPlayerSettings,
  vtgPropSettings,
  vtgScaleControl,
  vtgSpacingControl,
  vtgThickControl,
} from '@/features/vtg/data/vtgPlayerSettings'
import type {
  QtrPatternSelection,
  VtgCellAddress,
  VtgBeat,
  VtgCellReference,
  VtgPatternLabel,
  VtgPropPlacement,
  VtgRuleDiagram,
  VtgRuleNumber,
  VtgRuleSpec,
  VtgPatternSelection,
  VtgTransitionBeats,
} from '@/features/vtg/types'
import {
  supportsVtgQtrTransition,
  vtgDefaultTransitionBeats,
  vtgSpeedRatios,
  vtgTransitionBeats,
} from '@/features/vtg/types'
import type { RootDataFinal } from '@/types/AnimTypes'
import type { PatternShape } from '@/types/PatternTypes'
import { toColor } from '@/utils/UtilFunc'
import type { PatternMatchingClient } from '@/workers/pattern-matching/PatternMatchingWorkerTypes'

interface BlankDimensions {
  width: number
  height: number
}

interface VtgMatrixTile {
  label: VtgPatternLabel
  description: string
  column: VtgRuleNumber
  row: VtgRuleNumber
  boardColumn: number
  boardRow: number
  reference: VtgCellReference
}

type VtgMatrixAddress = Omit<VtgMatrixTile, 'label' | 'description'>

const props = withDefaults(
  defineProps<{
    animation?: RootDataFinal
    animationReady?: boolean
    patternMatcher?: PatternMatchingClient
  }>(),
  {
    animationReady: true,
  },
)

const emit = defineEmits<{
  patternSelect: [selection: ConceptPatternSelection]
}>()

const speedRatios = vtgSpeedRatios
const conceptsStore = useConceptsStore()
const {
  speedRatio,
  swapProps,
  reversePlane,
  bpm,
  scale,
  thick,
  spacing,
  paths,
  hands,
  arms,
  leftPropVisible,
  rightPropVisible,
  qtrEnabled: isQtr,
} = storeToRefs(conceptsStore)
const isAnti = ref(false)
const shape = ref<PatternShape>('diamond')
const beat = ref<VtgBeat>(1)
const transition = ref(false)
const transitionBeats = ref<VtgTransitionBeats>(vtgDefaultTransitionBeats)
const transitionQuad = ref(false)
const transitionSecond = ref(false)
const transitionAvailable = computed(() => supportsVtgQtrTransition(speedRatio.value))
const activeQtrMode = computed<1 | false>(() => (isQtr.value ? 1 : false))
const vtgHeaderPropColors = vtgPropSettings.map(({ color }) => {
  const colorSet = COLSET[COLORS.indexOf(color)]
  if (!colorSet) throw new Error(`Missing VTG prop color set for ${color}`)

  // These map directly to the POI model's head, handle, and tether materials.
  return {
    head: toColor(colorSet[0]),
    handle: toColor(colorSet[1]),
    tether: toColor(colorSet[2]),
  }
})
const spinToggleCells: ReadonlySet<VtgCellReference> = new Set(['5-6', '6-6', '5-5', '6-5'])

let suppressPatternEmit = false
let hydrationVersion = 0
let lastEmittedSelection: VtgPatternSelection | QtrPatternSelection | undefined
let componentMounted = false
let initialAnimationHandled = false

const columnRuleNumbers = [1, 2, 3, 4, 5, 6] as const
const leftRuleNumbers = [1, 2, 3, 4, 5, 6] as const

const createCellReference = (column: VtgRuleNumber, row: VtgRuleNumber): VtgCellReference =>
  `${column}-${row}`

const matrixAddresses: readonly VtgMatrixAddress[] = leftRuleNumbers.flatMap(
  (rowNumber, rowIndex) => {
    return columnRuleNumbers.map((columnNumber, columnIndex) => {
      return {
        column: columnNumber,
        row: rowNumber,
        boardColumn: columnIndex + 2,
        boardRow: rowIndex + 1,
        reference: createCellReference(columnNumber, rowNumber),
      }
    })
  },
)

const matrixTiles = computed<readonly VtgMatrixTile[]>(() =>
  matrixAddresses.map((address) => {
    const baseSelection: VtgPatternSelection = {
      reference: address.reference,
      speedRatio: speedRatio.value,
      ...(spinToggleCells.has(address.reference) ? { isAnti: isAnti.value } : undefined),
      ...(swapProps.value ? { swapProps: true } : undefined),
      ...(reversePlane.value ? { reversePlane: true } : undefined),
      ...(shape.value === 'box' ? { shape: shape.value } : undefined),
      ...(beat.value === 1 ? undefined : { beat: beat.value }),
      ...(transition.value && transitionAvailable.value ? { transition: true } : undefined),
    }
    const selection: VtgPatternSelection | QtrPatternSelection = isQtr.value
      ? { ...baseSelection, quarters: 1 }
      : baseSelection

    return { ...address, ...describePatternSelectionRelationships(selection) }
  }),
)

const getTileDescription = (tile: VtgMatrixTile) => tile.description

const selectedCell = ref<VtgCellAddress>()

const selectedCellReference = computed<VtgCellReference | undefined>(() => {
  const cell = selectedCell.value
  return cell ? createCellReference(cell.column, cell.row) : undefined
})

const isTileHighlighted = (tile: VtgMatrixTile) =>
  selectedCell.value !== undefined &&
  (tile.column === selectedCell.value.column || tile.row === selectedCell.value.row)

const isSpinToggleCell = (reference: VtgCellReference) => spinToggleCells.has(reference)
const isBottomSpinToggleCell = (reference: VtgCellReference) =>
  reference === '5-6' || reference === '6-6'

const emitPatternSelection = (tile: VtgMatrixTile) => {
  if (!suppressPatternEmit) hydrationVersion++

  const baseSelection: VtgPatternSelection = {
    reference: tile.reference,
    speedRatio: speedRatio.value,
  }
  if (isSpinToggleCell(tile.reference)) baseSelection.isAnti = isAnti.value
  if (swapProps.value) baseSelection.swapProps = true
  if (reversePlane.value) baseSelection.reversePlane = true
  if (shape.value === 'box') baseSelection.shape = shape.value
  if (beat.value !== 1) baseSelection.beat = beat.value
  if (transition.value && transitionAvailable.value) baseSelection.transition = true
  if (
    transition.value &&
    transitionAvailable.value &&
    transitionBeats.value !== vtgDefaultTransitionBeats
  ) {
    baseSelection.transitionBeats = transitionBeats.value
  }
  if (transition.value && transitionAvailable.value && transitionQuad.value) {
    baseSelection.transitionQuad = true
  }
  if (
    transition.value &&
    transitionAvailable.value &&
    transitionQuad.value &&
    transitionSecond.value
  ) {
    baseSelection.transitionSecond = true
  }
  if (bpm.value !== vtgBpmControl.default) baseSelection.bpm = bpm.value
  if (scale.value !== vtgScaleControl.default) baseSelection.scale = scale.value
  if (thick.value !== vtgThickControl.default) baseSelection.thick = thick.value
  if (spacing.value !== vtgSpacingControl.default) baseSelection.spacing = spacing.value
  if (paths.value !== vtgPlayerSettings.paths) baseSelection.paths = paths.value
  if (hands.value !== vtgPlayerSettings.hands) baseSelection.hands = hands.value
  if (arms.value !== vtgPlayerSettings.arms) baseSelection.arms = arms.value
  if (!leftPropVisible.value) baseSelection.left = false
  if (!rightPropVisible.value) baseSelection.right = false
  const selection: ConceptPatternSelection = isQtr.value
    ? { ...baseSelection, quarters: 1 }
    : baseSelection
  lastEmittedSelection = selection
  emit('patternSelect', selection)
}

const selectTile = (tile: VtgMatrixTile) => {
  const isReselectedSpinToggleCell =
    tile.reference === selectedCellReference.value && isSpinToggleCell(tile.reference)

  selectedCell.value = {
    column: tile.column,
    row: tile.row,
  }
  if (isReselectedSpinToggleCell) isAnti.value = !isAnti.value
  emitPatternSelection(tile)
}

const selectRandomTile = () => {
  const tile = matrixTiles.value[Math.floor(Math.random() * matrixTiles.value.length)]
  if (tile === undefined) throw new Error('Cannot select a random VTG cell from an empty matrix')
  selectTile(tile)
}

const selectRandomTileFrom = (tiles: readonly VtgMatrixTile[]) => {
  const tile = tiles[Math.floor(Math.random() * tiles.length)]
  if (tile === undefined) throw new Error('Cannot select a random VTG cell from an empty line')
  selectTile(tile)
}

const selectRow = (row: VtgRuleNumber) => {
  const column = selectedCell.value?.column
  const tile =
    column === undefined
      ? undefined
      : matrixTiles.value.find((candidate) => candidate.column === column && candidate.row === row)

  if (tile) selectTile(tile)
  else selectRandomTileFrom(matrixTiles.value.filter((candidate) => candidate.row === row))
}

const selectColumn = (column: VtgRuleNumber) => {
  const row = selectedCell.value?.row
  const tile =
    row === undefined
      ? undefined
      : matrixTiles.value.find((candidate) => candidate.column === column && candidate.row === row)

  if (tile) selectTile(tile)
  else selectRandomTileFrom(matrixTiles.value.filter((candidate) => candidate.column === column))
}

const toggleSpinDirection = (tile: VtgMatrixTile) => {
  isAnti.value = !isAnti.value
  emitPatternSelection(tile)
}

const resetPatternControls = async () => {
  const tile = matrixTiles.value.find(({ reference }) => reference === selectedCellReference.value)
  suppressPatternEmit = true
  conceptsStore.resetPatternControls()
  isQtr.value = false
  isAnti.value = false
  shape.value = 'diamond'
  beat.value = 1
  transition.value = false
  transitionQuad.value = false
  transitionSecond.value = false
  await nextTick()
  suppressPatternEmit = false
  if (tile !== undefined) emitPatternSelection(tile)
}

watch(
  [
    speedRatio,
    swapProps,
    reversePlane,
    shape,
    beat,
    transition,
    transitionBeats,
    transitionQuad,
    transitionSecond,
    bpm,
    scale,
    thick,
    spacing,
    paths,
    hands,
    arms,
    leftPropVisible,
    rightPropVisible,
    activeQtrMode,
  ],
  () => {
    if (suppressPatternEmit) return

    const tile = matrixTiles.value.find(
      ({ reference }) => reference === selectedCellReference.value,
    )
    if (tile !== undefined) emitPatternSelection(tile)
  },
)

const matchPattern = async (request: Parameters<PatternMatchingClient['matchVtg']>[0]) => {
  if (props.patternMatcher) return props.patternMatcher.matchVtg(request)

  const { matchVtgPatternRequest } =
    await import('@/workers/pattern-matching/handlePatternMatchingRequest')
  return matchVtgPatternRequest(request)
}

const hydratePatternControls = async (animation: RootDataFinal) => {
  const version = ++hydrationVersion
  const selection = lastEmittedSelection
  lastEmittedSelection = undefined

  const matchPreferences = {
    swapProps: swapProps.value,
    reversePlane: reversePlane.value,
    quarters: 1 as const,
  }

  let result
  try {
    result = await matchPattern({
      animation,
      preferences: matchPreferences,
      ...(selection ? { lastSelection: selection } : undefined),
    })
  } catch (error) {
    if (version === hydrationVersion && componentMounted) {
      console.warn('VTG pattern matching failed.', error)
    }
    return
  }

  if (version !== hydrationVersion || !componentMounted || props.animation !== animation) return
  if (result.status === 'unchanged') return

  const match = result.status === 'matched' ? result.match : undefined
  suppressPatternEmit = true

  if (match) {
    const tile = matrixTiles.value.find(({ reference }) => reference === match.reference)
    selectedCell.value = tile ? { column: tile.column, row: tile.row } : undefined
    speedRatio.value = match.speedRatio
    isAnti.value = match.isAnti
    swapProps.value = match.swapProps
    reversePlane.value = match.reversePlane
    shape.value = match.shape ?? 'diamond'
    beat.value = match.beat ?? 1
    transition.value = match.transition ?? false
    transitionBeats.value = match.transitionBeats ?? vtgDefaultTransitionBeats
    transitionQuad.value = match.transitionQuad ?? false
    transitionSecond.value = match.transitionSecond ?? false
    bpm.value = match.bpm
    scale.value = match.scale
    thick.value = animation.thick
    paths.value = animation.paths
    hands.value = animation.hands ?? vtgPlayerSettings.hands
    arms.value = animation.arms
    leftPropVisible.value = isPatternPropVisible(animation.props[0])
    rightPropVisible.value = isPatternPropVisible(animation.props[1])
    isQtr.value = result.status === 'matched' && result.source === 'qtr'
  } else {
    selectedCell.value = undefined
    isQtr.value = false
    isAnti.value = false
    shape.value = 'diamond'
    beat.value = 1
    transition.value = false
    transitionBeats.value = vtgDefaultTransitionBeats
    transitionQuad.value = false
    transitionSecond.value = false
  }

  // Suppression only protects the control writes above through their watcher flush. A newer
  // hydration may start before this callback runs, but it must not prevent this suppression from
  // being released or subsequent option changes will be ignored indefinitely.
  void nextTick(() => {
    suppressPatternEmit = false
  })
}

const selectInitialRandomPattern = () => {
  hydrationVersion++
  suppressPatternEmit = true
  selectedCell.value = undefined
  conceptsStore.resetPatternControls()
  isAnti.value = false
  shape.value = 'diamond'
  beat.value = 1
  transition.value = false
  transitionBeats.value = vtgDefaultTransitionBeats
  transitionQuad.value = false
  transitionSecond.value = false
  selectRandomTile()

  void nextTick(() => {
    suppressPatternEmit = false
  })
}

const syncPatternControls = () => {
  if (!componentMounted || !props.animationReady || !props.animation) return

  if (props.animation.props.length === 0) {
    if (initialAnimationHandled) return

    initialAnimationHandled = true
    selectInitialRandomPattern()
    return
  }

  initialAnimationHandled = true
  void hydratePatternControls(props.animation)
}

watch([() => props.animationReady, () => props.animation], syncPatternControls)

const createSplitDiagram = (
  firstLargeEnd: VtgPropPlacement['largeEnd'],
  secondLargeEnd: VtgPropPlacement['largeEnd'],
): VtgRuleDiagram => ({
  props: [
    {
      lane: 50,
      start: vtgPropBounds.outerStart,
      end: vtgPropBounds.beforeDivider,
      largeEnd: firstLargeEnd,
    },
    {
      lane: 50,
      start: vtgPropBounds.afterDivider,
      end: vtgPropBounds.outerEnd,
      largeEnd: secondLargeEnd,
    },
  ],
})

const createParallelDiagram = (
  dividerSide: 'before' | 'after',
  largeEnd: VtgPropPlacement['largeEnd'],
): VtgRuleDiagram => {
  const start = dividerSide === 'before' ? vtgPropBounds.outerStart : vtgPropBounds.afterDivider
  const end = dividerSide === 'before' ? vtgPropBounds.beforeDivider : vtgPropBounds.outerEnd

  return {
    props: [
      { lane: 42, start, end, largeEnd },
      { lane: 58, start, end, largeEnd },
    ],
  }
}

const diagrams = {
  alternatingSplit: createSplitDiagram('start', 'start'),
  outsideSplit: createSplitDiagram('start', 'end'),
  insideSplit: createSplitDiagram('end', 'start'),
  clusteredOutsideSplit: {
    divider: 97,
    props: [
      {
        lane: 50,
        start: vtgPropBounds.outerStart,
        end: vtgPropBounds.beforeDivider,
        largeEnd: 'start',
      },
      {
        lane: 50,
        start: 48,
        end: 85,
        largeEnd: 'end',
      },
    ],
  },
  parallelAfterInside: createParallelDiagram('after', 'start'),
  parallelAfterOutside: createParallelDiagram('after', 'end'),
} as const satisfies Readonly<Record<string, VtgRuleDiagram>>

const ruleDescriptions: Readonly<Record<VtgRuleNumber, string>> = {
  1: 'Tog Out - Both props are together facing out either on the left or right or the top and bottom.',
  2: 'Split Out - Props facing out, separated by 180 degrees, and located on the opposite sides of the circle.',
  3: 'Tog In - Both props are together facing in either on the left or right or the top and bottom.',
  4: 'Split In - Props facing in, separated by 180 degrees, and located on the opposite sides of the circle.',
  5: 'Tog Split - Hands are together but the props are facing 180 degrees apart.',
  6: 'Split Tog - Hands are split but the props are facing the same direction.',
}

const columnRules: readonly VtgRuleSpec[] = [
  {
    labels: ['TOG', 'OUT'],
    number: 1,
    diagram: diagrams.parallelAfterOutside,
    description: ruleDescriptions[1],
  },
  {
    labels: ['SPLIT', 'OUT'],
    number: 2,
    diagram: diagrams.outsideSplit,
    description: ruleDescriptions[2],
  },
  {
    labels: ['TOG', 'IN'],
    number: 3,
    diagram: diagrams.parallelAfterInside,
    description: ruleDescriptions[3],
  },
  {
    labels: ['SPLIT', 'IN'],
    number: 4,
    diagram: diagrams.insideSplit,
    description: ruleDescriptions[4],
  },
  {
    labels: ['TOG', 'SPLIT'],
    number: 5,
    diagram: diagrams.clusteredOutsideSplit,
    description: ruleDescriptions[5],
  },
  {
    labels: ['SPLIT', 'TOG'],
    number: 6,
    diagram: diagrams.alternatingSplit,
    description: ruleDescriptions[6],
  },
]

const sideRules: readonly VtgRuleSpec[] = [
  {
    labels: ['TOG', 'OUT'],
    number: 1,
    diagram: diagrams.parallelAfterOutside,
    description: ruleDescriptions[1],
  },
  {
    labels: ['SPLIT', 'OUT'],
    number: 2,
    diagram: diagrams.outsideSplit,
    description: ruleDescriptions[2],
  },
  {
    labels: ['TOG', 'IN'],
    number: 3,
    diagram: diagrams.parallelAfterInside,
    description: ruleDescriptions[3],
  },
  {
    labels: ['SPLIT', 'IN'],
    number: 4,
    diagram: diagrams.insideSplit,
    description: ruleDescriptions[4],
  },
  {
    labels: ['TOG', 'SPLIT'],
    number: 5,
    diagram: diagrams.clusteredOutsideSplit,
    description: ruleDescriptions[5],
  },
  {
    labels: ['SPLIT', 'TOG'],
    number: 6,
    diagram: diagrams.alternatingSplit,
    description: ruleDescriptions[6],
  },
]

const quarterDiagramOptions = computed(() => ({
  speedRatio: speedRatio.value,
  quarters: 1 as const,
  swapProps: swapProps.value,
  reversePlane: reversePlane.value,
}))

const displayedSideRules = computed<readonly VtgRuleSpec[]>(() => {
  if (!isQtr.value) return sideRules

  return sideRules.map((rule) => ({
    ...rule,
    diagram: createQtrSideDiagram({
      ...quarterDiagramOptions.value,
      row: rule.number,
    }),
  }))
})

const paneElement = ref<HTMLElement>()
const blankWidth = ref(0)
const blankHeight = ref(0)
const blankDimensions = reactive<BlankDimensions[]>(
  Array.from({ length: 9 }, () => ({ width: 0, height: 0 })),
)
const { previewUrls, requestPreviews } = usePatternPreviews({
  dimensions: blankDimensions,
  speedRatio,
  isAnti,
  swapProps,
  reversePlane,
  shape,
  beat,
  scale,
  spacing,
  quarters: activeQtrMode,
})

let blankObserver: ResizeObserver | undefined

const roundDimension = (value: number) => Math.round(value * 100) / 100

onMounted(() => {
  componentMounted = true
  syncPatternControls()

  if (typeof ResizeObserver === 'undefined') return

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (!(entry.target instanceof HTMLElement)) continue

      const index = Number(entry.target.dataset.blankIndex)
      const dimensions = blankDimensions[index]
      if (!dimensions) continue

      dimensions.width = roundDimension(entry.contentRect.width)
      dimensions.height = roundDimension(entry.contentRect.height)
      blankWidth.value = dimensions.width
      blankHeight.value = dimensions.height
    }
    requestPreviews()
  })
  blankObserver = observer

  paneElement.value
    ?.querySelectorAll<HTMLElement>('[data-role="vtg-blank"]')
    .forEach((element) => observer.observe(element))
})

onBeforeUnmount(() => {
  componentMounted = false
  hydrationVersion++
  blankObserver?.disconnect()
})

defineExpose({
  blankDimensions,
  blankWidth,
  blankHeight,
  selectedCell,
  selectedCellReference,
  speedRatio,
  isAnti,
  swapProps,
  reversePlane,
  shape,
  beat,
  transition,
  transitionAvailable,
  bpm,
  scale,
  thick,
  spacing,
  paths,
  hands,
  arms,
  leftPropVisible,
  rightPropVisible,
  previewUrls,
})
</script>

<style scoped>
.vtg-pane {
  container-name: concept-pane;
  container-type: inline-size;
  width: 100%;
  min-inline-size: 0;
  min-block-size: 0;
  padding-block-end: var(--size-pane-switch-bottom-clearance);
  color: var(--color-text);
  background: transparent;
}

.vtg-top-options {
  display: flex;
  min-width: var(--size-concept-content-min-width);
  padding: 0 var(--space-2) var(--space-1);
  flex-wrap: wrap;
  gap: var(--space-1);
  justify-content: center;
}

.vtg-top-options fieldset {
  padding: 0;
  margin: 0;
  border: 0;
}

.vtg-radio-options {
  display: grid;
  grid-auto-columns: max-content;
  grid-auto-flow: column;
  gap: var(--space-1);
}

.vtg-radio-options label {
  position: relative;
  cursor: pointer;
}

.vtg-radio-options input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.vtg-radio-options label > span {
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

.vtg-radio-options input:checked + span {
  color: var(--color-on-action-primary);
  background: var(--color-action-primary);
  border-color: var(--color-action-primary);
}

.vtg-radio-options input:focus-visible + span {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.vtg-transition-beats {
  display: grid;
  min-width: 0;
}

.vtg-transition-beats select {
  min-width: 2.75rem;
  padding-block: var(--space-1);
  padding-inline: clamp(var(--space-1), 1.2cqi, var(--space-2));
  color: var(--color-on-action-primary);
  font: inherit;
  font-size: clamp(0.625rem, 3cqi, 0.875rem);
  font-weight: 700;
  background: var(--color-transition-mode-active);
  border: 1px solid var(--color-transition-mode-active-border);
  border-radius: var(--radius-sm);
}

.vtg-transition-beats select:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.vtg-transition-option {
  position: relative;
  min-width: 0;
  cursor: pointer;
}

.vtg-transition-option input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.vtg-transition-option span {
  display: grid;
  padding-block: var(--space-1);
  padding-inline: clamp(var(--space-1), 1.2cqi, var(--space-2));
  color: var(--color-text);
  font-size: clamp(0.625rem, 3cqi, 0.875rem);
  font-weight: 700;
  white-space: nowrap;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.vtg-transition-option input:checked + span {
  color: var(--color-on-action-primary);
  background: var(--color-transition-mode-active);
  border-color: var(--color-transition-mode-active-border);
}

.vtg-transition-option input:focus-visible + span {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.vtg-board {
  /* VTG categories are fixed domain colors, so they intentionally remain stable across themes. */
  --vtg-color-primary: #5968df;
  --vtg-color-secondary: #2dc8a8;
  --vtg-color-ink: #071d26;
  --vtg-color-rule: #111820;
  --vtg-color-rule-text: #f6f8fb;
  --vtg-color-preview: #071421;
  --vtg-color-line: #e9eef2;
  --vtg-board-gap: 0.65cqi;

  container-type: inline-size;
  display: grid;
  width: 100%;
  min-width: var(--size-concept-content-min-width);
  aspect-ratio: 1;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-template-rows: repeat(7, minmax(0, 1fr));
  gap: 0.65%;
  padding: 0.65%;
}

.vtg-sidebar {
  display: grid;
  grid-row: 2 / span 6;
  grid-column: 1;
  grid-template-rows: repeat(6, minmax(0, 1fr));
  gap: var(--vtg-board-gap);
}

.vtg-matrix {
  position: relative;
  grid-row: 2 / span 6;
  grid-column: 2 / span 6;
}

.vtg-tile-grid,
.vtg-blank-grid {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  grid-template-rows: repeat(6, minmax(0, 1fr));
  gap: var(--vtg-board-gap);
}

.vtg-blank-grid {
  z-index: 2;
  pointer-events: none;
}

.vtg-tile {
  appearance: none;
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  padding: 0;
  place-items: center;
  color: var(--vtg-color-rule-text);
  cursor: pointer;
  background: var(--vtg-color-primary);
  border: 0;
  border-radius: 1.7cqi;
  box-shadow:
    inset 0 0.15cqi 0.15cqi color-mix(in srgb, var(--vtg-color-rule-text) 12%, transparent),
    0 0.45cqi 1cqi color-mix(in srgb, var(--vtg-color-preview) 22%, transparent);
  font-family: 'Arial Narrow', var(--font-family-sans);
  font-size: max(0.78rem, 2.55cqi);
  font-weight: 700;
  letter-spacing: 0.025em;
  line-height: 1;
  text-rendering: geometricPrecision;
  white-space: nowrap;
}

.vtg-tile-grid > .vtg-tile-tooltip {
  display: flex;
  min-width: 0;
  min-height: 0;
}

.vtg-tile-tooltip__text {
  white-space: pre-line;
}

.vtg-tile__spin-toggle {
  position: absolute;
  z-index: 1;
  inset-block-start: max(0.2rem, 0.6cqi);
  inset-inline-start: 50%;
  padding: 0.3em;
  color: var(--vtg-color-ink);
  cursor: pointer;
  background: var(--vtg-color-secondary);
  border: max(1px, 0.12cqi) solid var(--vtg-color-ink);
  border-radius: 0.4em;
  font-family: 'Arial Narrow', var(--font-family-sans);
  font-size: max(0.62rem, 1.7cqi);
  font-weight: 700;
  letter-spacing: 0.025em;
  line-height: 1;
  transform: translateX(-50%);
}

.vtg-tile__spin-toggle--bottom {
  inset-block-start: auto;
  inset-block-end: max(0.2rem, 0.6cqi);
}

.vtg-tile__spin-toggle:focus-visible {
  outline: max(2px, 0.2cqi) solid var(--vtg-color-rule-text);
  outline-offset: max(1px, 0.1cqi);
}

.vtg-tile--highlighted {
  color: var(--vtg-color-ink);
  background: var(--vtg-color-secondary);
}

.vtg-tile--selected {
  box-shadow:
    inset 0 0 0 max(2px, 0.28cqi) var(--vtg-color-rule-text),
    inset 0 0 0 max(4px, 0.52cqi) var(--vtg-color-ink),
    0 0.45cqi 1cqi color-mix(in srgb, var(--vtg-color-preview) 22%, transparent);
}

.vtg-blank {
  z-index: 3;
  align-self: start;
  justify-self: start;
  width: 78%;
  aspect-ratio: 1;
  background: color-mix(in srgb, var(--vtg-color-preview) 94%, transparent);
  border-radius: 0.9cqi;
  box-shadow: 0 0.35cqi 0.85cqi color-mix(in srgb, var(--vtg-color-preview) 30%, transparent);
  transform: translate(-50%, calc(-50% - 0.33cqi));
}

.vtg-blank__preview {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.vtg-blank--1,
.vtg-blank--4,
.vtg-blank--7 {
  grid-column: 2;
}

.vtg-blank--2,
.vtg-blank--5,
.vtg-blank--8 {
  grid-column: 4;
}

.vtg-blank--3,
.vtg-blank--6,
.vtg-blank--9 {
  grid-column: 6;
}

.vtg-blank--1,
.vtg-blank--2,
.vtg-blank--3 {
  grid-row: 2;
}

.vtg-blank--4,
.vtg-blank--5,
.vtg-blank--6 {
  grid-row: 4;
}

.vtg-blank--7,
.vtg-blank--8,
.vtg-blank--9 {
  grid-row: 6;
}

.vtg-shuffle {
  appearance: none;
  display: grid;
  grid-row: 1;
  grid-column: 1;
  padding: 0;
  color: var(--vtg-color-ink);
  cursor: pointer;
  background: var(--vtg-color-secondary);
  border: 0;
  border-radius: 0.75cqi;
  box-shadow: 0 0.4cqi 0.9cqi color-mix(in srgb, var(--vtg-color-preview) 22%, transparent);
  place-items: center;
}

.vtg-shuffle-tooltip {
  display: flex;
  min-width: 0;
  min-height: 0;
  grid-row: 1;
  grid-column: 1;
}

.vtg-shuffle-tooltip > .vtg-shuffle {
  width: 100%;
  height: 100%;
}

.vtg-spin-toggle-tooltip.tooltip-root {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.vtg-spin-toggle-tooltip > .vtg-tile__spin-toggle {
  pointer-events: auto;
}

.vtg-column-headers {
  display: grid;
  grid-row: 1;
  grid-column: 2 / span 6;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--vtg-board-gap);
}

.vtg-pane__visually-hidden {
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
