<template>
  <div class="compress-container">
    <AppTooltip>
      <template #activator="{ props: tooltipProps }">
        <a v-bind="tooltipProps" href="#" @click.prevent="clickCompress">Compress</a>
      </template>
      <template #html>
        <strong>Compress</strong><br />
        Removes redundant inherited and default values from every prop and frame.<br />
        Also removes values that do not apply, such as Axis and Amount on Linear Motion.
      </template>
    </AppTooltip>
  </div>
</template>

<script setup lang="ts">
import AppTooltip from '@/components/AppTooltip.vue'
import { compressAnimation } from '@/features/editor/manage/compressAnimation'
import { usePlayerStore } from '@/stores/usePlayerStore'

const store = inject('store', ref('main'))
const playerStore = usePlayerStore(store.value)
const { ROOT } = playerStore.raw()

const clickCompress = () => {
  if (compressAnimation(ROOT.value) > 0) triggerRef(ROOT)
}
</script>

<style scoped>
.compress-container {
  padding: 5px;
}
</style>
