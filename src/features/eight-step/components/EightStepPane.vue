<template>
  <section
    ref="paneElement"
    class="eight-step-pane"
    aria-labelledby="eight-step-pane-title"
    data-role="eight-step-pane"
    :data-selected-cell="selectedCell?.reference"
  >
    <h1 id="eight-step-pane-title" class="eight-step-pane__visually-hidden">
      Eight Step generator
    </h1>

    <div class="eight-step-top-options">
      <PatternTransformControls role-prefix="eight-step" @reset="resetPatternControls" />
    </div>

    <div class="eight-step-board" :style="headColorStyle" data-role="eight-step-board">
      <button
        type="button"
        class="eight-step-shuffle"
        aria-label="Shuffle Eight Step patterns"
        data-role="eight-step-shuffle"
        @click="selectRandomCell"
      >
        <BaseIcon :path="mdiShuffleVariant" size="42%" />
      </button>

      <div
        v-for="group in columnGroups"
        :key="group.label"
        class="eight-step-column-header"
        :class="{
          'eight-step-header--accent': isColumnGroupHighlighted(group),
        }"
        :style="{ gridColumn: `${group.columns[0] + 1} / span 2` }"
        :aria-label="`${group.label}, columns ${group.columns.join(' and ')}`"
        :aria-pressed="isColumnGroupHighlighted(group)"
        data-role="eight-step-column-header"
      >
        {{ group.label }}
      </div>

      <BaseTooltip
        v-for="(row, rowIndex) in eightStepRows"
        :key="`row-${row}`"
        class="eight-step-row-tooltip"
        :text="getRowDescription(row)"
        :style="{ gridRow: rowIndex + 2 }"
      >
        <template #activator="{ props: activatorProps }">
          <div
            v-bind="activatorProps"
            class="eight-step-row-header"
            :class="{
              'eight-step-header--accent': row === selectedCell?.row,
            }"
            :aria-label="row"
            :aria-pressed="row === selectedCell?.row"
            data-role="eight-step-row-header"
          >
            <span class="eight-step-row-header__first">{{ row[0] }}</span>
            <span class="eight-step-row-header__second">{{ row[1] }}</span>
          </div>
        </template>
      </BaseTooltip>

      <BaseTooltip
        v-for="cell in cells"
        :key="cell.reference"
        class="eight-step-cell-tooltip"
        :text="getCellDescription(cell)"
        :style="cell.style"
      >
        <template #activator="{ props: activatorProps }">
          <button
            v-bind="activatorProps"
            type="button"
            class="eight-step-cell"
            :class="{
              'eight-step-cell--highlighted': isCellHighlighted(cell),
              'eight-step-cell--marked': isMarkedCell(cell),
              'eight-step-cell--selected': cell.reference === selectedCell?.reference,
            }"
            :aria-label="`${getCellDescription(cell)}, cell ${cell.reference}`"
            :aria-pressed="cell.reference === selectedCell?.reference"
            :data-board-column="cell.column"
            :data-board-row="cell.row"
            :data-cell-reference="cell.reference"
            :data-preview-row-index="cell.rowIndex"
            data-role="eight-step-cell"
            @click="selectCell(cell)"
          >
            <img
              v-if="previewUrls[cell.rowIndex]"
              :src="previewUrls[cell.rowIndex]"
              alt=""
              class="eight-step-cell__preview"
              data-role="eight-step-preview"
              :data-preview-reference="eightStepPreviewReferences[cell.rowIndex]"
            />
          </button>
        </template>
        <template #html>
          <span class="eight-step-cell-tooltip__text">{{ getCellDescription(cell) }}</span>
        </template>
      </BaseTooltip>
    </div>

    <ConceptAnimationControls :animation="animation" role-prefix="eight-step" />
  </section>
</template>

<script setup lang="ts">
import { mdiShuffleVariant } from '@mdi/js'

import BaseIcon from '@/components/icons/BaseIcon.vue'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import { COLORS, COLSET } from '@/domain/animation/AnimStruct'
import ConceptAnimationControls from '@/features/concepts/components/ConceptAnimationControls.vue'
import PatternTransformControls from '@/features/concepts/components/PatternTransformControls.vue'
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'
import {
  eightStepPreviewReferences,
  useEightStepPreviews,
} from '@/features/eight-step/composables/useEightStepPreviews'
import { eightStepPatternDefinitions } from '@/features/eight-step/data/eightStepPatternDefinitions'
import {
  findEightStepPatternMatch,
  matchesEightStepSelection,
} from '@/features/eight-step/matchEightStepAnimation'
import { eightStepRows } from '@/features/eight-step/types'
import type {
  EightStepColumn,
  EightStepPatternDefinition,
  EightStepPatternSelection,
} from '@/features/eight-step/types'
import {
  vtgBpmControl,
  vtgPlayerSettings,
  vtgPropSettings,
  vtgScaleControl,
  vtgThickControl,
} from '@/features/vtg/data/vtgPlayerSettings'
import type { RootDataFinal } from '@/types/AnimTypes'
import { toColor } from '@/utils/UtilFunc'

const props = withDefaults(
  defineProps<{
    animation?: RootDataFinal
    animationReady?: boolean
  }>(),
  {
    animationReady: true,
  },
)

const emit = defineEmits<{
  patternSelect: [selection: EightStepPatternSelection]
}>()

interface EightStepCell extends EightStepPatternDefinition {
  rowIndex: number
  style: {
    gridColumn: number
    gridRow: number
  }
}

interface EightStepColumnGroup {
  label: string
  columns: readonly [EightStepColumn, EightStepColumn]
}

const columnGroups = [
  { label: 'Opposite', columns: [1, 2] },
  { label: 'Same', columns: [3, 4] },
  { label: 'Quarter Aligned', columns: [5, 6] },
  { label: 'Quarter Opposed', columns: [7, 8] },
] as const satisfies readonly EightStepColumnGroup[]

const rowDescriptions = {
  AA: 'Anti vs Anti',
  AE: 'Anti vs Ext',
  AI: 'Anti vs In',
  EA: 'Ext vs Anti',
  EE: 'Ext vs Ext',
  EI: 'Ext vs In',
  IA: 'In vs Anti',
  IE: 'In vs Ext',
  II: 'In vs In',
} as const satisfies Readonly<Record<(typeof eightStepRows)[number], string>>

const getRowDescription = (row: (typeof eightStepRows)[number]) => rowDescriptions[row]

const getCellDescription = (cell: EightStepPatternDefinition) => {
  const group = columnGroups.find(({ columns }) =>
    columns.some((column) => column === cell.column),
  )
  if (!group) throw new Error(`Missing Eight Step column group for column ${cell.column}`)
  return `${group.label}\n${getRowDescription(cell.row)}`
}

const markedCellReferences: ReadonlySet<string> = new Set([
  '1-AE',
  '1-AI',
  '2-EE',
  '2-EI',
  '2-IE',
  '2-II',
  '3-EE',
  '3-EI',
  '3-IE',
  '3-II',
  '4-AE',
  '4-AI',
  '5-EE',
  '5-EI',
  '5-IE',
  '5-II',
  '6-EE',
  '6-EI',
  '6-IE',
  '6-II',
  '7-AE',
  '7-AI',
  '8-AE',
  '8-AI',
])

const conceptsStore = useConceptsStore()
const { swapProps, reversePlane, bpm, scale, thick, paths, hands, arms } =
  storeToRefs(conceptsStore)
const selectedCell = ref<EightStepPatternDefinition>()

let suppressPatternEmit = false
let hydrationVersion = 0
let lastEmittedSelection: EightStepPatternSelection | undefined
let componentMounted = false
let initialAnimationHandled = false

const cells: readonly EightStepCell[] = eightStepPatternDefinitions.map((definition) => ({
  ...definition,
  rowIndex: eightStepRows.indexOf(definition.row),
  style: {
    gridColumn: definition.column + 1,
    gridRow: eightStepRows.indexOf(definition.row) + 2,
  },
}))

const getPropColor = (propIndex: 0 | 1, colorPart: 0 | 1 | 2) => {
  const sourcePropIndex = swapProps.value ? (propIndex === 0 ? 1 : 0) : propIndex
  const fallbackSettings = vtgPropSettings[sourcePropIndex]
  if (!fallbackSettings)
    throw new Error(`Missing Eight Step defaults for prop ${sourcePropIndex + 1}`)
  const fallbackColor = fallbackSettings.color
  const colorIndex = props.animation?.props[sourcePropIndex]?.color ?? COLORS.indexOf(fallbackColor)
  const colorSet = COLSET[colorIndex]
  if (!colorSet) throw new Error(`Missing Eight Step prop color set for index ${colorIndex}`)
  return toColor(colorSet[colorPart])
}

const headColorStyle = computed(() => ({
  '--eight-step-first-head': getPropColor(0, 0),
  '--eight-step-first-tether': getPropColor(0, 2),
  '--eight-step-second-head': getPropColor(1, 0),
  '--eight-step-second-tether': getPropColor(1, 2),
}))

const paneElement = ref<HTMLElement>()
const previewDimensions = reactive(eightStepPreviewReferences.map(() => ({ width: 0, height: 0 })))
const { previewUrls, requestPreviews } = useEightStepPreviews({
  dimensions: previewDimensions,
  swapProps,
  reversePlane,
  scale,
})

let previewObserver: ResizeObserver | undefined

const roundDimension = (value: number) => Math.round(value * 100) / 100

const isCellHighlighted = (cell: EightStepPatternDefinition) =>
  selectedCell.value !== undefined &&
  (cell.column === selectedCell.value.column || cell.row === selectedCell.value.row)

const isMarkedCell = (cell: EightStepPatternDefinition) => markedCellReferences.has(cell.reference)

const isColumnGroupHighlighted = (group: EightStepColumnGroup) =>
  selectedCell.value !== undefined &&
  group.columns.some((column) => column === selectedCell.value?.column)

const createSelection = (cell: EightStepPatternDefinition): EightStepPatternSelection => {
  const selection: EightStepPatternSelection = {
    concept: '8stp',
    reference: cell.reference,
  }

  if (swapProps.value) selection.swapProps = true
  if (reversePlane.value) selection.reversePlane = true
  if (bpm.value !== vtgBpmControl.default) selection.bpm = bpm.value
  if (scale.value !== vtgScaleControl.default) selection.scale = scale.value
  if (thick.value !== vtgThickControl.default) selection.thick = thick.value
  if (paths.value !== vtgPlayerSettings.paths) selection.paths = paths.value
  if (hands.value !== vtgPlayerSettings.hands) selection.hands = hands.value
  if (arms.value !== vtgPlayerSettings.arms) selection.arms = arms.value

  return selection
}

const emitPatternSelection = (cell: EightStepPatternDefinition) => {
  const selection = createSelection(cell)
  lastEmittedSelection = selection
  emit('patternSelect', selection)
}

const selectCell = (cell: EightStepPatternDefinition) => {
  selectedCell.value = cell
  emitPatternSelection(cell)
}

const selectRandomCell = () => {
  const cell = cells[Math.floor(Math.random() * cells.length)]
  if (!cell) throw new Error('Cannot select a random Eight Step cell from an empty matrix')
  selectCell(cell)
}

const resetPatternControls = async () => {
  suppressPatternEmit = true
  conceptsStore.resetPatternControls()
  await nextTick()
  suppressPatternEmit = false
  if (selectedCell.value) emitPatternSelection(selectedCell.value)
}

watch([swapProps, reversePlane, bpm, scale, thick, paths, hands, arms], () => {
  if (!suppressPatternEmit && selectedCell.value) emitPatternSelection(selectedCell.value)
})

const hydratePatternControls = (animation: RootDataFinal) => {
  if (lastEmittedSelection && matchesEightStepSelection(animation, lastEmittedSelection)) {
    lastEmittedSelection = undefined
    return
  }
  lastEmittedSelection = undefined

  const match = findEightStepPatternMatch(animation)
  const version = ++hydrationVersion
  suppressPatternEmit = true

  if (match) {
    selectedCell.value = cells.find(({ reference }) => reference === match.reference)
    swapProps.value = match.swapProps
    reversePlane.value = match.reversePlane
    bpm.value = match.bpm
    scale.value = match.scale
    thick.value = animation.thick
    paths.value = animation.paths
    hands.value = animation.hands ?? vtgPlayerSettings.hands
    arms.value = animation.arms
  } else {
    selectedCell.value = undefined
  }

  void nextTick(() => {
    if (version === hydrationVersion) suppressPatternEmit = false
  })
}

const selectInitialRandomPattern = () => {
  const version = ++hydrationVersion
  suppressPatternEmit = true
  conceptsStore.resetPatternControls()
  selectRandomCell()

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

onMounted(() => {
  componentMounted = true
  syncPatternControls()

  if (typeof ResizeObserver === 'undefined') return

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (!(entry.target instanceof HTMLElement)) continue

      const rowIndex = Number(entry.target.dataset.previewRowIndex)
      const dimensions = previewDimensions[rowIndex]
      if (!dimensions) continue

      dimensions.width = roundDimension(entry.contentRect.width * 0.78)
      dimensions.height = roundDimension(entry.contentRect.height * 0.78)
    }
    requestPreviews()
  })
  previewObserver = observer

  paneElement.value
    ?.querySelectorAll<HTMLElement>('[data-board-column="1"]')
    .forEach((element) => observer.observe(element))
})

onBeforeUnmount(() => {
  componentMounted = false
  previewObserver?.disconnect()
})

defineExpose({
  cells,
  previewDimensions,
  previewUrls,
  selectedCell,
  swapProps,
  reversePlane,
  bpm,
  scale,
  thick,
  paths,
  hands,
  arms,
})
</script>

<style scoped>
.eight-step-pane {
  width: 100%;
  min-inline-size: 0;
  min-block-size: 0;
  padding-block-end: var(--size-pane-switch-bottom-clearance);
  color: var(--color-text);
  background: transparent;
}

.eight-step-top-options {
  display: flex;
  min-width: 20rem;
  padding: 0 var(--space-2) var(--space-1);
  justify-content: center;
}

.eight-step-board {
  /* These category colors intentionally match VTG and remain stable across themes. */
  --eight-step-color-primary: #5968df;
  --eight-step-color-secondary: #2dc8a8;
  --eight-step-color-ink: #071d26;
  --eight-step-color-rule: #111820;
  --eight-step-color-rule-text: #f6f8fb;
  --eight-step-color-line: #e9eef2;
  --eight-step-color-marked: #8a7600;
  --eight-step-color-marked-selected: #ff0000;
  --eight-step-color-preview: #071421;
  --eight-step-board-gap: 0.65cqi;

  container-type: inline-size;
  display: grid;
  width: 100%;
  min-width: 20rem;
  aspect-ratio: 8.5 / 9.5;
  grid-template-columns: minmax(0, 0.5fr) repeat(8, minmax(0, 1fr));
  grid-template-rows: minmax(0, 0.5fr) repeat(9, minmax(0, 1fr));
  gap: 0.65%;
  padding: 0.65%;
}

.eight-step-shuffle,
.eight-step-column-header,
.eight-step-row-header,
.eight-step-cell {
  min-width: 0;
  min-height: 0;
  box-shadow: 0 0.45cqi 1cqi color-mix(in srgb, var(--eight-step-color-preview) 22%, transparent);
}

.eight-step-shuffle {
  appearance: none;
  display: grid;
  grid-row: 1;
  grid-column: 1;
  padding: 0;
  color: var(--eight-step-color-ink);
  cursor: pointer;
  background: var(--eight-step-color-secondary);
  border: 0;
  border-radius: 0.75cqi;
  place-items: center;
}

.eight-step-column-header,
.eight-step-row-header {
  display: grid;
  color: var(--eight-step-color-rule-text);
  background: var(--eight-step-color-rule);
  border: max(1px, 0.16cqi) dashed var(--eight-step-color-line);
  border-radius: 0.7cqi;
  font-family: 'Arial Narrow', var(--font-family-sans);
  font-weight: 700;
  place-items: center;
}

.eight-step-column-header {
  grid-row: 1;
  padding-inline: 0.25em;
  font-size: max(0.7rem, 2cqi);
  font-weight: 800;
  line-height: 0.95;
  text-align: center;
}

.eight-step-row-header {
  display: flex;
  gap: 0.04em;
  align-items: center;
  justify-content: center;
  font-size: max(0.62rem, 1.7cqi);
  letter-spacing: 0.08em;
}

.eight-step-row-tooltip {
  grid-column: 1;
  min-width: 0;
  min-height: 0;
}

.eight-step-row-tooltip > .eight-step-row-header {
  width: 100%;
  height: 100%;
}

.eight-step-header--accent {
  color: var(--eight-step-color-ink);
  background: var(--eight-step-color-secondary);
  border-color: var(--eight-step-color-ink);
}

.eight-step-row-header__first {
  color: var(--eight-step-first-head);
}

.eight-step-row-header__second {
  color: var(--eight-step-second-head);
}

.eight-step-header--accent .eight-step-row-header__first {
  color: var(--eight-step-first-tether);
}

.eight-step-header--accent .eight-step-row-header__second {
  color: var(--eight-step-second-tether);
}

.eight-step-cell {
  appearance: none;
  display: grid;
  padding: 0;
  cursor: pointer;
  background: var(--eight-step-color-primary);
  border: 0;
  border-radius: 1.7cqi;
  box-shadow:
    inset 0 0.15cqi 0.15cqi color-mix(in srgb, var(--eight-step-color-rule-text) 12%, transparent),
    0 0.45cqi 1cqi color-mix(in srgb, var(--eight-step-color-preview) 22%, transparent);
  transition:
    background var(--transition-fast),
    box-shadow var(--transition-fast);
  place-items: center;
}

.eight-step-cell-tooltip {
  display: flex;
  min-width: 0;
  min-height: 0;
}

.eight-step-cell-tooltip > .eight-step-cell {
  width: 100%;
  height: 100%;
}

.eight-step-cell-tooltip__text {
  white-space: pre-line;
}

.eight-step-cell__preview {
  display: block;
  width: 78%;
  aspect-ratio: 1;
  object-fit: contain;
  pointer-events: none;
  background: color-mix(in srgb, var(--eight-step-color-preview) 94%, transparent);
  border-radius: 0.9cqi;
  box-shadow: 0 0.35cqi 0.85cqi color-mix(in srgb, var(--eight-step-color-preview) 30%, transparent);
}

.eight-step-cell--highlighted {
  background: var(--eight-step-color-secondary);
}

.eight-step-cell--marked {
  box-shadow:
    inset 0 0 0 max(2px, 0.28cqi) var(--eight-step-color-marked),
    inset 0 0 0 max(4px, 0.52cqi) var(--eight-step-color-ink),
    0 0.45cqi 1cqi color-mix(in srgb, var(--eight-step-color-preview) 22%, transparent);
}

.eight-step-cell--selected {
  box-shadow:
    inset 0 0 0 max(2px, 0.28cqi) var(--eight-step-color-rule-text),
    inset 0 0 0 max(4px, 0.52cqi) var(--eight-step-color-ink),
    0 0.45cqi 1cqi color-mix(in srgb, var(--eight-step-color-preview) 22%, transparent);
}

.eight-step-cell--marked.eight-step-cell--selected {
  box-shadow:
    inset 0 0 0 max(2px, 0.28cqi) var(--eight-step-color-marked-selected),
    inset 0 0 0 max(4px, 0.52cqi) var(--eight-step-color-ink),
    0 0.45cqi 1cqi color-mix(in srgb, var(--eight-step-color-preview) 22%, transparent);
}

.eight-step-shuffle:focus-visible,
.eight-step-cell:focus-visible {
  outline: max(2px, 0.2cqi) solid var(--eight-step-color-rule-text);
  outline-offset: max(1px, 0.1cqi);
}

.eight-step-pane__visually-hidden {
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
