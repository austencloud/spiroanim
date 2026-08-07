<template>
  <div class="insert-frame">
    <AppTooltip>
      <template #activator="{ props: tooltipProps }">
        <a v-bind="tooltipProps" href="#" @click.prevent="activate">Insert Frame</a>
      </template>
      <template #html>
        <strong>Insert Frame</strong><br />
        Inserts an empty {{ frameName }} frame before or after the current timeline position or
        selected range.
      </template>
    </AppTooltip>
    <div v-show="pINPUT === inputName">
      <button class="action-button" type="button" @click="insert">ADD</button>
      <div class="where-options">
        <label><input v-model.number="where" type="radio" :value="1" /> Before</label>
        <label><input v-model.number="where" type="radio" :value="2" /> After</label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppTooltip from '@/components/AppTooltip.vue'
import { useManageProperties } from '@/features/editor/composables/useManageProperties'
import { useProperties } from '@/features/editor/composables/useProperties'
import { usePlayerStore } from '@/stores/usePlayerStore'

const store = inject('store', ref('main'))
const playerStore = usePlayerStore(store.value)
const { ROOT, CURRENT } = playerStore.raw()
const { EINDEX, ETIMES, CTIMES, PLAYING } = storeToRefs(playerStore)
const { pINPUT, pFRAMES } = useProperties(store.value)
const { propSelection, cameraSelection } = useManageProperties(store.value)
const frameName = computed(() => (pFRAMES.value === 'camera' ? 'Camera' : 'Motion'))

const inputName = 'manage.insfrm'
const where = ref(1)

const activate = () => {
  pINPUT.value = pINPUT.value === inputName ? '' : inputName
}

const insert = () => {
  if (PLAYING.value) return

  let inserted = false
  if (pFRAMES.value === 'camera') {
    cameraSelection((start, end) => {
      const frames = ROOT.value.camera
      const nextIndex = CTIMES.value.findIndex((time) => time > CURRENT.value)
      const emptyRangeIndex = nextIndex === -1 ? frames.length : nextIndex
      const insertionIndex = start === -1 ? emptyRangeIndex : where.value === 1 ? start : end + 1
      frames.splice(insertionIndex, 0, {
        orbit: {},
        center: {},
      })
      inserted = true
    })
    if (inserted) triggerRef(ROOT)
    return
  }

  propSelection((propIndex, start, end) => {
    const motion = ROOT.value.props[propIndex]!.motion

    if (start === -1) motion.splice(0, motion.length, {})
    else motion.splice(where.value === 1 ? start : end + 1, 0, {})
    inserted = true
  })
  if (inserted) triggerRef(ROOT)
}

watch(
  CURRENT,
  () => {
    if (EINDEX.value === ETIMES.value.length - 1) where.value = 2
    else where.value = CURRENT.value === ETIMES.value[EINDEX.value] ? 1 : 2
  },
  { immediate: true },
)
</script>

<style scoped>
.insert-frame {
  display: inline-block;
  padding: 5px;
}

.action-button {
  margin-inline-end: var(--space-1);
  padding: var(--space-2) var(--space-3);
  color: var(--color-on-action-primary);
  cursor: pointer;
  background: var(--color-action-primary);
  border: 0;
  border-radius: var(--radius-sm);
}

.where-options {
  display: flex;
  gap: var(--space-3);
  padding-block: var(--space-2);
}
</style>
