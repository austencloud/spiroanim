<template>
  <PatternMatrixPane
    :animation="animation"
    :animation-ready="animationReady"
    :pattern-matcher="patternMatcher"
    @pattern-select="forwardSelection"
  />
</template>

<script setup lang="ts">
import PatternMatrixPane from '@/features/concepts/components/PatternMatrixPane.vue'
import type { ConceptPatternSelection } from '@/features/concepts/types'
import type { RootDataFinal } from '@/types/AnimTypes'
import type { PatternMatchingClient } from '@/workers/pattern-matching/PatternMatchingWorkerTypes'

withDefaults(
  defineProps<{
    animation?: RootDataFinal
    animationReady?: boolean
    patternMatcher?: PatternMatchingClient
  }>(),
  { animationReady: true },
)

const emit = defineEmits<{
  patternSelect: [selection: ConceptPatternSelection]
}>()

const forwardSelection = (selection: ConceptPatternSelection) => {
  emit('patternSelect', selection)
}
</script>
