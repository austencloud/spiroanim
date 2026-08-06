<template>
  <PropertyPanel panel="motion" title="Motion" :data="data" :vals="vals" :setter="motionSet">
    <template #beats>
      <strong>Beats</strong><br />
      Specifies the duration leading from this Motion frame to the next.<br />
      <br /><i>When undefined, this property inherits from the previous Motion frame.</i>
    </template>

    <template #move>
      <strong>Move</strong><br />
      Converts Cartesian Horizontal, Vertical, and Depth values into the stored Arc, Plane, and
      Distance properties. Preserve Next recalculates the next authored movement so its Cartesian
      direction remains unchanged.
    </template>

    <template #arc>
      <strong>Arc</strong><br />
      Turns the travel direction away from the preceding Motion direction.<br />
      <br /><i>When undefined, Arc defaults to 0° and does not inherit.</i>
    </template>

    <template #plane>
      <strong>Plane</strong><br />
      Rotates the plane used to apply Arc relative to the preceding Motion direction.<br />
      <br /><i>When undefined, Plane defaults to 0° and does not inherit.</i>
    </template>

    <template #distance>
      <strong>Distance</strong><br />
      Sets the Linear destination distance and the scale of curved Motion paths.<br />
      <br /><i>When undefined, Distance defaults to 0 and does not inherit.</i>
    </template>

    <template #shape>
      <strong>Shape</strong><br />
      Selects a Linear, Arc, or Circle path. Linear ignores Axis and Amount.<br />
      <br /><i>When undefined, Shape inherits and initially defaults to Linear.</i>
    </template>

    <template #axis>
      <strong>Axis</strong><br />
      Rotates the direction in which an Arc or Circle bends around the travel direction.<br />
      <br /><i>When undefined, Axis defaults to 0° and does not inherit.</i>
    </template>

    <template #amount>
      <strong>Amount</strong><br />
      Controls how much of the selected shape is traveled. At 50%, Arc and Circle are semicircles.
      At 100%, Arc is a 270° long arc and Circle is a full circle returning to its starting
      position.<br />
      <br /><i>When undefined, Amount inherits and initially defaults to 50%.</i>
    </template>
  </PropertyPanel>
</template>

<script setup lang="ts">
import PropertyPanel from '../PropertyPanel.vue'
import { useProperties } from '@/features/editor/composables/useProperties'
import { MOTION_SHAPES } from '@/domain/animation/AnimStruct'

const store = inject('store', ref('main'))
const { motionGet, motionSet, MOTIONS, panelWatcher } = useProperties(store.value)

const data = ref({})
const vals = [
  { name: 'beats', text: 'Beats', component: 'Beats', undef: true },
  { name: 'move', text: 'Move', component: 'Offset', undef: true },
  {
    name: 'arc',
    text: 'Arc',
    component: 'Decimal',
    undef: true,
    min: -180,
    max: 180,
    step: 45,
    neg: true,
  },
  {
    name: 'plane',
    text: 'Plane',
    component: 'Decimal',
    undef: true,
    min: -180,
    max: 180,
    step: 45,
    neg: true,
  },
  {
    name: 'distance',
    text: 'Distance',
    component: 'Decimal',
    undef: true,
    min: -10,
    max: 10,
    step: 1,
  },
  {
    name: 'shape',
    text: 'Shape',
    component: 'SelectInt',
    undef: true,
    items: MOTION_SHAPES,
    label: 'Path Shape',
  },
  {
    name: 'axis',
    text: 'Axis',
    component: 'Decimal',
    undef: true,
    min: -180,
    max: 180,
    step: 45,
    neg: true,
  },
  {
    name: 'amount',
    text: 'Amount',
    component: 'Decimal',
    undef: true,
    min: -100,
    max: 100,
    step: 10,
  },
]

panelWatcher(MOTIONS, data, vals, motionGet)
</script>
