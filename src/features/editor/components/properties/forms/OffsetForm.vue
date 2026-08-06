<template>
  <div class="move-mode" role="radiogroup" aria-label="Move coordinate mode">
    <label><input v-model="pMOVE" type="radio" value="xyz" /> X/Y/Z</label>
    <label><input v-model="pMOVE" type="radio" value="angles" /> Angles</label>
    <label v-if="pMOVE === 'xyz'" class="preserve-next">
      <input v-model="pMOVENEXT" type="checkbox" /> Preserve Next
    </label>
  </div>
  <Decimal :key="`${pMOVE}-0`" :data="offsGet(0)" :vals="data0" :setter="offsSet" />
  <Decimal :key="`${pMOVE}-1`" :data="offsGet(1)" :vals="data1" :setter="offsSet" />
  <Decimal :key="`${pMOVE}-2`" :data="offsGet(2)" :vals="data2" :setter="offsSet" />
</template>

<script setup lang="ts">
import Decimal from './DecimalForm.vue'
import { VALUE } from '@/features/editor/composables/useProperties'
import { usePropertiesStore } from '@/features/editor/stores/usePropertiesStore'
import { clampCartesianMove } from '@/math/animation/MoveFunc'
import type { DynamicVal, ValRetType, SetterFunc } from '@/types/AnimTypes'

const props = defineProps<{
  data: ValRetType
  vals: DynamicVal
  setter: SetterFunc
}>()

const store = inject('store', ref('main'))
const { CMPDS, pMOVE, pMOVENEXT } = storeToRefs(usePropertiesStore(store.value))

const val = computed<[number, number, number]>({
  get(): [number, number, number] {
    const ret = pMOVE.value === 'xyz' ? CMPDS.value[0]?.move : props.data?.[VALUE]
    if (!Array.isArray(ret)) return [0, 0, 0]
    return pMOVE.value === 'xyz' ? clampCartesianMove(ret) : [ret[0] ?? 0, ret[1] ?? 0, ret[2] ?? 0]
  },
  set(value: [number, number, number]) {
    const key =
      pMOVE.value === 'xyz' ? (pMOVENEXT.value ? 'movexyzpreserve' : 'movexyz') : name.value
    props.setter?.(key, value)
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
    let sli = [...val.value] as typeof val.value
    sli[key] = Math.round(val2)
    if (pMOVE.value === 'xyz') sli = clampCartesianMove(sli)
    val.value = sli // Set directly to .value to trigger setter
  }
}

const name = computed(() => props.vals.name)
const float = computed(() => props.vals.float)
const mult = computed(() => (props.vals.mult ? props.vals.mult : 1))

const data0 = computed<DynamicVal>(() => ({
  name: '0',
  neg: true,
  label: pMOVE.value === 'xyz' ? 'Horizontal' : 'Plane',
  max: pMOVE.value === 'xyz' ? 10 : 45,
  min: pMOVE.value === 'xyz' ? -10 : -45,
  float: float.value,
  mult: pMOVE.value === 'xyz' ? mult.value * -1 : mult.value,
}))

const data1 = computed<DynamicVal>(() => ({
  name: '1',
  neg: pMOVE.value === 'xyz',
  label: pMOVE.value === 'xyz' ? 'Vertical' : 'Arc',
  max: pMOVE.value === 'xyz' ? 10 : 45,
  min: pMOVE.value === 'xyz' ? -10 : -45,
  float: float.value,
  mult: mult.value,
}))

const data2 = computed<DynamicVal>(() => ({
  name: '2',
  neg: pMOVE.value === 'xyz',
  label: pMOVE.value === 'xyz' ? 'Depth' : 'Distance',
  max: 10,
  min: -10,
  float: float.value,
  mult: mult.value,
}))
</script>

<style scoped>
.move-mode {
  display: flex;
  gap: var(--space-3);
  padding-block: var(--space-1);
}

.move-mode label {
  cursor: pointer;
}

.preserve-next {
  margin-inline-start: auto;
}
</style>
