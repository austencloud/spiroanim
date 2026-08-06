<template>
  <label class="preserve-next"> <input v-model="pMOVENEXT" type="checkbox" /> Preserve Next </label>
  <Decimal :data="offsGet(0)" :vals="data0" :setter="offsSet" />
  <Decimal :data="offsGet(1)" :vals="data1" :setter="offsSet" />
  <Decimal :data="offsGet(2)" :vals="data2" :setter="offsSet" />
</template>

<script setup lang="ts">
import Decimal from './DecimalForm.vue'
import { VALUE } from '@/features/editor/composables/useProperties'
import { usePropertiesStore } from '@/features/editor/stores/usePropertiesStore'
import { clampCartesianMotion } from '@/math/animation/MotionFunc'
import type { DynamicVal, ValRetType, SetterFunc } from '@/types/AnimTypes'

const props = defineProps<{
  data: ValRetType
  vals: DynamicVal
  setter: SetterFunc
}>()

const store = inject('store', ref('main'))
const { pMOVENEXT } = storeToRefs(usePropertiesStore(store.value))

const val = computed<[number, number, number]>({
  get(): [number, number, number] {
    const ret = props.data?.[VALUE]
    if (!Array.isArray(ret)) return [0, 0, 0]
    return clampCartesianMotion(ret)
  },
  set(value: [number, number, number]) {
    props.setter?.(pMOVENEXT.value ? 'movexyzpreserve' : 'movexyz', value)
  },
})

const offsGet = (key: 0 | 1 | 2): ValRetType => {
  let val2 = val.value[key]
  let str = 'Undefined'
  if (val2 === undefined) val2 = 0
  else str = String(val2)
  return [val2, true, str, false]
}

const offsSet: SetterFunc = (k, val2) => {
  const key = parseInt(k)
  if (typeof val2 === 'number') {
    const sli = [...val.value] as typeof val.value
    sli[key] = Math.round(val2)
    val.value = clampCartesianMotion(sli) // Set directly to .value to trigger setter
  }
}

const data0: DynamicVal = {
  name: '0',
  neg: true,
  label: 'Horizontal',
  max: 10,
  min: -10,
  step: 1,
  mult: -1,
}

const data1: DynamicVal = {
  name: '1',
  neg: true,
  label: 'Vertical',
  max: 10,
  min: -10,
  step: 1,
}

const data2: DynamicVal = {
  name: '2',
  neg: true,
  label: 'Depth',
  max: 10,
  min: -10,
  step: 1,
}
</script>

<style scoped>
.preserve-next {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  padding-block: var(--space-1);
  cursor: pointer;
}
</style>
