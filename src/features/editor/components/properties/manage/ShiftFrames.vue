<template>
  <div class="shift-container">
    <AppTooltip>
      <template #activator="{ props: tooltipProps }">
        <a
          v-bind="tooltipProps"
          href="#"
          :aria-disabled="!canShift"
          :class="{ 'shift-link--warning': canShift && endpointsMismatch }"
          @click.prevent="clickShift"
        >
          Shift
        </a>
      </template>
      <template #html>
        <strong>Shift</strong><br />
        Moves the first animation interval of every selected prop or selected timeline range to the
        end.<br />
        Existing position and rotation paths stay in place when the first and last frames match. A
        warning appears before shifting unmatched endpoints. The final frame keeps its outgoing
        properties.
      </template>
    </AppTooltip>
    <BaseDialog
      v-model="warningOpen"
      class="shift-warning"
      title="Shift unmatched endpoints?"
      close-label="Close shift warning"
    >
      <p>
        The first and last frames do not have matching positions and rotations. Shifting this
        pattern may change its path in unexpected ways.
      </p>
      <label class="shift-warning__choice">
        <input v-model="skipWarningChoice" type="checkbox" />
        <span>Do not show again</span>
      </label>
      <div class="shift-warning__actions">
        <button type="button" class="shift-warning__cancel" @click="cancelWarning">Cancel</button>
        <button type="button" class="shift-warning__proceed" @click="confirmShift">
          Shift anyway
        </button>
      </div>
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import AppTooltip from '@/components/AppTooltip.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { useProperties } from '@/features/editor/composables/useProperties'
import {
  animationRangeEndpointsAlign,
  shiftAnimationFrameRange,
} from '@/math/animation/shiftAnimationFrames'
import { useManageProperties } from '@/features/editor/composables/useManageProperties'
import { usePlayerStore } from '@/stores/usePlayerStore'

const store = inject('store', ref('main'))
const playerStore = usePlayerStore(store.value)
const { ROOT, COMPILED } = playerStore.raw()
const { PLAYING, SELECTION, SELECTED, ETIMES } = storeToRefs(playerStore)
const { pSELECTED } = useProperties(store.value)
const { propSelection } = useManageProperties(store.value)
const warningOpen = ref(false)
const skipWarningChoice = ref(false)
const suppressMismatchWarning = ref(false)

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

const targetIsShiftable = ({ propIndex, startIndex, endIndex }: ShiftTarget) => {
  const frames = COMPILED.value.props[propIndex]?.anim
  return (
    frames !== undefined &&
    startIndex >= 0 &&
    endIndex < frames.length &&
    endIndex - startIndex >= 2
  )
}

const canShift = computed(
  () =>
    !PLAYING.value && shiftTargets.value.length > 0 && shiftTargets.value.every(targetIsShiftable),
)

const endpointsMismatch = computed(() =>
  shiftTargets.value.some(({ propIndex, startIndex, endIndex }) => {
    const frames = COMPILED.value.props[propIndex]?.anim
    return frames !== undefined && !animationRangeEndpointsAlign(frames, startIndex, endIndex)
  }),
)

const performShift = async () => {
  const selectedTimes = SELECTION.value
    ? ([ETIMES.value[SELECTED.value[0]!], ETIMES.value[SELECTED.value[1]!]] as const)
    : undefined
  const shiftedProps = shiftTargets.value.map(({ propIndex, startIndex, endIndex }) => {
    const prop = ROOT.value.props[propIndex]!
    return shiftAnimationFrameRange(
      prop.anim,
      COMPILED.value.props[propIndex]!.anim,
      startIndex,
      endIndex,
      { allowEndpointMismatch: true, preserveFinalOutgoing: true },
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
    const startIndex = ETIMES.value.indexOf(selectedTimes[0])
    const endIndex = ETIMES.value.indexOf(selectedTimes[1])
    if (startIndex >= 0 && endIndex >= 0) SELECTED.value = [startIndex, endIndex]
  }
}

const clickShift = async () => {
  if (!canShift.value) return

  if (endpointsMismatch.value && !suppressMismatchWarning.value) {
    skipWarningChoice.value = false
    warningOpen.value = true
    return
  }

  await performShift()
}

const cancelWarning = () => {
  warningOpen.value = false
  skipWarningChoice.value = false
}

const confirmShift = async () => {
  suppressMismatchWarning.value = skipWarningChoice.value
  warningOpen.value = false
  await performShift()
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

.shift-link--warning {
  color: var(--color-text-muted);
  opacity: 0.65;
}

:deep(.shift-warning .base-dialog__body) {
  display: grid;
  gap: var(--space-6);
}

.shift-warning p {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.55;
}

.shift-warning__choice {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  font-weight: 700;
}

.shift-warning__choice input {
  width: 1.15rem;
  height: 1.15rem;
  accent-color: var(--color-action-primary);
}

.shift-warning__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: flex-end;
}

.shift-warning__actions button {
  min-height: 2.75rem;
  padding-inline: var(--space-4);
  color: var(--color-text);
  font: inherit;
  font-weight: 750;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.shift-warning__actions .shift-warning__proceed {
  color: var(--color-on-action-primary);
  background: var(--color-action-primary);
  border-color: var(--color-action-primary);
}

.shift-warning__actions button:focus-visible,
.shift-warning__choice input:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}
</style>
