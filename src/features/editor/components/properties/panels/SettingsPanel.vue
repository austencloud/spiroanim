<template>
  <PropertyPanel panel="settings" title="Settings" :data="data" :vals="vals" :setter="rootSet">
    <template #bpm>
      <strong>BPM</strong><br />
      Stands for <em>Beats Per Minute</em> — controls the global timing and tempo of your
      animation.<br />
      Increasing BPM makes the animation progress faster, while decreasing BPM slows it down.<br />
      <br /><i>This value serves as the root timing reference for all frames and props.</i>
    </template>

    <template #aspectx>
      <strong>AspectX</strong><br />
      Sets the horizontal part of the player’s target aspect ratio.<br />
      It combines with <strong>AspectY</strong>; for example, 16 and 9 produce a 16:9 player.<br />
      Set either aspect value to <em>0</em> to let the player use all available width and height.<br />
      <br /><i>This is a global display setting for the animation.</i>
    </template>

    <template #aspecty>
      <strong>AspectY</strong><br />
      Sets the vertical part of the player’s target aspect ratio.<br />
      It combines with <strong>AspectX</strong>; for example, 16 and 9 produce a 16:9 player.<br />
      Set either aspect value to <em>0</em> to let the player use all available width and height.<br />
      <br /><i>This is a global display setting for the animation.</i>
    </template>

    <template #distance>
      <strong>Distance</strong><br />
      Sets the camera’s centered viewing distance from the animation.<br />
      Lower values move the camera closer; higher values move it farther away.<br />
      Changing this value recenters the camera using the new distance.<br />
      <br /><i>This is a global viewing setting for the animation.</i>
    </template>

    <template #thick>
      <strong>Thick</strong><br />
      Controls the rendered thickness of prop motion paths and hand paths.<br />
      Increase it for stronger, more visible paths or decrease it for finer lines.<br />
      <br /><i>This is the global default applied to all props.</i>
    </template>
  </PropertyPanel>
</template>

<script setup lang="ts">
import PropertyPanel from '../PropertyPanel.vue'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useProperties } from '@/features/editor/composables/useProperties'

const store = inject('store', ref('main'))

const playerStore = usePlayerStore(store.value)
const { ROOT } = playerStore.raw()

const { rootGet, rootSet, panelWatcher } = useProperties(store.value)

const data = ref({})
const vals = [
  { name: 'bpm', text: 'BPM', component: 'BPM', mult: 20 },
  { name: 'aspectx', text: 'AspectX', component: 'Decimal' },
  { name: 'aspecty', text: 'AspectY', component: 'Decimal' },
  { name: 'distance', text: 'Distance', component: 'Decimal' },
  { name: 'thick', text: 'Thick', component: 'Decimal' },
]

panelWatcher(ROOT, data, vals, rootGet)
</script>
