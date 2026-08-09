<template>
  <PatternMatrixPane
    concept="qtr"
    :animation="animation"
    :animation-ready="animationReady"
    @pattern-select="forwardSelection"
  />
</template>

<script setup lang="ts">
import PatternMatrixPane from '@/features/concepts/components/PatternMatrixPane.vue'
import { isQtrPatternSelection } from '@/features/concepts/types'
import type { ConceptPatternSelection } from '@/features/concepts/types'
import type { QtrPatternSelection } from '@/features/qtr/types'
import type { RootDataFinal } from '@/types/AnimTypes'

withDefaults(
  defineProps<{
    animation?: RootDataFinal
    animationReady?: boolean
  }>(),
  { animationReady: true },
)

const emit = defineEmits<{
  patternSelect: [selection: QtrPatternSelection]
}>()

const forwardSelection = (selection: ConceptPatternSelection) => {
  if (isQtrPatternSelection(selection)) emit('patternSelect', selection)
}
</script>
