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
  >
    <h1 id="vtg-pane-title" class="vtg-pane__visually-hidden">VTG generator</h1>

    <fieldset class="vtg-speed-ratio">
      <legend>Speed Ratio: Hands Props</legend>
      <div class="vtg-speed-ratio__options">
        <label v-for="ratio in speedRatios" :key="ratio">
          <input v-model="speedRatio" type="radio" name="vtg-speed-ratio" :value="ratio" />
          <span>{{ ratio }}</span>
        </label>
      </div>
    </fieldset>

    <div class="vtg-board">
      <div class="vtg-sidebar" data-role="vtg-sidebar">
        <VtgRuleCard
          v-for="rule in sideRules"
          :key="`side-${rule.number}`"
          :labels="rule.labels"
          :number="rule.number"
          :diagram="rule.diagram"
          :description="rule.description"
          orientation="vertical"
          :accent="rule.number === selectedCell?.row"
        />
      </div>

      <div class="vtg-matrix" data-role="vtg-matrix">
        <div class="vtg-tile-grid">
          <BaseTooltip
            v-for="tile in matrixTiles"
            :key="tile.reference"
            class="vtg-tile-tooltip"
            :text="tile.description"
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
                  'vtg-tile__spin-toggle--lower-right': isLowerRightSpinToggleCell(tile.reference),
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
              <span class="vtg-tile-tooltip__text">{{ tile.description }}</span>
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
          />
        </div>
      </div>

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
          :number="rule.number"
          :diagram="rule.diagram"
          :description="rule.description"
          orientation="horizontal"
          :accent="rule.number === selectedCell?.column"
        />
      </div>
    </div>

    <fieldset class="vtg-slider-controls">
      <legend class="vtg-pane__visually-hidden">Animation settings</legend>
      <label>
        <span class="vtg-slider-controls__label">
          <span>BPM</span>
          <output>{{ bpm }}</output>
        </span>
        <input
          v-model.number="bpm"
          type="range"
          :min="vtgBpmControl.min"
          :max="vtgBpmControl.max"
          :step="vtgBpmControl.step"
          data-role="vtg-bpm"
        />
      </label>
      <label>
        <span class="vtg-slider-controls__label">
          <span>Scale</span>
          <output>{{ scale.toFixed(1) }}</output>
        </span>
        <input
          v-model.number="scale"
          type="range"
          :min="vtgScaleControl.min"
          :max="vtgScaleControl.max"
          :step="vtgScaleControl.step"
          data-role="vtg-scale"
        />
      </label>
    </fieldset>

    <fieldset class="vtg-pattern-options">
      <legend class="vtg-pane__visually-hidden">Pattern options</legend>
      <label>
        <input v-model="swapProps" type="checkbox" data-role="vtg-swap" />
        <span>Swap</span>
      </label>
      <label>
        <input v-model="reversePlane" type="checkbox" data-role="vtg-reverse" />
        <span>Reverse</span>
      </label>
    </fieldset>
  </section>
</template>

<script setup lang="ts">
import { mdiShuffleVariant } from '@mdi/js'

import BaseIcon from '@/components/icons/BaseIcon.vue'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import VtgRuleCard from '@/features/vtg/components/VtgRuleCard.vue'
import { vtgBpmControl, vtgScaleControl } from '@/features/vtg/data/vtgPlayerSettings'
import type {
  VtgCellAddress,
  VtgCellReference,
  VtgPropPlacement,
  VtgRuleDiagram,
  VtgRuleNumber,
  VtgRuleSpec,
  VtgPatternSelection,
  VtgSpeedRatio,
} from '@/features/vtg/types'
import { vtgSpeedRatios } from '@/features/vtg/types'

interface BlankDimensions {
  width: number
  height: number
}

interface VtgMatrixTile {
  label: string
  description: string
  column: VtgRuleNumber
  row: VtgRuleNumber
  boardColumn: number
  boardRow: number
  reference: VtgCellReference
}

const emit = defineEmits<{
  patternSelect: [selection: VtgPatternSelection]
}>()

const speedRatios = vtgSpeedRatios
const speedRatio = ref<VtgSpeedRatio>('1:1')
const isAnti = ref(false)
const swapProps = ref(false)
const reversePlane = ref(false)
const bpm = ref(vtgBpmControl.default)
const scale = ref(vtgScaleControl.default)
const spinToggleCells: ReadonlySet<VtgCellReference> = new Set(['5-6', '6-6', '5-5', '6-5'])

const matrixRows = [
  ['SO/TS', 'SS/TO', 'SO/TS', 'SS/TO', 'SO/TO', 'SS/TS'],
  ['TS/SO', 'TO/SS', 'TS/SO', 'TO/SS', 'TS/SS', 'TO/SO'],
  ['SO/SO', 'SS/SS', 'SO/SO', 'SS/SS', 'SO/SS', 'SS/SO'],
  ['TS/TS', 'TO/TO', 'TS/TS', 'TO/TO', 'TS/TO', 'TO/TS'],
  ['SO/SO', 'SS/SS', 'SO/SO', 'SS/SS', 'SO/SS', 'SS/SO'],
  ['TS/TS', 'TO/TO', 'TS/TS', 'TO/TO', 'TS/TO', 'TO/TS'],
] as const

const bottomRuleNumbers = [1, 2, 3, 4, 5, 6] as const
const leftRuleNumbers = [6, 5, 4, 3, 2, 1] as const
const timingDescriptions: Readonly<Record<string, string>> = {
  S: 'Split',
  O: 'Opposite',
  T: 'Together',
}
const describeTiming = (value: string) =>
  [...value].map((code) => timingDescriptions[code] ?? code).join(' / ')
const describeTile = (label: string) => {
  const [hands = '', props = ''] = label.split('/')
  return `Hands: ${describeTiming(hands)}\nProps: ${describeTiming(props)}`
}

const getRuleNumber = (ruleNumbers: readonly VtgRuleNumber[], index: number): VtgRuleNumber => {
  const ruleNumber = ruleNumbers[index]
  if (ruleNumber === undefined) throw new Error(`Missing VTG rule number at index ${index}`)
  return ruleNumber
}

const createCellReference = (column: VtgRuleNumber, row: VtgRuleNumber): VtgCellReference =>
  `${column}-${row}`

const matrixTiles: readonly VtgMatrixTile[] = matrixRows.flatMap((row, rowIndex) => {
  const rowNumber = getRuleNumber(leftRuleNumbers, rowIndex)

  return row.map((label, columnIndex) => {
    const columnNumber = getRuleNumber(bottomRuleNumbers, columnIndex)
    const reference = createCellReference(columnNumber, rowNumber)

    return {
      label,
      description: describeTile(label),
      column: columnNumber,
      row: rowNumber,
      boardColumn: columnIndex + 2,
      boardRow: rowIndex + 1,
      reference,
    }
  })
})

const selectedCell = ref<VtgCellAddress>()

const selectedCellReference = computed<VtgCellReference | undefined>(() => {
  const cell = selectedCell.value
  return cell ? createCellReference(cell.column, cell.row) : undefined
})

const isTileHighlighted = (tile: VtgMatrixTile) =>
  selectedCell.value !== undefined &&
  (tile.column === selectedCell.value.column || tile.row === selectedCell.value.row)

const isSpinToggleCell = (reference: VtgCellReference) => spinToggleCells.has(reference)
const isLowerRightSpinToggleCell = (reference: VtgCellReference) =>
  reference === '5-5' || reference === '6-5'

const emitPatternSelection = (tile: VtgMatrixTile) => {
  const selection: VtgPatternSelection = {
    reference: tile.reference,
    speedRatio: speedRatio.value,
  }
  if (isSpinToggleCell(tile.reference)) selection.isAnti = isAnti.value
  if (swapProps.value) selection.swapProps = true
  if (reversePlane.value) selection.reversePlane = true
  if (bpm.value !== vtgBpmControl.default) selection.bpm = bpm.value
  if (scale.value !== vtgScaleControl.default) selection.scale = scale.value
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
  const tile = matrixTiles[Math.floor(Math.random() * matrixTiles.length)]
  if (tile === undefined) throw new Error('Cannot select a random VTG cell from an empty matrix')
  selectTile(tile)
}

const toggleSpinDirection = (tile: VtgMatrixTile) => {
  isAnti.value = !isAnti.value
  emitPatternSelection(tile)
}

watch([speedRatio, swapProps, reversePlane, bpm, scale], () => {
  const tile = matrixTiles.find(({ reference }) => reference === selectedCellReference.value)
  if (tile !== undefined) emitPatternSelection(tile)
})

const propBounds = {
  outerStart: 4,
  beforeDivider: 41,
  afterDivider: 59,
  outerEnd: 96,
} as const

const createSplitDiagram = (
  firstLargeEnd: VtgPropPlacement['largeEnd'],
  secondLargeEnd: VtgPropPlacement['largeEnd'],
): VtgRuleDiagram => ({
  props: [
    {
      lane: 50,
      start: propBounds.outerStart,
      end: propBounds.beforeDivider,
      largeEnd: firstLargeEnd,
    },
    {
      lane: 50,
      start: propBounds.afterDivider,
      end: propBounds.outerEnd,
      largeEnd: secondLargeEnd,
    },
  ],
})

const createParallelDiagram = (
  dividerSide: 'before' | 'after',
  largeEnd: VtgPropPlacement['largeEnd'],
): VtgRuleDiagram => {
  const start = dividerSide === 'before' ? propBounds.outerStart : propBounds.afterDivider
  const end = dividerSide === 'before' ? propBounds.beforeDivider : propBounds.outerEnd

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
        start: propBounds.outerStart,
        end: propBounds.beforeDivider,
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

const sideRules: readonly VtgRuleSpec[] = [
  {
    labels: ['SPLIT', 'TOG'],
    number: 6,
    diagram: diagrams.alternatingSplit,
    description: ruleDescriptions[6],
  },
  {
    labels: ['TOG', 'SPLIT'],
    number: 5,
    diagram: diagrams.clusteredOutsideSplit,
    description: ruleDescriptions[5],
  },
  {
    labels: ['SPLIT', 'IN'],
    number: 4,
    diagram: diagrams.insideSplit,
    description: ruleDescriptions[4],
  },
  {
    labels: ['TOG', 'IN'],
    number: 3,
    diagram: diagrams.parallelAfterInside,
    description: ruleDescriptions[3],
  },
  {
    labels: ['SPLIT', 'OUT'],
    number: 2,
    diagram: diagrams.outsideSplit,
    description: ruleDescriptions[2],
  },
  {
    labels: ['TOG', 'OUT'],
    number: 1,
    diagram: diagrams.parallelAfterOutside,
    description: ruleDescriptions[1],
  },
]

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

const paneElement = ref<HTMLElement>()
const blankWidth = ref(0)
const blankHeight = ref(0)
const blankDimensions = reactive<BlankDimensions[]>(
  Array.from({ length: 9 }, () => ({ width: 0, height: 0 })),
)

let blankObserver: ResizeObserver | undefined

const roundDimension = (value: number) => Math.round(value * 100) / 100

onMounted(() => {
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
  })
  blankObserver = observer

  paneElement.value
    ?.querySelectorAll<HTMLElement>('[data-role="vtg-blank"]')
    .forEach((element) => observer.observe(element))
})

onBeforeUnmount(() => {
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
  bpm,
  scale,
})
</script>

<style scoped>
.vtg-pane {
  width: 100%;
  height: 100%;
  min-inline-size: 0;
  min-block-size: 0;
  padding-block-end: var(--size-pane-switch-bottom-clearance);
  overflow: auto;
  color: var(--color-text);
  background: transparent;
}

.vtg-speed-ratio {
  display: grid;
  width: 100%;
  min-width: 20rem;
  padding: var(--space-2);
  margin: 0;
  border: 0;
  justify-items: center;
}

.vtg-speed-ratio legend {
  padding: 0;
  margin-inline: auto;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  line-height: 1.2;
}

.vtg-speed-ratio__options {
  display: grid;
  width: min(100%, 14rem);
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-1);
  margin-block-start: var(--space-1);
}

.vtg-speed-ratio__options label {
  position: relative;
  cursor: pointer;
}

.vtg-speed-ratio__options input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.vtg-speed-ratio__options span {
  display: grid;
  min-height: 2rem;
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

.vtg-speed-ratio__options input:checked + span {
  color: var(--color-on-action-primary);
  background: var(--color-action-primary);
  border-color: var(--color-action-primary);
}

.vtg-speed-ratio__options input:focus-visible + span {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.vtg-pattern-options {
  display: flex;
  min-width: 20rem;
  padding: var(--space-2);
  margin: 0;
  border: 0;
  gap: var(--space-2);
  justify-content: center;
}

.vtg-pattern-options label {
  position: relative;
  cursor: pointer;
}

.vtg-pattern-options input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.vtg-pattern-options span {
  display: grid;
  min-width: 6rem;
  min-height: 2.25rem;
  padding-inline: var(--space-3);
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

.vtg-pattern-options input:checked + span {
  color: var(--color-on-action-primary);
  background: var(--color-action-primary);
  border-color: var(--color-action-primary);
}

.vtg-pattern-options input:focus-visible + span {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.vtg-slider-controls {
  display: grid;
  width: min(100%, 30rem);
  min-width: 20rem;
  padding: var(--space-3) var(--space-2) 0;
  margin: 0 auto;
  border: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.vtg-slider-controls label {
  display: grid;
  min-width: 0;
  gap: var(--space-1);
}

.vtg-slider-controls__label {
  display: flex;
  color: var(--color-text);
  font-size: 0.8125rem;
  font-weight: 700;
  justify-content: space-between;
}

.vtg-slider-controls output {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.vtg-slider-controls input {
  width: 100%;
  cursor: pointer;
  accent-color: var(--color-action-primary);
}

.vtg-slider-controls input:focus-visible {
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
  min-width: 20rem;
  aspect-ratio: 1;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-template-rows: repeat(7, minmax(0, 1fr));
  gap: 0.65%;
  padding: 0.65%;
}

.vtg-sidebar {
  display: grid;
  grid-row: 1 / span 6;
  grid-column: 1;
  grid-template-rows: repeat(6, minmax(0, 1fr));
  gap: var(--vtg-board-gap);
}

.vtg-matrix {
  position: relative;
  grid-row: 1 / span 6;
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
  inset-block-start: max(0.4rem, 1cqi);
  inset-inline-end: max(0.4rem, 1cqi);
  padding: max(0.24rem, 0.5cqi) max(0.44rem, 0.8cqi);
  color: var(--vtg-color-ink);
  cursor: pointer;
  background: var(--vtg-color-secondary);
  border: max(1px, 0.12cqi) solid var(--vtg-color-ink);
  border-radius: max(0.4rem, 0.9cqi);
  font-family: var(--font-family-sans);
  font-size: max(1rem, 2.2cqi);
  font-weight: 700;
  line-height: 1;
}

.vtg-tile__spin-toggle--lower-right {
  inset-block-start: auto;
  inset-block-end: max(0.4rem, 1cqi);
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
  grid-row: 7;
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
  grid-row: 7;
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
