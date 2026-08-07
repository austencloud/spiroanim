<template>
  <AppTooltip>
    <template #activator="{ props: tooltipProps }">
      <a
        v-bind="tooltipProps"
        href="#"
        :aria-disabled="disabled"
        @click.prevent="matchCurrentFrame"
      >
        Match Free Camera
      </a>
    </template>
    <template #html>
      <strong>Match Free Camera</strong><br />
      Updates the active Camera frame's Center and Orbit to match the current Free Camera pose.
      Integer angle and distance limits may produce a close approximation. A completed Circle cannot
      produce a nonzero endpoint.
    </template>
  </AppTooltip>
</template>

<script setup lang="ts">
import AppTooltip from '@/components/AppTooltip.vue'
import { useProperties } from '@/features/editor/composables/useProperties'
import { usePlayerStore } from '@/stores/usePlayerStore'

const store = inject('store', ref('main'))
const playerStore = usePlayerStore(store.value)
const { CURRENT } = playerStore.raw()
const { CTIMES, PLAYING, freeCameraPose } = storeToRefs(playerStore)
const { matchCameraFrameToPose } = useProperties(store.value)
const disabled = computed(() => PLAYING.value || freeCameraPose.value === undefined)

const matchCurrentFrame = () => {
  const pose = freeCameraPose.value
  if (disabled.value || !pose) return

  let index = 0
  for (let candidate = 0; candidate < CTIMES.value.length; candidate++) {
    if (CTIMES.value[candidate]! > CURRENT.value) break
    index = candidate
  }
  matchCameraFrameToPose(index, pose)
}
</script>

<style scoped>
a[aria-disabled='true'] {
  color: var(--color-text-muted);
  pointer-events: none;
}
</style>
