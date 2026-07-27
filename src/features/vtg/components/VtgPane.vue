<template>
  <section
    ref="paneElement"
    class="vtg-pane"
    aria-labelledby="vtg-pane-title"
    data-role="vtg-pane"
    :data-blank-width="blankWidth"
    :data-blank-height="blankHeight"
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
          orientation="vertical"
          :accent="rule.accent"
        />
      </div>

      <div class="vtg-matrix" data-role="vtg-matrix">
        <div class="vtg-tile-grid">
          <div
            v-for="tile in matrixTiles"
            :key="tile.key"
            class="vtg-tile"
            :class="`vtg-tile--${tile.tone}`"
            data-role="vtg-tile"
          >
            {{ tile.label }}
          </div>
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

      <div class="vtg-shuffle" aria-label="Shuffle VTG rules">
        <BaseIcon :path="mdiShuffleVariant" size="42%" />
      </div>

      <div class="vtg-footer" data-role="vtg-footer">
        <VtgRuleCard
          v-for="rule in bottomRules"
          :key="`bottom-${rule.number}`"
          :labels="rule.labels"
          :number="rule.number"
          :diagram="rule.diagram"
          orientation="horizontal"
          :accent="rule.accent"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { mdiShuffleVariant } from '@mdi/js'

import BaseIcon from '@/components/icons/BaseIcon.vue'
import VtgRuleCard from '@/features/vtg/components/VtgRuleCard.vue'
import type { VtgPropPlacement, VtgRuleDiagram, VtgRuleSpec } from '@/features/vtg/types'

interface BlankDimensions {
  width: number
  height: number
}

const matrixRows = [
  ['SO/TS', 'SS/TO', 'SO/TS', 'SS/TO', 'SO/TO', 'SS/TS'],
  ['TS/SO', 'TO/SS', 'TS/SO', 'TO/SS', 'TS/SS', 'TO/SO'],
  ['SO/SO', 'SS/SS', 'SO/SO', 'SS/SS', 'SO/SS', 'SS/SO'],
  ['TS/TS', 'TO/TO', 'TS/TS', 'TO/TO', 'TS/TO', 'TO/TS'],
  ['SO/SO', 'SS/SS', 'SO/SO', 'SS/SS', 'SO/SS', 'SS/SO'],
  ['TS/TS', 'TO/TO', 'TS/TS', 'TO/TO', 'TS/TO', 'TO/TS'],
] as const

const matrixTiles = matrixRows.flatMap((row, rowIndex) =>
  row.map((label, columnIndex) => ({
    key: `${rowIndex}-${columnIndex}`,
    label,
    tone: rowIndex === 1 || columnIndex === 5 ? ('secondary' as const) : ('primary' as const),
  })),
)

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

const sideRules: readonly VtgRuleSpec[] = [
  {
    labels: ['SPLIT', 'TOG'],
    number: 6,
    diagram: diagrams.alternatingSplit,
  },
  {
    labels: ['TOG', 'SPLIT'],
    number: 5,
    accent: true,
    diagram: diagrams.outsideSplit,
  },
  {
    labels: ['SPLIT', 'IN'],
    number: 4,
    diagram: diagrams.insideSplit,
  },
  {
    labels: ['TOG', 'IN'],
    number: 3,
    diagram: diagrams.parallelAfterInside,
  },
  {
    labels: ['SPLIT', 'OUT'],
    number: 2,
    diagram: diagrams.outsideSplit,
  },
  {
    labels: ['TOG', 'OUT'],
    number: 1,
    diagram: diagrams.parallelAfterOutside,
  },
]

const bottomRules: readonly VtgRuleSpec[] = [
  {
    labels: ['TOG', 'OUT'],
    number: 1,
    diagram: diagrams.parallelAfterOutside,
  },
  {
    labels: ['SPLIT', 'OUT'],
    number: 2,
    diagram: diagrams.outsideSplit,
  },
  {
    labels: ['TOG', 'IN'],
    number: 3,
    diagram: diagrams.parallelBeforeInside,
  },
  {
    labels: ['SPLIT', 'IN'],
    number: 4,
    diagram: diagrams.insideSplit,
  },
  {
    labels: ['SPLIT', 'SPLIT'],
    number: 5,
    diagram: diagrams.outsideSplit,
  },
  {
    labels: ['SPLIT', 'TOG'],
    number: 6,
    accent: true,
    diagram: diagrams.alternatingSplit,
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
  blankObserver?.disconnect()
})

defineExpose({
  blankDimensions,
  blankWidth,
  blankHeight,
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
  display: grid;
  min-width: 0;
  min-height: 0;
  place-items: center;
  border-radius: 1.7cqi;
  box-shadow:
    inset 0 0.15cqi 0.15cqi color-mix(in srgb, var(--vtg-color-rule-text) 12%, transparent),
    0 0.45cqi 1cqi color-mix(in srgb, var(--vtg-color-preview) 22%, transparent);
  font-family: 'Arial Narrow', var(--font-family-sans);
  font-size: max(0.78rem, 2.55cqi);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
  white-space: nowrap;
}

.vtg-tile--primary {
  color: var(--vtg-color-rule-text);
  background: var(--vtg-color-primary);
}

.vtg-tile--secondary {
  color: var(--vtg-color-ink);
  background: var(--vtg-color-secondary);
}

.vtg-blank {
  z-index: 3;
  align-self: start;
  justify-self: start;
  width: 62%;
  aspect-ratio: 1;
  background: var(--vtg-color-preview);
  border-radius: 0.9cqi;
  box-shadow: 0 0.35cqi 0.85cqi color-mix(in srgb, var(--vtg-color-preview) 30%, transparent);
  transform: translate(-50%, -50%);
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
  display: grid;
  grid-row: 7;
  grid-column: 1;
  color: var(--vtg-color-ink);
  background: var(--vtg-color-secondary);
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
