<template>
  <div
    ref="previewGrid"
    class="vtg-transition-previews"
    data-role="vtg-transition-previews"
    :style="{ '--vtg-transition-preview-columns': String(Math.min(4, animations.length)) }"
  >
    <div
      v-for="(url, index) in previewUrls"
      :key="index"
      class="vtg-transition-previews__item"
      :data-preview-index="index"
    >
      <div class="vtg-transition-previews__visual">
        <img
          v-if="url"
          class="vtg-transition-previews__image"
          :src="url"
          :alt="`45 Trans pattern ${index + 1}`"
        />
      </div>
      <span class="vtg-transition-previews__beats" data-role="vtg-transition-preview-beats">
        {{ formatBeatCount(beatCounts[index] ?? 0) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toConceptPreviewAnimation } from '@/features/concepts/data/toConceptPreviewAnimation'
import { useConceptPreviewRenderer } from '@/features/concepts/composables/useConceptPreviewRenderer'
import type { ConceptPreviewDimensions } from '@/features/concepts/composables/useConceptPreviewRenderer'
import { getVtgTransitionPreviewBeatCount } from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import type { RootDataFinal } from '@/types/AnimTypes'

const props = defineProps<{
  animations: readonly RootDataFinal[]
  refreshKey: string
}>()
const previewReferences = props.animations.map((_, index) => String(index + 1))
const previewGrid = ref<HTMLElement>()
const beatCounts = computed(() => props.animations.map(getVtgTransitionPreviewBeatCount))
const formatBeatCount = (count: number) => `${count} ${count === 1 ? 'beat' : 'beats'}`
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

    const preview = toConceptPreviewAnimation(animation)
    return {
      ...preview,
      visible: animation.visible,
      props: preview.props.map((prop, index) => ({
        ...prop,
        visible: animation.props[index]?.visible ?? animation.visible,
      })),
    }
  },
  label: 'VTG 45 Trans',
})

watch(width, (gridWidth) => {
  const previewSize = gridWidth / Math.min(4, previewReferences.length)
  dimensions.forEach((item) => {
    item.width = previewSize
    item.height = previewSize
  })
  requestPreviews()
})
watch([() => props.animations, () => props.refreshKey], requestPreviews)
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
  min-width: 0;
}

.vtg-transition-previews__visual {
  overflow: hidden;
  aspect-ratio: 1;
  background: var(--color-surface);
  border-radius: var(--radius-sm);
}

.vtg-transition-previews__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vtg-transition-previews__beats {
  display: block;
  margin-block-start: var(--space-1);
  color: var(--color-text-muted);
  font-size: var(--font-size-concept-control);
  font-weight: 700;
  text-align: center;
}
</style>
