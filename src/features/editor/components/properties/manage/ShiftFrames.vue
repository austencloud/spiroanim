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
        Moves the first animation interval of every selected prop or selected timeline range to the
        end.<br />
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
  animationRangeEndpointsAlign,
  shiftAnimationFrameRange,
} from '@/features/editor/manage/shiftAnimationFrames'
import { useManageProperties } from '@/features/editor/composables/useManageProperties'
import { usePlayerStore } from '@/stores/usePlayerStore'

const store = inject('store', ref('main'))
const playerStore = usePlayerStore(store.value)
const { ROOT, COMPILED } = playerStore.raw()
const { PLAYING, SELECTION, SELECTED, UTIMES } = storeToRefs(playerStore)
const { pSELECTED } = useProperties(store.value)
const { propSelection } = useManageProperties(store.value)

const selectedPropIndices = computed(() =>
  Object.keys(pSELECTED.value)
    .map(Number)
    .filter((index) => pSELECTED.value[index] && ROOT.value.props[index] !== undefined),
)

interface ShiftTarget {
  propIndex: number
  startIndex: number
  endIndex: number
}

const shiftTargets = computed<ShiftTarget[]>(() => {
  if (!SELECTION.value) {
    return selectedPropIndices.value.map((propIndex) => ({
      propIndex,
      startIndex: 0,
      endIndex: ROOT.value.props[propIndex]!.anim.length - 1,
    }))
  }

  const targets: ShiftTarget[] = []
  propSelection((propIndex, startIndex, endIndex) => {
    targets.push({ propIndex, startIndex, endIndex })
  })
  return targets
})

const canShift = computed(
  () =>
    !PLAYING.value &&
    shiftTargets.value.length > 0 &&
    shiftTargets.value.every(({ propIndex, startIndex, endIndex }) => {
      const frames = COMPILED.value.props[propIndex]?.anim
      return frames !== undefined && animationRangeEndpointsAlign(frames, startIndex, endIndex)
    }),
)

const clickShift = async () => {
  if (!canShift.value) return

  const selectedTimes = SELECTION.value
    ? ([UTIMES.value[SELECTED.value[0]!], UTIMES.value[SELECTED.value[1]!]] as const)
    : undefined
  const shiftedProps = shiftTargets.value.map(({ propIndex, startIndex, endIndex }) => {
    const prop = ROOT.value.props[propIndex]!
    return shiftAnimationFrameRange(
      prop.anim,
      COMPILED.value.props[propIndex]!.anim,
      startIndex,
      endIndex,
      { preserveFinalOutgoing: SELECTION.value && endIndex < prop.anim.length - 1 },
    )
  })
  if (shiftedProps.some((frames) => frames === undefined)) return

  for (const [selectionIndex, target] of shiftTargets.value.entries()) {
    ROOT.value.props[target.propIndex]!.anim.splice(
      target.startIndex,
      target.endIndex - target.startIndex + 1,
      ...shiftedProps[selectionIndex]!,
    )
  }
  triggerRef(ROOT)

  if (selectedTimes?.[0] !== undefined && selectedTimes[1] !== undefined) {
    await nextTick()
    const startIndex = UTIMES.value.indexOf(selectedTimes[0])
    const endIndex = UTIMES.value.indexOf(selectedTimes[1])
    if (startIndex >= 0 && endIndex >= 0) SELECTED.value = [startIndex, endIndex]
  }
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
