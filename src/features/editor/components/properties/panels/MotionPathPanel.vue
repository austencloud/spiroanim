<template>
  <PropertyPanel :panel="panel" :title="title" :data="data" :vals="vals" :setter="setter">
    <template #beats>
      <strong>Beats</strong><br />
      Specifies the duration leading from this {{ frameLabel }} frame to the next.<br />
      <br /><i>When undefined, this property inherits from the previous frame.</i>
    </template>

    <template #move>
      <strong>Move</strong><br />
      Converts Cartesian Horizontal, Vertical, and Depth values into the stored Arc, Plane, and
      Distance properties. Preserve Next recalculates the next authored movement so its Cartesian
      direction remains unchanged.
    </template>

    <template #precision>
      <strong>Precision</strong><br />
      Renders Move and Distance at one tenth of their authored values.<br />
      <br /><i>When undefined, Precision inherits and initially defaults to Disabled.</i>
    </template>

    <template #arc>
      <strong>Arc</strong><br />
      Turns the travel direction away from the preceding {{ title }} direction.<br />
      <br /><i>When undefined, Arc defaults to 0 degrees and does not inherit.</i>
    </template>

    <template #plane>
      <strong>Plane</strong><br />
      Rotates the plane used to apply Arc relative to the preceding {{ title }} direction.<br />
      <br /><i>When undefined, Plane defaults to 0 degrees and does not inherit.</i>
    </template>

    <template #distance>
      <strong>Distance</strong><br />
      Sets the Linear destination distance and the scale of curved {{ title }} paths.<br />
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
      <br /><i>When undefined, Axis defaults to 0 degrees and does not inherit.</i>
    </template>

    <template #amount>
      <strong>Amount</strong><br />
      Controls how much of the selected shape is traveled. At 50%, Arc and Circle are semicircles.
      At 100%, Arc is a 270-degree long arc and Circle is a full circle returning to its starting
      position.<br />
      <br /><i>When undefined, Amount inherits and initially defaults to 50%.</i>
    </template>
  </PropertyPanel>
</template>

<script setup lang="ts">
import PropertyPanel from '../PropertyPanel.vue'
import { useProperties } from '@/features/editor/composables/useProperties'
import { MOTION_SHAPES } from '@/domain/animation/AnimStruct'
import type { GetterFunc, SetterFunc } from '@/types/AnimTypes'

const props = withDefaults(
  defineProps<{
    title?: string
    path?: 'center' | 'orbit'
    showBeats?: boolean
  }>(),
  {
    title: 'Motion',
    path: undefined,
    showBeats: true,
  },
)

const store = inject('store', ref('main'))
const { motionGet, motionSet, cameraPathGet, cameraPathSet, MOTIONS, CAMERAS, panelWatcher } =
  useProperties(store.value)

const panel = computed(() => props.path ?? 'motion')
const frameLabel = computed(() => (props.path ? 'Camera' : 'Motion'))
const source = computed(() => (props.path ? CAMERAS.value : MOTIONS.value))
const getter: GetterFunc = (key) => (props.path ? cameraPathGet(props.path, key) : motionGet(key))
const setter: SetterFunc = (key, value) =>
  props.path ? cameraPathSet(props.path, key, value) : motionSet(key, value)

const data = ref({})
const fields = [
  { name: 'beats', text: 'Beats', component: 'Beats', undef: true },
  { name: 'precision', text: 'Precision', component: 'Boolean', undef: true },
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
const vals = computed(() =>
  props.showBeats ? fields : fields.filter(({ name }) => name !== 'beats'),
)

panelWatcher(source, data, vals.value, getter)
</script>
