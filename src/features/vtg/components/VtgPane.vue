<template>
  <PatternMatrixPane
    :animation="animation"
    :animation-ready="animationReady"
    :pattern-matcher="patternMatcher"
    :builder-active="builderActive"
    @pattern-select="forwardSelection"
    @pattern-preview="emit('patternPreview', $event)"
    @customize="emit('customize', $event)"
    @quick-slots-create="emit('quickSlotsCreate', $event)"
    @builder-open="emit('builderOpen')"
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
    builderActive?: boolean
  }>(),
  { animationReady: true, builderActive: false },
)

const emit = defineEmits<{
  patternSelect: [selection: ConceptPatternSelection]
  patternPreview: [selection: ConceptPatternSelection]
  customize: [selection: ConceptPatternSelection]
  quickSlotsCreate: [animations: readonly RootDataFinal[]]
  builderOpen: []
}>()

const forwardSelection = (selection: ConceptPatternSelection) => {
  emit('patternSelect', selection)
}
</script>
