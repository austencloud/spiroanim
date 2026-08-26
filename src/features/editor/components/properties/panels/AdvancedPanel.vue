<template>
  <PropertyPanel panel="advanced" title="Advanced" :data="data" :vals="vals" :setter="animSet">
    <template #point>
      <strong>Point</strong><br />
      Indicates the nearest of 26 reference nodes that the start of this frame aligns with.<br />
      Selecting a node here will directly update <strong>Arc</strong> and
      <strong>Plane</strong> values.<br /><br />
      <u>Node abbreviations:</u><br />
      First letter: <strong>F</strong>ront, <strong>M</strong>iddle, <strong>B</strong>ack.<br />
      Second letter (for 3-letter codes): <strong>T</strong>op, <strong>B</strong>ottom.<br />
      Final letter: <strong>L</strong>eft, <strong>C</strong>enter, <strong>R</strong>ight.
    </template>

    <template #path>
      <strong>Path</strong><br />
      Indicates the nearest of 26 reference nodes aligned with the
      <strong>Plane</strong> orientation.<br />
      Selecting a node here directly modifies the <strong>Plane</strong> setting.<br /><br />
      <u>See “Point” above for node abbreviations.</u>
    </template>

    <template #direct>
      <strong>Direct</strong><br />
      Indicates the nearest of 26 reference nodes in the direction of the current rotation.<br />
      Selecting a node here will adjust <strong>Turns</strong> and
      <strong>Axis</strong> values.<br />
      <strong>Warning:</strong> This feature is experimental and may not behave exactly as
      expected.<br /><br />
      <u>See “Point” above for node abbreviations.</u>
    </template>

    <template #yaw>
      <strong>Yaw</strong><br />
      Selects the axis used by <strong>Rotate</strong>. It initially defaults to 90° and has no
      effect by itself.<br />
      <br /><i>When undefined, Yaw inherits from the previous frame.</i>
    </template>

    <template #rotate>
      <strong>Rotate</strong><br />
      Rotates the prop around the frame's <strong>Yaw</strong> axis without replacing Turns or Axis.
      Positive and negative values select the direction.<br />
      <br /><i>Rotate applies only to this frame and is not inherited.</i>
    </template>

    <template #twist>
      <strong>Twist</strong><br />
      Rolls the prop around its own transported local axis while leaving its path and Turns
      unchanged.<br />
      The signed value is added during each frame interval and inherited by following frames.
      Setting Twist to zero stops adding roll without undoing the accumulated orientation.<br />
      <br /><i>When undefined, this property inherits from the previous frame.</i>
    </template>

    <template #beats>
      <strong>Beats</strong><br />
      Specifies timing or rhythm divisions along the path.<br />
      <br /><i>When undefined, this property inherits from the previous frame.</i>
    </template>

    <template #type>
      <strong>Type</strong><br />
      Determines the transition style between frames or segments.<br />
      Changing this affects how the prop interpolates or blends between positions.<br />
      <strong>Spherical:</strong> Moves around the center in a radial pattern.<br />
      <strong>Linear:</strong> Moves in a straight line (typically) between two points.<br />
      <br /><i>When undefined, this property inherits from the previous frame.</i>
    </template>
  </PropertyPanel>
</template>

<script setup lang="ts">
import PropertyPanel from '../PropertyPanel.vue'
import { useProperties } from '@/features/editor/composables/useProperties'
import { INDPNT, TTEXT } from '@/domain/animation/AnimStruct'

const store = inject('store', ref('main'))
const { animGet, animSet, ANIMS, panelWatcher, ARCDENOM } = useProperties(store.value)

const data = ref({})

const yaw = reactive({
  name: 'yaw',
  text: 'Yaw',
  component: 'Yaw',
  undef: true,
  mult: 45,
  min: -4,
  max: 4,
  neg: true,
})

const rotate = reactive({
  name: 'rotate',
  text: 'Rotate',
  component: 'Decimal',
  undef: true,
  mult: 45,
  min: -8,
  max: 8,
  neg: true,
})

const twist = reactive({
  name: 'twist',
  text: 'Twist',
  component: 'Decimal',
  undef: true,
  mult: 45,
  min: -8,
  max: 8,
  neg: true,
})

const vals = [
  { name: 'point', text: 'Point', component: 'Point', items: INDPNT },
  { name: 'path', text: 'Path', component: 'Point', items: INDPNT },
  { name: 'direct', text: 'Direct', component: 'Point', items: INDPNT },
  yaw,
  rotate,
  twist,
  { name: 'beats', text: 'Beats', component: 'Beats', undef: true },
  {
    name: 'type',
    text: 'Type',
    component: 'SelectInt',
    undef: true,
    items: TTEXT,
    label: 'Transition Type',
  },
]

watchEffect(() => {
  const arcd = ARCDENOM.value
  const max = 360 / arcd
  const maxhalf = Math.ceil(max / 2)

  twist.mult = yaw.mult = rotate.mult = arcd
  twist.max = rotate.max = max
  twist.min = rotate.min = -max
  yaw.max = maxhalf
  yaw.min = -maxhalf
})

panelWatcher(ANIMS, data, vals, animGet)
</script>
