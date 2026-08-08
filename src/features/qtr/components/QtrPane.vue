<template>
  <PatternMatrixPane
    concept="qtr"
    :qtr-beat="radioSelection"
    :animation="animation"
    :animation-ready="animationReady"
    @beat-select="radioSelection = $event"
    @pattern-select="forwardSelection"
  >
    <template #after-pattern-controls>
      <PatternBeatField v-model:selection="radioSelection" concept="qtr" />
    </template>
  </PatternMatrixPane>
</template>

<script setup lang="ts">
import PatternMatrixPane from '@/features/concepts/components/PatternMatrixPane.vue'
import PatternBeatField from '@/features/concepts/components/PatternBeatField.vue'
import { isQtrPatternSelection } from '@/features/concepts/types'
import type { ConceptPatternSelection } from '@/features/concepts/types'
import type { QtrBeat, QtrPatternSelection } from '@/features/qtr/types'
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

const radioSelection = ref<QtrBeat>(1)

const forwardSelection = (selection: ConceptPatternSelection) => {
  if (isQtrPatternSelection(selection)) emit('patternSelect', selection)
}
</script>
