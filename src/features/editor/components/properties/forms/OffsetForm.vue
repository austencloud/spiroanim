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
  <template v-if="pMOVE === 'angles'">
    <Decimal :key="`${pMOVE}-3`" :data="offsGet(3)" :vals="data3" :setter="offsSet" />
    <Decimal :key="`${pMOVE}-4`" :data="offsGet(4)" :vals="data4" :setter="offsSet" />
  </template>
</template>

<script setup lang="ts">
import Decimal from './DecimalForm.vue'
import { VALUE } from '@/features/editor/composables/useProperties'
import { usePropertiesStore } from '@/features/editor/stores/usePropertiesStore'
import { clampCartesianMove } from '@/math/animation/MoveFunc'
import type { DynamicVal, ValRetType, SetterFunc, AnimData } from '@/types/AnimTypes'

const props = defineProps<{
  data: ValRetType
  vals: DynamicVal
  setter: SetterFunc
}>()

const store = inject('store', ref('main'))
const { ANIMS, CMPDS, pMOVE, pMOVENEXT } = storeToRefs(usePropertiesStore(store.value))

type MoveValue = NonNullable<AnimData['move']>

const val = computed<MoveValue>({
  get(): MoveValue {
    const ret = pMOVE.value === 'xyz' ? CMPDS.value[0]?.move : props.data?.[VALUE]
    if (!Array.isArray(ret)) return [0, 0, 0, 0, 0]
    if (pMOVE.value === 'xyz') {
      const cartesian = clampCartesianMove(ret)
      const rawMove = ANIMS.value[0]?.move
      return [...cartesian, rawMove?.[3] ?? 0, rawMove?.[4] ?? 0]
    }
    return [ret[0] ?? 0, ret[1] ?? 0, ret[2] ?? 0, ret[3] ?? 0, ret[4] ?? 0]
  },
  set(value: MoveValue) {
    const key =
      pMOVE.value === 'xyz' ? (pMOVENEXT.value ? 'movexyzpreserve' : 'movexyz') : name.value
    props.setter?.(key, value)
  },
})

const offsGet = (key: 0 | 1 | 2 | 3 | 4): ValRetType => {
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
    if (pMOVE.value === 'xyz') {
      const cartesian = clampCartesianMove(sli)
      sli = [...cartesian, sli[3] ?? 0, sli[4] ?? 0]
    }
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
  max: pMOVE.value === 'xyz' ? 10 : 180,
  min: pMOVE.value === 'xyz' ? -10 : -180,
  step: pMOVE.value === 'xyz' ? 1 : 45,
  float: float.value,
  mult: pMOVE.value === 'xyz' ? mult.value * -1 : mult.value,
}))

const data1 = computed<DynamicVal>(() => ({
  name: '1',
  neg: pMOVE.value === 'xyz',
  label: pMOVE.value === 'xyz' ? 'Vertical' : 'Arc',
  max: pMOVE.value === 'xyz' ? 10 : 180,
  min: pMOVE.value === 'xyz' ? -10 : -180,
  step: pMOVE.value === 'xyz' ? 1 : 45,
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

const data3 = computed<DynamicVal>(() => ({
  name: '3',
  neg: true,
  label: 'Curve Axis',
  max: 180,
  min: -180,
  step: 45,
  mult: mult.value,
}))

const data4 = computed<DynamicVal>(() => ({
  name: '4',
  neg: false,
  label: 'Bend',
  max: 100,
  // Decimal sliders apply a relative adjustment, so a negative slider range is needed to reduce
  // the value. The stored Bend is still clamped to zero by the property setter.
  min: -100,
  step: 10,
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
