<template>
  <PatternMatrixPane
    concept="vtg"
    :vtg-beat="radioSelection"
    :animation="animation"
    :animation-ready="animationReady"
    @beat-select="radioSelection = $event"
    @pattern-select="forwardSelection"
  >
    <template #after-pattern-controls>
      <PatternBeatField v-model:selection="radioSelection" concept="vtg" />
    </template>
  </PatternMatrixPane>
</template>

<script setup lang="ts">
import PatternMatrixPane from '@/features/concepts/components/PatternMatrixPane.vue'
import PatternBeatField from '@/features/concepts/components/PatternBeatField.vue'
import { isVtgPatternSelection } from '@/features/concepts/types'
import type { ConceptPatternSelection } from '@/features/concepts/types'
import type { VtgBeat, VtgPatternSelection } from '@/features/vtg/types'
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

const radioSelection = ref<VtgBeat>(1)

const forwardSelection = (selection: ConceptPatternSelection) => {
  if (isVtgPatternSelection(selection)) emit('patternSelect', selection)
}
</script>
