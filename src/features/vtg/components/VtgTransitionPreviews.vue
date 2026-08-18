<template>
  <div
    ref="previewGrid"
    class="vtg-transition-previews"
    :class="{ 'vtg-transition-previews--drag-active': dragActive }"
    data-role="vtg-transition-previews"
    :style="{ '--vtg-transition-preview-columns': String(columns) }"
  >
    <div
      v-for="(url, index) in previewUrls"
      :key="index"
      class="vtg-transition-previews__item"
      :class="{
        'vtg-transition-previews__item--drag-over': dragOverIndex === index,
        'vtg-transition-previews__item--delete-revealed': revealedDeleteIndex === index,
      }"
      :data-preview-index="index"
      @dragenter.prevent="dragOverIndex = index"
      @dragover.prevent="allowPatternDrop"
      @dragleave="leavePatternDrop(index, $event)"
      @drop.prevent="dropPattern(index, $event)"
    >
      <button
        class="vtg-transition-previews__visual"
        type="button"
        :aria-label="`Preview pattern ${index + 1}`"
        :aria-controls="touchDevice ? `vtg-transition-preview-delete-${index}` : undefined"
        :aria-expanded="touchDevice ? revealedDeleteIndex === index : undefined"
        @click="previewPattern(index)"
      >
        <img
          v-if="url"
          class="vtg-transition-previews__image"
          :src="url"
          :alt="`45 Trans pattern ${index + 1}`"
        />
      </button>
      <button
        :id="`vtg-transition-preview-delete-${index}`"
        class="vtg-transition-previews__delete"
        type="button"
        :aria-label="`Delete pattern ${index + 1}`"
        @click.stop="emit('patternDelete', index)"
      >
        <BaseIcon :path="mdiTrashCanOutline" :size="18" />
      </button>
      <label class="vtg-transition-previews__beats">
        <span class="vtg-transition-previews__visually-hidden">
          Pattern {{ index + 1 }} beats
        </span>
        <input
          type="range"
          :min="minimumBeatCount(index)"
          :max="maximumBeatCount(index)"
          step="0.5"
          :value="beatCounts[index]"
          :aria-label="`Pattern ${index + 1} beats`"
          :aria-valuetext="`${beatCounts[index]} beats`"
          data-role="vtg-transition-preview-beats"
          @input="updateBeatCount(index, $event)"
          @pointerdown="emit('sliderStart')"
          @pointerup="emit('sliderEnd')"
          @pointercancel="emit('sliderEnd')"
          @keydown="emit('sliderStart')"
          @keyup="emit('sliderEnd')"
          @blur="emit('sliderEnd')"
        />
        <output>{{ beatCounts[index] }}</output>
      </label>
    </div>

    <div
      class="vtg-transition-previews__item vtg-transition-previews__placeholder"
      :class="{
        'vtg-transition-previews__item--drag-over': dragOverIndex === previewUrls.length,
      }"
      data-role="vtg-transition-preview-drop-target"
      :data-preview-index="previewUrls.length"
      @dragenter.prevent="dragOverIndex = previewUrls.length"
      @dragover.prevent="allowPatternDrop"
      @dragleave="leavePatternDrop(previewUrls.length, $event)"
      @drop.prevent="dropPattern(previewUrls.length, $event)"
    >
      <span>Drag and drop a pattern here</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useConceptPreviewRenderer } from '@/features/concepts/composables/useConceptPreviewRenderer'
import type { ConceptPreviewDimensions } from '@/features/concepts/composables/useConceptPreviewRenderer'
import type { RootDataFinal } from '@/types/AnimTypes'
import { builderPatternDragType } from '@/features/builder/types'
import type { BuilderPatternDrop } from '@/features/builder/types'
import type { ConceptPatternSelection } from '@/features/concepts/types'
import { toVtgBuilderDisplayAnimation } from '@/features/builder/toVtgBuilderDisplayAnimation'
import { vtgThickControl } from '@/features/vtg/data/vtgPlayerSettings'
import BaseIcon from '@/components/icons/BaseIcon.vue'
import { mdiTrashCanOutline } from '@mdi/js'
import { isTouchDevice } from '@/utils/device'
import {
  builderPatternPointerDropEvent,
  builderPatternPointerEndEvent,
  builderPatternPointerMoveEvent,
} from '@/features/builder/patternPointerDrag'
import type { BuilderPatternPointerDetail } from '@/features/builder/patternPointerDrag'

const props = withDefaults(
  defineProps<{
    animations: readonly RootDataFinal[]
    refreshKey: string
    columns?: number
    initialBeatCounts: readonly number[]
    beatCounts: readonly number[]
    scale: number
  }>(),
  { columns: 4 },
)
const previewReferences = props.animations.map((_, index) => String(index + 1))
const previewGrid = ref<HTMLElement>()
const emit = defineEmits<{
  beatChange: [index: number, beatCount: number]
  sliderStart: []
  sliderEnd: []
  patternDrop: [drop: BuilderPatternDrop]
  patternDelete: [index: number]
  patternPreview: [animation: RootDataFinal]
}>()
const dragActive = ref(false)
const touchDevice = typeof navigator !== 'undefined' && isTouchDevice()
const revealedDeleteIndex = ref<number>()
useEventListener(typeof document === 'undefined' ? null : document, 'dragstart', () => {
  dragActive.value = true
})
useEventListener(typeof document === 'undefined' ? null : document, 'dragend', () => {
  dragActive.value = false
})
useEventListener(typeof document === 'undefined' ? null : document, 'drop', () => {
  dragActive.value = false
})
const dragOverIndex = ref<number>()
const allowPatternDrop = (event: DragEvent) => {
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
}
const leavePatternDrop = (index: number, event: DragEvent) => {
  const item = event.currentTarget
  if (item instanceof HTMLElement && item.contains(event.relatedTarget as Node | null)) return
  if (dragOverIndex.value === index) dragOverIndex.value = undefined
}
const dropPattern = (previewIndex: number, event: DragEvent) => {
  dragOverIndex.value = undefined
  const serialized = event.dataTransfer?.getData(builderPatternDragType)
  if (!serialized) return
  try {
    emit('patternDrop', {
      previewIndex,
      selection: JSON.parse(serialized) as ConceptPatternSelection,
    })
  } catch {
    // Ignore drag data from outside the Pattern Builder.
  }
}
const pointerDropIndex = (clientX: number, clientY: number) => {
  const target = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>(
    '[data-preview-index]',
  )
  if (!target || !previewGrid.value?.contains(target)) return undefined
  const index = Number(target.dataset.previewIndex)
  return Number.isInteger(index) ? index : undefined
}
const handlePointerMove = (event: Event) => {
  const detail = (event as CustomEvent<BuilderPatternPointerDetail>).detail
  dragActive.value = true
  dragOverIndex.value = pointerDropIndex(detail.clientX, detail.clientY)
}
const handlePointerDrop = (event: Event) => {
  const detail = (event as CustomEvent<BuilderPatternPointerDetail>).detail
  const previewIndex = pointerDropIndex(detail.clientX, detail.clientY)
  if (previewIndex !== undefined) emit('patternDrop', { previewIndex, selection: detail.selection })
  dragActive.value = false
  dragOverIndex.value = undefined
}
const endPointerDrag = () => {
  dragActive.value = false
  dragOverIndex.value = undefined
}
useEventListener(
  touchDevice && typeof document !== 'undefined' ? document : null,
  builderPatternPointerMoveEvent,
  handlePointerMove,
)
useEventListener(
  touchDevice && typeof document !== 'undefined' ? document : null,
  builderPatternPointerDropEvent,
  handlePointerDrop,
)
useEventListener(
  touchDevice && typeof document !== 'undefined' ? document : null,
  builderPatternPointerEndEvent,
  endPointerDrag,
)
const minimumBeatCount = (index: number) =>
  Math.max(0.5, (props.initialBeatCounts[index] ?? 0.5) - 2)
const maximumBeatCount = (index: number) => Math.min(8, (props.initialBeatCounts[index] ?? 8) + 2)
const updateBeatCount = (index: number, event: Event) => {
  if (event.target instanceof HTMLInputElement)
    emit('beatChange', index, event.target.valueAsNumber)
}
const previewPattern = (index: number) => {
  if (touchDevice)
    revealedDeleteIndex.value = revealedDeleteIndex.value === index ? undefined : index
  const animation = props.animations[index]
  if (animation) emit('patternPreview', animation)
}
const { width } = useElementSize(previewGrid)
const dimensions = reactive<ConceptPreviewDimensions[]>(
  previewReferences.map(() => ({ width: 0, height: 0 })),
)

const { previewUrls, requestPreviews } = useConceptPreviewRenderer({
  dimensions,
  references: previewReferences,
  createAnimation: (reference) => {
    const animation = props.animations[Number(reference) - 1]
    if (!animation) return undefined

    const display = toVtgBuilderDisplayAnimation(animation, props.scale)
    return {
      ...display,
      thick: vtgThickControl.max,
      props: display.props.map((prop) => ({ ...prop, thick: vtgThickControl.max })),
    }
  },
  label: 'VTG 45 Trans',
})

watch([width, () => props.columns], ([gridWidth]) => {
  const previewSize = gridWidth / props.columns
  dimensions.forEach((item) => {
    item.width = previewSize
    item.height = previewSize
  })
  requestPreviews()
})
watch([() => props.animations, () => props.refreshKey], requestPreviews)
watch(
  () => props.animations,
  () => (revealedDeleteIndex.value = undefined),
)
</script>

<style scoped>
.vtg-transition-previews {
  display: grid;
  grid-template-columns: repeat(var(--vtg-transition-preview-columns), minmax(0, 1fr));
  gap: var(--space-1);
  width: min(calc(100% - var(--space-2)), 45rem);
  margin: var(--space-2) auto 0;
}

.vtg-transition-previews__item {
  position: relative;
  min-width: 0;
  border-radius: var(--radius-sm);
}

.vtg-transition-previews__item--drag-over {
  box-shadow: 0 0 0 2px var(--color-action-primary);
}

.vtg-transition-previews__placeholder {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  padding: var(--space-3);
  border: 2px dashed var(--color-border);
  background: color-mix(in srgb, var(--color-surface) 32%, transparent);
  color: var(--color-text-muted);
  text-align: center;
  font-size: var(--font-size-concept-control);
  font-weight: 700;
}

.vtg-transition-previews__visual {
  position: relative;
  box-sizing: border-box;
  display: block;
  width: 100%;
  padding: 0;
  overflow: hidden;
  aspect-ratio: 1;
  color: inherit;
  cursor: pointer;
  background: color-mix(in srgb, var(--color-surface) 28%, transparent);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-sm);
}

.vtg-transition-previews__visual:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.vtg-transition-previews__delete {
  position: absolute;
  top: var(--space-1);
  right: var(--space-1);
  z-index: 1;
  display: grid;
  padding: var(--space-1);
  color: var(--color-text-muted);
  cursor: pointer;
  background: color-mix(in srgb, var(--color-surface) 82%, transparent);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  opacity: 0;
  pointer-events: none;
  place-items: center;
}

.vtg-transition-previews__item--delete-revealed .vtg-transition-previews__delete,
.vtg-transition-previews__delete:focus-visible {
  opacity: 1;
  pointer-events: auto;
}

@media (hover: hover) {
  .vtg-transition-previews__item:hover .vtg-transition-previews__delete {
    opacity: 1;
    pointer-events: auto;
  }
}

.vtg-transition-previews__delete:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.vtg-transition-previews--drag-active .vtg-transition-previews__delete {
  display: none;
}

.vtg-transition-previews__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vtg-transition-previews__beats {
  display: grid;
  margin-block-start: var(--space-1);
  padding-inline: var(--space-1);
  gap: var(--space-1);
  color: var(--color-text-muted);
  font-size: var(--font-size-concept-control);
  font-weight: 700;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.vtg-transition-previews__beats input {
  width: 100%;
  min-width: 0;
  accent-color: var(--color-action-primary);
  cursor: pointer;
}

.vtg-transition-previews__beats input:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.vtg-transition-previews__beats output {
  min-width: 2em;
  text-align: end;
}

.vtg-transition-previews__visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
</style>
