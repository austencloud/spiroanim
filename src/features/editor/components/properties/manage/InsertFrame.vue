<template>
  <div class="insert-frame">
    <AppTooltip>
      <template #activator="{ props: tooltipProps }">
        <a v-bind="tooltipProps" href="#" @click.prevent="activate">Insert Frame</a>
      </template>
      <template #html>
        <strong>Insert Frame</strong><br />
        Inserts an empty Motion frame into the selected props before or after the current timeline
        position or selected range.
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
const { EINDEX, ETIMES, PLAYING } = storeToRefs(playerStore)
const { pINPUT } = useProperties(store.value)
const { propSelection } = useManageProperties(store.value)

const inputName = 'manage.insfrm'
const where = ref(1)

const activate = () => {
  pINPUT.value = pINPUT.value === inputName ? '' : inputName
}

const insert = () => {
  if (PLAYING.value) return

  let inserted = false
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
