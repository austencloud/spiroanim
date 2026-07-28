<template>
  <Decimal :data="props.data" :vals="props.vals" :setter="props.setter" />
  <button class="action-button" type="button" @click="click">REVERSE</button>
</template>

<script setup lang="ts">
import Decimal from './DecimalForm.vue'
import { VALUE } from '@/features/editor/composables/useProperties'
import { reverseAngle } from '@/math/animation/AngleFunc'
import type { DynamicVal, ValRetType, SetterFunc } from '@/types/AnimTypes'

const props = defineProps<{
  data: ValRetType
  vals: DynamicVal
  setter: SetterFunc
}>()

function click() {
  props.setter(props.vals.name, reverseAngle(Number(props.data[VALUE])))
}
</script>

<style scoped>
.action-button {
  padding: var(--space-1) var(--space-2);
  color: var(--color-on-action-primary);
  cursor: pointer;
  background: var(--color-action-primary);
  border: 0;
  border-radius: var(--radius-sm);
}
</style>
