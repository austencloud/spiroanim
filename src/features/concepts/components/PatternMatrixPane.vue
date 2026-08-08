<template>
  <section
    ref="paneElement"
    class="vtg-pane"
    :aria-labelledby="`${concept}-pane-title`"
    :data-role="`${concept}-pane`"
    :data-blank-width="blankWidth"
    :data-blank-height="blankHeight"
    :data-selected-cell="selectedCellReference"
    :data-speed-ratio="speedRatio"
    :data-concept="concept"
  >
    <h1 :id="`${concept}-pane-title`" class="vtg-pane__visually-hidden">
      {{ isQtr ? 'Quarter Spacing' : 'VTG' }} generator
    </h1>

    <div class="vtg-top-options">
      <fieldset class="vtg-speed-ratio">
        <legend class="vtg-pane__visually-hidden">Speed ratio</legend>
        <div class="vtg-radio-options">
          <label v-for="ratio in speedRatios" :key="ratio">
            <input v-model="speedRatio" type="radio" name="vtg-speed-ratio" :value="ratio" />
            <span>{{ ratio }}</span>
          </label>
        </div>
      </fieldset>

      <fieldset v-if="isQtr" class="vtg-radio-options vtg-quarter-options">
        <legend class="vtg-pane__visually-hidden">Quarters</legend>
        <label>
          <input
            v-model="quarterMode"
            type="radio"
            name="vtg-quarters"
            :value="1"
            data-role="vtg-quarters"
          />
          <span>Qtr #1</span>
        </label>
        <label>
          <input
            v-model="quarterMode"
            type="radio"
            name="vtg-quarters"
            :value="2"
            data-role="vtg-quarters-2"
          />
          <span>Qtr #2</span>
        </label>
      </fieldset>

      <PatternTransformControls @reset="resetPatternControls" />
    </div>

    <div class="vtg-board">
      <button
        type="button"
        class="vtg-shuffle"
        aria-label="Shuffle VTG rules"
        @click="selectRandomTile"
      >
        <BaseIcon :path="mdiShuffleVariant" size="42%" />
      </button>

      <div class="vtg-footer" data-role="vtg-footer">
        <VtgRuleCard
          v-for="rule in bottomRules"
          :key="`bottom-${rule.number}`"
          :labels="rule.labels"
          :display-labels="isQtr ? qtrBottomRuleLabels[rule.number] : undefined"
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
              <button
                v-if="tile.reference === selectedCellReference && isSpinToggleCell(tile.reference)"
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
      <template #after-controls>
        <PatternShapeControls v-model:shape="shape" />
      </template>
    </ConceptAnimationControls>

    <p v-if="isQtr" class="qtr-development-note" data-role="qtr-development-note">
      Quarter Spacing is experimental and still under development. It may change drastically or be
      condensed in future releases.
    </p>
  </section>
</template>

<script setup lang="ts">
import { mdiShuffleVariant } from '@mdi/js'

import BaseIcon from '@/components/icons/BaseIcon.vue'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import { COLORS, COLSET } from '@/domain/animation/AnimStruct'
import ConceptAnimationControls from '@/features/concepts/components/ConceptAnimationControls.vue'
import PatternShapeControls from '@/features/concepts/components/PatternShapeControls.vue'
import PatternTransformControls from '@/features/concepts/components/PatternTransformControls.vue'
import { describePatternRelationships } from '@/features/concepts/math/describePatternRelationships'
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'
import type { ConceptKey, ConceptPatternSelection } from '@/features/concepts/types'
import { qtrBottomRuleLabels, qtrSideRuleLabels } from '@/features/qtr/data/qtrLabels'
import { createDefaultQtrAnimation } from '@/features/qtr/createQtrAnimation'
import { findQtrPatternMatch, matchesQtrSelection } from '@/features/qtr/matchQtrAnimation'
import { createQtrSideDiagram } from '@/features/qtr/math/createQtrHeaderDiagram'
import type { QtrMode, QtrPatternSelection } from '@/features/qtr/types'
import VtgRuleCard from '@/features/vtg/components/VtgRuleCard.vue'
import {
  patternPreviewReferences,
  usePatternPreviews,
} from '@/features/concepts/composables/usePatternPreviews'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import {
  vtgBpmControl,
  vtgPlayerSettings,
  vtgPropSettings,
  vtgScaleControl,
  vtgThickControl,
} from '@/features/vtg/data/vtgPlayerSettings'
import { findVtgPatternMatch, matchesVtgSelection } from '@/features/vtg/matchVtgAnimation'
import { vtgPropBounds } from '@/features/qtr/math/createQtrHeaderDiagram'
import type {
  VtgCellAddress,
  VtgCellReference,
  VtgPatternLabel,
  VtgPropPlacement,
  VtgRuleDiagram,
  VtgRuleNumber,
  VtgRuleSpec,
  VtgPatternSelection,
} from '@/features/vtg/types'
import { vtgSpeedRatios } from '@/features/vtg/types'
import type { RootDataFinal } from '@/types/AnimTypes'
import type { PatternShape } from '@/types/PatternTypes'
import { toColor } from '@/utils/UtilFunc'

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
    concept: ConceptKey
    animation?: RootDataFinal
    animationReady?: boolean
  }>(),
  {
    animationReady: true,
  },
)

const emit = defineEmits<{
  patternSelect: [selection: ConceptPatternSelection]
}>()

const isQtr = computed(() => props.concept === 'qtr')
const speedRatios = vtgSpeedRatios
const conceptsStore = useConceptsStore()
const { speedRatio, swapProps, reversePlane, bpm, scale, thick, paths, hands, arms } =
  storeToRefs(conceptsStore)
const isAnti = ref(false)
const shape = ref<PatternShape>('diamond')
const quarterMode = ref<QtrMode>(1)
const activeQuarterMode = computed<QtrMode | false>(() => (isQtr.value ? quarterMode.value : false))
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

const bottomRuleNumbers = [1, 2, 3, 4, 5, 6] as const
const leftRuleNumbers = [1, 2, 3, 4, 5, 6] as const

const createCellReference = (column: VtgRuleNumber, row: VtgRuleNumber): VtgCellReference =>
  `${column}-${row}`

const matrixAddresses: readonly VtgMatrixAddress[] = leftRuleNumbers.flatMap(
  (rowNumber, rowIndex) => {
    return bottomRuleNumbers.map((columnNumber, columnIndex) => {
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
    }
    const animation = isQtr.value
      ? createDefaultQtrAnimation({ ...baseSelection, quarters: quarterMode.value })
      : createDefaultVtgAnimation(baseSelection)
    if (!animation) throw new Error(`Missing pattern animation for ${address.reference}`)

    return { ...address, ...describePatternRelationships(animation) }
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
  const baseSelection: VtgPatternSelection = {
    reference: tile.reference,
    speedRatio: speedRatio.value,
  }
  if (isSpinToggleCell(tile.reference)) baseSelection.isAnti = isAnti.value
  if (swapProps.value) baseSelection.swapProps = true
  if (reversePlane.value) baseSelection.reversePlane = true
  if (shape.value === 'box') baseSelection.shape = shape.value
  if (bpm.value !== vtgBpmControl.default) baseSelection.bpm = bpm.value
  if (scale.value !== vtgScaleControl.default) baseSelection.scale = scale.value
  if (thick.value !== vtgThickControl.default) baseSelection.thick = thick.value
  if (paths.value !== vtgPlayerSettings.paths) baseSelection.paths = paths.value
  if (hands.value !== vtgPlayerSettings.hands) baseSelection.hands = hands.value
  if (arms.value !== vtgPlayerSettings.arms) baseSelection.arms = arms.value
  const selection: ConceptPatternSelection = isQtr.value
    ? { ...baseSelection, quarters: quarterMode.value }
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
  isAnti.value = false
  shape.value = 'diamond'
  quarterMode.value = 1
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
    bpm,
    scale,
    thick,
    paths,
    hands,
    arms,
    activeQuarterMode,
  ],
  () => {
    if (suppressPatternEmit) return

    const tile = matrixTiles.value.find(
      ({ reference }) => reference === selectedCellReference.value,
    )
    if (tile !== undefined) emitPatternSelection(tile)
  },
)

const hydratePatternControls = (animation: RootDataFinal) => {
  const matchesLastSelection = lastEmittedSelection
    ? 'quarters' in lastEmittedSelection
      ? matchesQtrSelection(animation, lastEmittedSelection)
      : matchesVtgSelection(animation, lastEmittedSelection)
    : false
  if (matchesLastSelection) {
    lastEmittedSelection = undefined
    return
  }
  lastEmittedSelection = undefined

  const qtrMatch = findQtrPatternMatch(animation)
  const vtgMatch = findVtgPatternMatch(animation)
  const ownMatch = isQtr.value ? qtrMatch : vtgMatch
  const fallbackMatch = isQtr.value ? vtgMatch : qtrMatch
  const match = ownMatch ?? fallbackMatch
  const shouldApplyCurrentConcept = ownMatch === undefined && fallbackMatch !== undefined
  const version = ++hydrationVersion
  suppressPatternEmit = true
  let tileToApply: VtgMatrixTile | undefined

  if (match) {
    const tile = matrixTiles.value.find(({ reference }) => reference === match.reference)
    selectedCell.value = tile ? { column: tile.column, row: tile.row } : undefined
    speedRatio.value = match.speedRatio
    isAnti.value = match.isAnti
    swapProps.value = match.swapProps
    reversePlane.value = match.reversePlane
    shape.value = match.shape ?? 'diamond'
    bpm.value = match.bpm
    scale.value = match.scale
    thick.value = animation.thick
    paths.value = animation.paths
    hands.value = animation.hands ?? vtgPlayerSettings.hands
    arms.value = animation.arms
    if (qtrMatch) quarterMode.value = qtrMatch.quarters
    if (shouldApplyCurrentConcept) tileToApply = tile
  } else {
    selectedCell.value = undefined
    isAnti.value = false
    shape.value = 'diamond'
    quarterMode.value = 1
  }

  void nextTick(() => {
    if (version !== hydrationVersion) return

    suppressPatternEmit = false
    if (tileToApply) emitPatternSelection(tileToApply)
  })
}

const selectInitialRandomPattern = () => {
  const version = ++hydrationVersion
  suppressPatternEmit = true
  selectedCell.value = undefined
  conceptsStore.resetPatternControls()
  isAnti.value = false
  shape.value = 'diamond'
  quarterMode.value = 1
  selectRandomTile()

  void nextTick(() => {
    if (version === hydrationVersion) suppressPatternEmit = false
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
  hydratePatternControls(props.animation)
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

const bottomRules: readonly VtgRuleSpec[] = [
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
  quarters: quarterMode.value,
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
  scale,
  quarters: activeQuarterMode,
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
  bpm,
  scale,
  thick,
  paths,
  hands,
  arms,
  quarterMode,
  previewUrls,
})
</script>

<style scoped>
.vtg-pane {
  width: 100%;
  min-inline-size: 0;
  min-block-size: 0;
  padding-block-end: var(--size-pane-switch-bottom-clearance);
  color: var(--color-text);
  background: transparent;
}

.vtg-top-options {
  display: flex;
  min-width: 20rem;
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

.vtg-radio-options span {
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

.qtr-development-note {
  width: min(100%, 45rem);
  padding-inline: var(--space-2);
  margin: var(--space-2) auto 0;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  line-height: 1.4;
  text-align: center;
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
  min-width: 20rem;
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

.vtg-footer {
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
