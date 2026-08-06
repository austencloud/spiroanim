<template>
  <div class="delsel-container">
    <AppTooltip>
      <template #activator="{ props: tooltipProps }">
        <a v-bind="tooltipProps" href="#" @click.prevent="clickDeleteSel">Delete Selection</a>
      </template>
      <template #html>
        <strong>Delete Selection</strong><br />
        Removes {{ frameName }} frames from the selected props at the current timeline position.<br />
        When a timeline range is selected, every {{ frameName }} frame within that range is removed.
      </template>
    </AppTooltip>
  </div>
</template>

<script setup lang="ts">
import AppTooltip from '@/components/AppTooltip.vue'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useManageProperties } from '@/features/editor/composables/useManageProperties'
import { useProperties } from '@/features/editor/composables/useProperties'

const store = inject('store', ref('main'))

const playerStore = usePlayerStore(store.value)
const { ROOT } = playerStore.raw()
const { PLAYING } = storeToRefs(playerStore)
const { pFRAMES } = useProperties(store.value)

const { propSelection } = useManageProperties(store.value)
const frameName = computed(() => (pFRAMES.value === 'animation' ? 'Animation' : 'Motion'))

const clickDeleteSel = () => {
  if (PLAYING.value) return

  let deleted = false
  propSelection((ind, start, end) => {
    const prop = ROOT.value.props[ind]!
    const frames = pFRAMES.value === 'animation' ? prop.anim : prop.motion

    if (start != -1 && end != -1) {
      frames.splice(start, end - start + 1)
      deleted = true
    }
  })
  if (deleted) triggerRef(ROOT)
}
</script>

<style scoped>
.delsel-container {
  padding: 5px;
}
</style>
