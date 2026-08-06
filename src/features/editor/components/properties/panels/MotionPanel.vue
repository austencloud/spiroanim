<template>
  <PropertyPanel panel="motion" title="Motion" :data="data" :vals="vals" :setter="motionSet">
    <template #beats>
      <strong>Beats</strong><br />
      Specifies the duration leading from this Motion frame to the next.<br />
      <br /><i>When undefined, this property inherits from the previous Motion frame.</i>
    </template>

    <template #move>
      <strong>Move</strong><br />
      Offsets the prop from its preceding Motion position.
    </template>
  </PropertyPanel>
</template>

<script setup lang="ts">
import PropertyPanel from '../PropertyPanel.vue'
import { useProperties } from '@/features/editor/composables/useProperties'

const store = inject('store', ref('main'))
const { motionGet, motionSet, MOTIONS, panelWatcher } = useProperties(store.value)

const data = ref({})
const vals = [
  { name: 'beats', text: 'Beats', component: 'Beats', undef: true },
  { name: 'move', text: 'Move', component: 'Offset', undef: true },
]

panelWatcher(MOTIONS, data, vals, motionGet)
</script>
