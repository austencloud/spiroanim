<template>
  <PatternMatrixPane
    :animation="animation"
    :animation-ready="animationReady"
    :pattern-matcher="patternMatcher"
    :builder-active="builderActive"
    :builder-full-catalog="builderFullCatalog"
    :builder-full-catalog-forced="builderFullCatalogForced"
    :builder-full-grid="builderFullGrid"
    @pattern-select="forwardSelection"
    @pattern-preview="emit('patternPreview', $event)"
    @customize="emit('customize', $event)"
    @quick-slots-create="emit('quickSlotsCreate', $event)"
    @animation-update="emit('animationUpdate', $event)"
    @builder-open="emit('builderOpen')"
    @update:builder-full-grid="emit('update:builderFullGrid', $event)"
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
    builderFullCatalog?: boolean
    builderFullCatalogForced?: boolean
    builderFullGrid?: boolean
  }>(),
  {
    animationReady: true,
    builderActive: false,
    builderFullCatalog: false,
    builderFullCatalogForced: false,
    builderFullGrid: false,
  },
)

const emit = defineEmits<{
  patternSelect: [selection: ConceptPatternSelection]
  patternPreview: [selection: ConceptPatternSelection]
  customize: [selection: ConceptPatternSelection]
  quickSlotsCreate: [animations: readonly RootDataFinal[]]
  animationUpdate: [animation: RootDataFinal]
  builderOpen: []
  'update:builderFullGrid': [enabled: boolean]
}>()

const forwardSelection = (selection: ConceptPatternSelection) => {
  emit('patternSelect', selection)
}
</script>
