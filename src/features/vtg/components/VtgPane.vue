<template>
  <PatternMatrixPane
    concept="vtg"
    :animation="animation"
    :animation-ready="animationReady"
    @pattern-select="forwardSelection"
  />
</template>

<script setup lang="ts">
import PatternMatrixPane from '@/features/concepts/components/PatternMatrixPane.vue'
import { isVtgPatternSelection } from '@/features/concepts/types'
import type { ConceptPatternSelection } from '@/features/concepts/types'
import type { VtgPatternSelection } from '@/features/vtg/types'
import type { RootDataFinal } from '@/types/AnimTypes'

withDefaults(
  defineProps<{
    animation?: RootDataFinal
    animationReady?: boolean
  }>(),
  { animationReady: true },
)

const emit = defineEmits<{
  patternSelect: [selection: VtgPatternSelection]
}>()

const forwardSelection = (selection: ConceptPatternSelection) => {
  if (isVtgPatternSelection(selection)) emit('patternSelect', selection)
}
</script>
