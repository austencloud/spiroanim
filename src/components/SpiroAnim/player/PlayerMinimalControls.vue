<template>
  <PlayerProgress :store="store" compact :end-clearance="endClearance">
    <template #play>
      <AppTooltip text="Play / Pause">
        <template #activator="{ props: tooltipProps }">
          <button
            v-bind="tooltipProps"
            class="minimal-player-controls__play"
            type="button"
            :aria-label="rendererPlaying ? 'Pause' : 'Play'"
            @click="rendererPlaying = !rendererPlaying"
          >
            <BaseIcon :path="playIcon" :size="30" />
          </button>
        </template>
      </AppTooltip>
    </template>
    <template #end>
      <PlayerFreeCameraControl :store="store" compact />
    </template>
  </PlayerProgress>
</template>

<script setup lang="ts">
import { mdiPauseCircleOutline, mdiPlayCircleOutline } from '@mdi/js'

import AppTooltip from '@/components/AppTooltip.vue'
import BaseIcon from '@/components/icons/BaseIcon.vue'
import PlayerFreeCameraControl from '@/components/SpiroAnim/player/PlayerFreeCameraControl.vue'
import PlayerProgress from '@/components/SpiroAnim/player/PlayerProgress.vue'
import { usePlayerStore } from '@/stores/usePlayerStore'

const props = withDefaults(
  defineProps<{
    store: string
    endClearance?: string
  }>(),
  {
    endClearance: '0px',
  },
)
const { PLAYING, PREVIEW_PLAYING, PLAYBACK_TEMPORARY_ACTIVE } = storeToRefs(
  usePlayerStore(props.store),
)
const rendererPlaying = computed({
  get: () => (PLAYBACK_TEMPORARY_ACTIVE.value ? PREVIEW_PLAYING.value : PLAYING.value),
  set: (playing: boolean) => {
    if (PLAYBACK_TEMPORARY_ACTIVE.value) PREVIEW_PLAYING.value = playing
    else PLAYING.value = playing
  },
})
const playIcon = computed(() =>
  rendererPlaying.value ? mdiPauseCircleOutline : mdiPlayCircleOutline,
)
</script>

<style scoped>
.minimal-player-controls__play {
  display: inline-flex;
  padding: 2px;
  color: var(--color-action-primary);
  cursor: pointer;
  background: color-mix(in srgb, var(--color-surface) 75%, transparent);
  border: 1px solid var(--color-border);
  border-radius: 50%;
  align-items: center;
  justify-content: center;
}

.minimal-player-controls__play:hover {
  color: var(--color-text);
}

.minimal-player-controls__play:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}
</style>
