<template>
  <section
    ref="paneElement"
    class="vtg-pane"
    aria-labelledby="vtg-pane-title"
    data-role="vtg-pane"
    :data-blank-width="blankWidth"
    :data-blank-height="blankHeight"
    :data-selected-cell="selectedCellReference"
    :data-previewed-cell="previewedCellReference"
  >
    <h1 id="vtg-pane-title" class="vtg-pane__visually-hidden">VTG generator</h1>

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
          :accent="rule.number === activeCell?.row"
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
                :class="{ 'vtg-tile--highlighted': isTileHighlighted(tile) }"
                :aria-label="`${tile.label}, cell ${tile.reference}`"
                :aria-pressed="tile.reference === selectedCellReference"
                :data-board-column="tile.boardColumn"
                :data-board-row="tile.boardRow"
                :data-cell-reference="tile.reference"
                data-role="vtg-tile"
                @click="selectTile(tile)"
                @mouseenter="previewTile(tile)"
                @mouseleave="clearTilePreview"
              >
                {{ tile.label }}
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

      <button type="button" class="vtg-shuffle" aria-label="Shuffle VTG rules">
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
          :accent="rule.number === activeCell?.column"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { mdiShuffleVariant } from '@mdi/js'

import BaseIcon from '@/components/icons/BaseIcon.vue'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import VtgRuleCard from '@/features/vtg/components/VtgRuleCard.vue'
import { debounce } from '@/utils/UtilFunc'
import type {
  VtgCellAddress,
  VtgCellReference,
  VtgPropPlacement,
  VtgRuleDiagram,
  VtgRuleNumber,
  VtgRuleSpec,
} from '@/features/vtg/types'

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
  S: 'Split Time',
  O: 'Opposite Direction',
  T: 'Together Time',
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
const previewedCell = ref<VtgCellAddress>()
const activeCell = computed(() => previewedCell.value ?? selectedCell.value)
const previewRestoreDelay = 50

const selectedCellReference = computed<VtgCellReference | undefined>(() => {
  const cell = selectedCell.value
  return cell ? createCellReference(cell.column, cell.row) : undefined
})
const previewedCellReference = computed<VtgCellReference | undefined>(() => {
  const cell = previewedCell.value
  return cell ? createCellReference(cell.column, cell.row) : undefined
})

const isTileHighlighted = (tile: VtgMatrixTile) =>
  activeCell.value !== undefined &&
  (tile.column === activeCell.value.column || tile.row === activeCell.value.row)

const selectTile = (tile: VtgMatrixTile) => {
  selectedCell.value = {
    column: tile.column,
    row: tile.row,
  }
}

const previewTile = (tile: VtgMatrixTile) => {
  clearTilePreview.cancel()
  previewedCell.value = {
    column: tile.column,
    row: tile.row,
  }
}

const clearTilePreview = debounce(() => {
  previewedCell.value = undefined
}, previewRestoreDelay)

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
  parallelBeforeInside: createParallelDiagram('before', 'end'),
  parallelAfterInside: createParallelDiagram('after', 'start'),
  parallelAfterOutside: createParallelDiagram('after', 'end'),
} as const

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
    diagram: diagrams.outsideSplit,
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
    diagram: diagrams.parallelBeforeInside,
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
    diagram: diagrams.outsideSplit,
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

  blankObserver = new ResizeObserver((entries) => {
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

  const blankElements =
    paneElement.value?.querySelectorAll<HTMLElement>('[data-role="vtg-blank"]') ?? []
  for (const element of blankElements) blankObserver.observe(element)
})

onBeforeUnmount(() => {
  clearTilePreview.cancel()
  blankObserver?.disconnect()
})

defineExpose({
  blankDimensions,
  blankWidth,
  blankHeight,
  selectedCell,
  selectedCellReference,
  previewedCell,
  previewedCellReference,
})
</script>

<style scoped>
.vtg-pane {
  width: 100%;
  height: 100%;
  min-inline-size: 0;
  min-block-size: 0;
  overflow: auto;
  color: var(--color-text);
  background: transparent;
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
  width: max(100%, 32rem);
  min-width: 32rem;
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

.vtg-tile--highlighted {
  color: var(--vtg-color-ink);
  background: var(--vtg-color-secondary);
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
