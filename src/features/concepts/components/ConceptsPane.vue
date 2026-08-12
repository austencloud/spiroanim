<template>
  <section class="concepts-pane scrollbar" aria-label="Concepts" data-concepts-pane>
    <select
      v-model="selectedConcept"
      class="concepts-pane__selector"
      aria-label="Concept"
      data-role="concept-selector"
    >
      <option value="vtg">Vulkan Tech Gospel</option>
      <option value="8stp">Eight Step</option>
      <option value="qst">Quarter Space Tech</option>
      <option value="tka">The Kinetic Alphabet</option>
    </select>

    <VtgPane
      v-if="selectedConcept === 'vtg'"
      :animation="animation"
      :animation-ready="animationReady"
      :pattern-matcher="patternMatcher"
      @pattern-select="emit('patternSelect', $event)"
    />
    <EightStepPane
      v-else-if="selectedConcept === '8stp'"
      :animation="animation"
      :animation-ready="animationReady"
      :pattern-matcher="patternMatcher"
      @pattern-select="emit('patternSelect', $event)"
    />
    <QuarterSpaceTechPane
      v-else-if="selectedConcept === 'qst'"
      :animation="animation"
      :animation-ready="animationReady"
      :pattern-matcher="patternMatcher"
      @pattern-select="emit('patternSelect', $event)"
    />
    <KineticAlphabetPane v-else />
  </section>
</template>

<script setup lang="ts">
import EightStepPane from '@/features/eight-step/components/EightStepPane.vue'
import { usePatternMatchingClient } from '@/features/concepts/composables/usePatternMatchingWorker'
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'
import type { ConceptPatternSelection } from '@/features/concepts/types'
import KineticAlphabetPane from '@/features/kinetic-alphabet/components/KineticAlphabetPane.vue'
import QuarterSpaceTechPane from '@/features/quarter-space-tech/components/QuarterSpaceTechPane.vue'
import VtgPane from '@/features/vtg/components/VtgPane.vue'
import type { RootDataFinal } from '@/types/AnimTypes'

defineProps<{
  animation?: RootDataFinal
  animationReady?: boolean
}>()

const emit = defineEmits<{
  patternSelect: [selection: ConceptPatternSelection]
}>()

const { selectedConcept } = storeToRefs(useConceptsStore())
const patternMatcher = usePatternMatchingClient()
</script>

<style scoped>
.concepts-pane {
  width: 100%;
  height: 100%;
  min-inline-size: 0;
  min-block-size: 0;
  overflow: auto;
  overscroll-behavior: contain;
  color: var(--color-text);
}

.concepts-pane__selector {
  display: block;
  width: min(100%, 16rem);
  min-height: 2rem;
  padding: var(--space-1) var(--space-2);
  margin: var(--space-1) auto;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-weight: 700;
  font: inherit;
}

.concepts-pane__selector:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 1px;
}
</style>
