<template>
  <div class="shift-container">
    <AppTooltip>
      <template #activator="{ props: tooltipProps }">
        <a v-bind="tooltipProps" href="#" :aria-disabled="!canShift" @click.prevent="clickShift">
          Shift
        </a>
      </template>
      <template #html>
        <strong>Shift</strong><br />
        Moves the first animation interval of every selected prop to the end.<br />
        Existing position and rotation paths stay in place. Each prop must have matching compiled
        position and rotation at its first and last frames.
      </template>
    </AppTooltip>
  </div>
</template>

<script setup lang="ts">
import AppTooltip from '@/components/AppTooltip.vue'
import { useProperties } from '@/features/editor/composables/useProperties'
import {
  animationEndpointsAlign,
  shiftAnimationFrames,
} from '@/features/editor/manage/shiftAnimationFrames'
import { usePlayerStore } from '@/stores/usePlayerStore'

const store = inject('store', ref('main'))
const playerStore = usePlayerStore(store.value)
const { ROOT, COMPILED } = playerStore.raw()
const { PLAYING } = storeToRefs(playerStore)
const { pSELECTED } = useProperties(store.value)

const selectedPropIndices = computed(() =>
  Object.keys(pSELECTED.value)
    .map(Number)
    .filter((index) => pSELECTED.value[index] && ROOT.value.props[index] !== undefined),
)

const canShift = computed(
  () =>
    !PLAYING.value &&
    selectedPropIndices.value.length > 0 &&
    selectedPropIndices.value.every((index) => {
      const frames = COMPILED.value.props[index]?.anim
      return frames !== undefined && frames.length >= 3 && animationEndpointsAlign(frames)
    }),
)

const clickShift = () => {
  if (!canShift.value) return

  const shiftedProps = selectedPropIndices.value.map((index) => {
    const prop = ROOT.value.props[index]!
    return shiftAnimationFrames(prop.anim, COMPILED.value.props[index]!.anim)
  })
  if (shiftedProps.some((frames) => frames === undefined)) return

  for (const [selectionIndex, propIndex] of selectedPropIndices.value.entries()) {
    ROOT.value.props[propIndex]!.anim = shiftedProps[selectionIndex]!
  }
  triggerRef(ROOT)
}
</script>

<style scoped>
.shift-container {
  padding: 5px;
}

[aria-disabled='true'] {
  color: var(--color-text-muted);
  cursor: default;
  opacity: 0.65;
}
</style>
