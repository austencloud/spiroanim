<template>
  <section class="concepts-pane" aria-label="Concepts" data-concepts-pane>
    <select
      v-model="selectedConcept"
      class="concepts-pane__selector"
      aria-label="Concept"
      data-role="concept-selector"
    >
      <option value="vtg">Vulkan Tech Gospel</option>
      <option value="qst">Quarter Spacing</option>
    </select>

    <VtgPane
      v-if="selectedConcept === 'vtg'"
      :animation="animation"
      :animation-ready="animationReady"
      @pattern-select="emit('patternSelect', $event)"
    />
    <div
      v-else
      class="concepts-pane__blank"
      role="region"
      aria-label="QST"
      data-role="qst-pattern"
    />
  </section>
</template>

<script setup lang="ts">
import VtgPane from '@/features/vtg/components/VtgPane.vue'
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'
import type { VtgPatternSelection } from '@/features/vtg/types'
import type { RootDataFinal } from '@/types/AnimTypes'

defineProps<{
  animation?: RootDataFinal
  animationReady?: boolean
}>()

const emit = defineEmits<{
  patternSelect: [selection: VtgPatternSelection]
}>()

const { selectedConcept } = storeToRefs(useConceptsStore())
</script>

<style scoped>
.concepts-pane {
  display: grid;
  width: 100%;
  height: 100%;
  min-inline-size: 0;
  min-block-size: 0;
  grid-template-rows: auto minmax(0, 1fr);
  color: var(--color-text);
}

.concepts-pane__selector {
  width: min(100%, 16rem);
  min-height: 2rem;
  padding: var(--space-2);
  margin: var(--space-2) auto;
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

.concepts-pane__blank {
  min-inline-size: 0;
  min-block-size: 0;
}
</style>
