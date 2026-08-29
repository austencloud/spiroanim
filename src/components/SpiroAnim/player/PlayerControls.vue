<template>
  <Progress :store="props.store">
    <template #play>
      <AppTooltip text="Play / Pause">
        <template #activator="{ props: tooltipProps }">
          <button
            v-bind="tooltipProps"
            class="icon-button icon-button--primary"
            type="button"
            :aria-label="PLAYING ? 'Pause' : 'Play'"
            @click="clickPlay"
          >
            <BaseIcon :path="playIcon" size="30" />
          </button>
        </template>
      </AppTooltip>
    </template>
    <template #mode>
      <AppTooltip text="Select Mode">
        <template #activator="{ props: tooltipProps }">
          <button
            v-bind="tooltipProps"
            class="icon-button icon-button--primary"
            type="button"
            :aria-pressed="SELECTION"
            aria-label="Select mode"
            @click="clickMode"
          >
            <BaseIcon :path="modeIcon" size="30" />
          </button>
        </template>
      </AppTooltip>
    </template>
  </Progress>

  <PlayerFreeCameraControl class="btnCenter" :store="props.store" />

  <AppTooltip v-if="canUndo && !props.editorVisible" class="btnUndo" text="Undo">
    <template #activator="{ props: tooltipProps }">
      <button
        v-bind="tooltipProps"
        class="icon-button"
        type="button"
        aria-label="Undo"
        @click="clickUndo"
      >
        <BaseIcon :path="mdiUndoVariant" size="30" />
      </button>
    </template>
  </AppTooltip>

  <label class="speed">
    <span>Speed</span>
    <AppTooltip class="speed-tooltip" text="Playback Speed">
      <template #activator="{ props: tooltipProps }">
        <select v-bind="tooltipProps" v-model.number="speed" aria-label="Playback speed">
          <option v-for="option in speedOptions" :key="option" :value="option">{{ option }}</option>
        </select>
      </template>
    </AppTooltip>
  </label>
</template>

<script setup lang="ts">
import BaseIcon from '@/components/icons/BaseIcon.vue'
import AppTooltip from '@/components/AppTooltip.vue'
import {
  mdiPauseCircleOutline,
  mdiPlayCircleOutline,
  mdiUndoVariant,
  mdiVectorSelection,
  mdiSelectionMultiple,
} from '@mdi/js'

import Progress from './PlayerProgress.vue'
import PlayerFreeCameraControl from './PlayerFreeCameraControl.vue'

import { usePlayerStore } from '@/stores/usePlayerStore'
import { useQSMainStore } from '@/stores/useQSMainStore'

const props = withDefaults(
  defineProps<{
    store: string
    editorVisible?: boolean
  }>(),
  {
    editorVisible: false,
  },
)

const playerStore = usePlayerStore(props.store)
const { ROOT, CURRENT } = playerStore.raw()
const { PLAYING, SELECTION, EINDEX, ETIMES, UPDATE, SELECTED } = storeToRefs(playerStore)

const qsStore = useQSMainStore()
const { qsHistory } = storeToRefs(qsStore)
const { undoQS } = qsStore
const canUndo = computed(() => qsHistory.value.length > 1)

const speedOptions = [4, 3, 2, 1, 0.5, 0.25, 0.1] as const
const speed = ref(ROOT.value.speed)

// Trigger shallow watchers
watch(speed, (val) => {
  ROOT.value.speed = val
  triggerRef(ROOT)
})

const clickPlay = () => {
  PLAYING.value = !PLAYING.value
}

const clickMode = () => {
  const index = EINDEX.value
  const max = ETIMES.value.length - 1
  UPDATE.value = Symbol()

  if ((SELECTION.value = !SELECTION.value)) {
    CURRENT.value = ETIMES.value[index] ?? 0
    SELECTED.value[0] = index
    SELECTED.value[1] = Math.min(index + 1, max) // index + 1 > max ? index : index + 1
  }
}

const clickUndo = () => {
  const previous = undoQS()
  if (previous !== undefined) ROOT.value = previous
}

const playIcon = computed(() => (PLAYING.value ? mdiPauseCircleOutline : mdiPlayCircleOutline))
const modeIcon = computed(() => (SELECTION.value ? mdiVectorSelection : mdiSelectionMultiple))
</script>

<style scoped>
.btnCenter {
  position: absolute;
  right: 2px;
  bottom: calc(var(--space-workspace-bottom-offset) + 35px);
}

.btnUndo {
  position: absolute;
  top: 2px;
  right: 2px;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  color: var(--color-text-muted);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
}

.icon-button--primary,
.icon-button:hover {
  color: var(--color-action-primary);
}

.icon-button:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.speed {
  position: absolute;
  bottom: calc(var(--space-workspace-bottom-offset) + 34px);
  left: 10px;
  display: grid;
  width: 48px;
  color: var(--color-text);
  font-size: 0.75rem;
  text-align: left;
}

.speed select {
  width: 100%;
  color: var(--color-text);
  text-align: left;
  background: var(--color-surface);
  border: 0;
  border-block-end: 1px solid var(--color-border);
}

.speed-tooltip {
  width: 100%;
}

.speed select:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}
</style>
