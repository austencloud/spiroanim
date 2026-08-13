<template>
  <div ref="pageElement" class="qst-catalog-page" :style="pageStyle" data-role="qst-catalog-page">
    <article
      v-for="(entry, patternIndex) in entries"
      :key="entry.pattern.reference"
      class="qst-pattern-card"
      :class="{ 'qst-pattern-card--selected': entry.pattern.reference === selectedReference }"
      :data-pattern-reference="entry.pattern.reference"
      data-role="qst-pattern-card"
    >
      <AppTooltip class="qst-pattern-card__tooltip" :text="`Load ${entry.pattern.caption}`">
        <template #activator="{ props: activatorProps }">
          <button
            v-bind="activatorProps"
            type="button"
            class="qst-pattern-card__select"
            :aria-label="`Load ${entry.pattern.caption}`"
            :aria-pressed="entry.pattern.reference === selectedReference"
            @click="emit('select', entry.pattern)"
          />
        </template>
      </AppTooltip>
      <QstPatternTitle :caption="entry.pattern.caption" />

      <div
        v-for="line in entry.lines"
        :key="line.index"
        class="qst-pattern-line"
        :data-line-index="line.index"
      >
        <div
          class="qst-pattern-line__thumbnail"
          :data-preview-index="previewIndexByLine.get(`${entry.pattern.reference}:${line.index}`)"
          data-role="qst-line-thumbnail"
        >
          <img
            v-if="previewUrl(entry.pattern.reference, line.index)"
            :src="previewUrl(entry.pattern.reference, line.index)"
            alt=""
            data-role="qst-line-preview"
          />
          <span v-else aria-hidden="true" />
        </div>
        <div class="qst-pattern-line__tiles" :style="{ '--qst-line-beats': line.tiles.length }">
          <QstPositionTile v-for="(tile, index) in line.tiles" :key="index" :tile="tile" />
        </div>
      </div>
      <span class="qst-pattern-card__number" aria-hidden="true">{{ patternIndex + 1 }}</span>
    </article>
  </div>
</template>

<script setup lang="ts">
import AppTooltip from '@/components/AppTooltip.vue'
import QstPositionTile from '@/features/quarter-space-tech/components/QstPositionTile.vue'
import QstPatternTitle from '@/features/quarter-space-tech/components/QstPatternTitle.vue'
import { useConceptPreviewRenderer } from '@/features/concepts/composables/useConceptPreviewRenderer'
import {
  createDefaultQstAnimation,
  createQstLinePreviewAnimation,
} from '@/features/quarter-space-tech/createQstAnimation'
import { analyzeQstSequence } from '@/features/quarter-space-tech/math/analyzeQstAnimation'
import type {
  QstCatalogPage,
  QstPatternDefinition,
  QstPatternReference,
  QstPatternSelection,
} from '@/features/quarter-space-tech/types'

type QstLineReference = `${QstPatternReference}:${number}`

const props = defineProps<{
  page: QstCatalogPage
  selectedReference?: QstPatternReference
  selectionFor: (pattern: QstPatternDefinition) => QstPatternSelection
}>()

const emit = defineEmits<{
  select: [pattern: QstPatternDefinition]
}>()

const entries = computed(() =>
  props.page.patterns.map((pattern) => {
    const animation = createDefaultQstAnimation(props.selectionFor(pattern))
    if (!animation) throw new Error(`Missing QST animation for ${pattern.reference}`)
    const lines = analyzeQstSequence(animation, pattern.lineBeats)
    return {
      pattern,
      lines,
      maxBeats: Math.max(...lines.map(({ tiles }) => tiles.length)),
    }
  }),
)

const pageStyle = computed(() => ({
  '--qst-page-card-beats': Math.max(...entries.value.map(({ maxBeats }) => maxBeats)),
}))

const references = props.page.patterns.flatMap((pattern): QstLineReference[] => {
  const animation = createDefaultQstAnimation(props.selectionFor(pattern))
  if (!animation) return []
  return analyzeQstSequence(animation, pattern.lineBeats).map(
    ({ index }): QstLineReference => `${pattern.reference}:${index}`,
  )
})
const previewIndexByLine = new Map(references.map((reference, index) => [reference, index]))
const previewDimensions = reactive(references.map(() => ({ width: 0, height: 0 })))
const lineByReference = new Map(
  references.map((reference) => {
    const [patternReference, lineIndexText] = reference.split(':')
    const pattern = props.page.patterns.find(({ reference: item }) => item === patternReference)
    return [reference, { pattern, lineIndex: Number(lineIndexText) }] as const
  }),
)

const renderer = useConceptPreviewRenderer({
  dimensions: previewDimensions,
  references,
  label: 'Quarter Space Tech',
  createAnimation: (reference) => {
    const line = lineByReference.get(reference)
    if (!line?.pattern) return undefined
    const lineBeats = line.pattern.lineBeats ?? line.pattern.props[0].anim.length - 1
    return createQstLinePreviewAnimation(
      props.selectionFor(line.pattern),
      line.lineIndex,
      lineBeats,
    )
  },
})

const previewUrl = (reference: QstPatternReference, lineIndex: number) => {
  const previewIndex = previewIndexByLine.get(`${reference}:${lineIndex}`)
  return previewIndex === undefined ? '' : renderer.previewUrls.value[previewIndex]
}

const pageElement = ref<HTMLElement>()
let previewObserver: ResizeObserver | undefined

onMounted(() => {
  if (typeof ResizeObserver === 'undefined') return

  previewObserver = new ResizeObserver((records) => {
    for (const record of records) {
      if (!(record.target instanceof HTMLElement)) continue
      const previewIndex = Number(record.target.dataset.previewIndex)
      const dimensions = previewDimensions[previewIndex]
      if (!dimensions) continue
      dimensions.width = Math.round(record.contentRect.width * 100) / 100
      dimensions.height = Math.round(record.contentRect.height * 100) / 100
    }
    renderer.requestPreviews()
  })

  pageElement.value
    ?.querySelectorAll<HTMLElement>('[data-preview-index]')
    .forEach((element) => previewObserver?.observe(element))
})

onBeforeUnmount(() => previewObserver?.disconnect())
</script>

<style scoped>
.qst-catalog-page {
  --qst-page-card-beats: 4;

  display: grid;
  min-inline-size: var(--size-concept-content-min-width);
  padding: var(--space-2);
  grid-template-columns: repeat(
    auto-fill,
    minmax(min(100%, calc(5rem + var(--qst-page-card-beats) * 2.75rem)), 1fr)
  );
  align-items: stretch;
  gap: var(--space-2);
}

.qst-pattern-card {
  position: relative;
  display: grid;
  min-inline-size: 0;
  padding: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  gap: var(--space-2);
  overflow: hidden;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

.qst-pattern-card:hover {
  border-color: var(--color-action-primary);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.qst-pattern-card--selected {
  border-color: var(--color-action-primary);
  box-shadow:
    inset 0 0 0 1px var(--color-action-primary),
    var(--shadow-md);
}

.qst-pattern-card__select {
  position: absolute;
  z-index: 3;
  inset: 0;
  padding: 0;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: inherit;
}

.qst-pattern-card__tooltip.tooltip-root {
  position: absolute;
  inset: 0;
}

.qst-pattern-card__select:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: -4px;
}

.qst-pattern-card__number {
  position: absolute;
  inset-block-start: var(--space-2);
  inset-inline-end: var(--space-2);
  color: var(--color-text-muted);
  font-size: 0.68rem;
  font-variant-numeric: tabular-nums;
}

.qst-pattern-line {
  display: flex;
  min-inline-size: 0;
  align-items: center;
  gap: var(--space-2);
}

.qst-pattern-line + .qst-pattern-line {
  padding-block-start: var(--space-2);
  border-block-start: 1px solid var(--color-border);
}

.qst-pattern-line__thumbnail {
  display: grid;
  width: clamp(3.5rem, 13%, 5rem);
  aspect-ratio: 1;
  flex: 0 0 auto;
  overflow: hidden;
  background:
    radial-gradient(
      circle at center,
      color-mix(in srgb, var(--color-action-primary) 20%, transparent),
      transparent 67%
    ),
    var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  place-items: center;
}

.qst-pattern-line__thumbnail img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qst-pattern-line__thumbnail span {
  width: 42%;
  aspect-ratio: 1;
  border: 2px solid color-mix(in srgb, var(--color-action-primary) 48%, transparent);
  border-block-start-color: var(--color-action-primary);
  border-radius: 50%;
  animation: qst-preview-pulse 1.2s linear infinite;
}

.qst-pattern-line__tiles {
  --qst-line-beats: 4;
  --qst-line-gap: clamp(0.075rem, 0.4vw, var(--space-1));

  display: grid;
  min-inline-size: 0;
  flex: 1 1 auto;
  grid-template-columns: repeat(var(--qst-line-beats), minmax(0, 3.5rem));
  justify-content: center;
  gap: var(--qst-line-gap);
}

@keyframes qst-preview-pulse {
  to {
    transform: rotate(1turn);
  }
}

@media (prefers-reduced-motion: reduce) {
  .qst-pattern-line__thumbnail span {
    animation: none;
  }
}
</style>
