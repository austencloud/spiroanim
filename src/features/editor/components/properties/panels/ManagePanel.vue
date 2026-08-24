<template>
  <PropertyPanel panel="manage" title="Manage">
    <template v-if="pFRAMES === 'animation'">
      <InsertPoints v-if="PROPS.length" />
      <ShiftFrames v-if="PROPS.length" />
      <DeleteSelection v-if="ANIMS.length" />
      <AddProp />
      <DeleteProps v-if="PROPS.length" />
      <ResampleAnimationFrames v-if="PROPS.length" />
    </template>
    <template v-else-if="pFRAMES === 'motion'">
      <InsertFrame />
      <DeleteSelection v-if="MOTIONS.length" />
    </template>
    <template v-else>
      <InsertFrame />
      <DeleteSelection v-if="ROOT.camera.length > 1" />
    </template>
    <CompressAnimation v-if="PROPS.length || pFRAMES === 'camera'" />
    <MatchFreeCamera v-if="pFRAMES === 'camera' && freeCamera" />
    <p class="manage-note">Manage tools are limited and still in development.</p>
  </PropertyPanel>
</template>

<script setup lang="ts">
import PropertyPanel from '../PropertyPanel.vue'
import InsertPoints from '../manage/InsertPoints.vue'
import InsertFrame from '../manage/InsertFrame.vue'
import MatchFreeCamera from '../manage/MatchFreeCamera.vue'
import DeleteSelection from '../manage/DeleteSelection.vue'
import ShiftFrames from '../manage/ShiftFrames.vue'
import ResampleAnimationFrames from '../manage/ResampleAnimationFrames.vue'
import AddProp from '../manage/AddProp.vue'
import DeleteProps from '../manage/DeleteProps.vue'
import CompressAnimation from '../manage/CompressAnimation.vue'

import { useProperties } from '@/features/editor/composables/useProperties'
import { usePlayerStore } from '@/stores/usePlayerStore'

const store = inject('store', ref('main'))
const { ROOT } = usePlayerStore(store.value).raw()
const { freeCamera } = storeToRefs(usePlayerStore(store.value))
const { ANIMS, MOTIONS, PROPS, pFRAMES } = useProperties(store.value)
</script>

<style scoped>
.manage-note {
  margin: var(--space-2) 0 0;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  line-height: 1.4;
}
</style>
