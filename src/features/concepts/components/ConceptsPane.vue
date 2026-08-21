<template>
  <section class="concepts-pane scrollbar" aria-label="Concepts" data-concepts-pane>
    <QuickSlotsControl
      v-if="quickSlotCount > 0"
      @apply="emit('quickSlotApply', $event)"
      @save="emit('quickSlotSave', $event)"
    />

    <div
      class="concepts-pane__selector-row"
      :class="{ 'concepts-pane__selector-row--with-create': quickSlotCount === 0 }"
    >
      <select
        v-model="selectedConcept"
        :disabled="builderActive"
        class="concepts-pane__selector"
        aria-label="Concept"
        data-role="concept-selector"
      >
        <option value="vtg">Vulkan Tech Gospel</option>
        <option value="8stp">Eight Step</option>
        <option value="qst">Quarter Space Tech</option>
        <option value="to">Third Order</option>
        <option value="tka">The Kinetic Alphabet</option>
      </select>

      <AppTooltip
        v-if="quickSlotCount === 0"
        text="Create four Quick Slots"
        :disabled="touchDevice"
      >
        <template #activator="{ props: activatorProps }">
          <QuickSlotVisual
            v-bind="activatorProps"
            aria-label="Create four Quick Slots"
            data-role="quick-slots-create"
            @click="createQuickSlots"
          >
            <BaseIcon :path="mdiPlus" :size="18" />
          </QuickSlotVisual>
        </template>
      </AppTooltip>
    </div>

    <VtgPane
      v-if="selectedConcept === 'vtg'"
      :animation="animation"
      :animation-ready="animationReady"
      :pattern-matcher="patternMatcher"
      :builder-active="builderActive"
      :builder-full-catalog="builderFullCatalog"
      @pattern-select="emit('patternSelect', $event)"
      @pattern-preview="emit('patternPreview', $event)"
      @customize="emit('customize', $event)"
      @quick-slots-create="emit('quickSlotsCreate', $event)"
      @builder-open="emit('builderOpen')"
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
    <ThirdOrderPane v-else-if="selectedConcept === 'to'" />
    <KineticAlphabetPane v-else />
  </section>
</template>

<script setup lang="ts">
import EightStepPane from '@/features/eight-step/components/EightStepPane.vue'
import { mdiPlus } from '@mdi/js'
import AppTooltip from '@/components/AppTooltip.vue'
import BaseIcon from '@/components/icons/BaseIcon.vue'
import { usePatternMatchingClient } from '@/features/concepts/composables/usePatternMatchingWorker'
import QuickSlotsControl from '@/features/concepts/components/QuickSlotsControl.vue'
import QuickSlotVisual from '@/features/concepts/components/QuickSlotVisual.vue'
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'
import type { ConceptPatternSelection } from '@/features/concepts/types'
import KineticAlphabetPane from '@/features/kinetic-alphabet/components/KineticAlphabetPane.vue'
import QuarterSpaceTechPane from '@/features/quarter-space-tech/components/QuarterSpaceTechPane.vue'
import ThirdOrderPane from '@/features/third-order/components/ThirdOrderPane.vue'
import VtgPane from '@/features/vtg/components/VtgPane.vue'
import type { RootDataFinal } from '@/types/AnimTypes'
import { isTouchDevice } from '@/utils/device'

const props = defineProps<{
  animation?: RootDataFinal
  animationReady?: boolean
  builderActive?: boolean
  builderFullCatalog?: boolean
}>()

const emit = defineEmits<{
  patternSelect: [selection: ConceptPatternSelection]
  patternPreview: [selection: ConceptPatternSelection]
  customize: [selection: ConceptPatternSelection]
  quickSlotApply: [path: string]
  quickSlotSave: [slot: number]
  quickSlotsCreate: [animations: readonly RootDataFinal[]]
  builderOpen: []
}>()

const conceptsStore = useConceptsStore()
const { quickSlotCount, selectedConcept } = storeToRefs(conceptsStore)
const usesPatternMatching = computed(
  () => selectedConcept.value !== 'to' && selectedConcept.value !== 'tka' && !props.builderActive,
)
const patternMatcher = usePatternMatchingClient(usesPatternMatching)

const createQuickSlots = () => {
  conceptsStore.restoreQuickSlots()
  conceptsStore.selectedQuickSlot = 1
}

const touchDevice = typeof navigator !== 'undefined' && isTouchDevice()
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

.concepts-pane__selector-row {
  display: flex;
  width: min(100%, 18rem);
  margin: var(--space-2) auto;
  gap: var(--space-1);
  align-items: stretch;
}

.concepts-pane__selector-row--with-create {
  width: min(100%, 20.25rem);
}

.concepts-pane__selector {
  display: block;
  min-width: 0;
  flex: 1 1 auto;
  min-height: 2.75rem;
  padding: var(--space-2) var(--space-3);
  margin: 0;
  color: var(--color-text);
  font: inherit;
  font-size: 1.05rem;
  font-weight: 800;
  background: color-mix(in srgb, var(--color-action-primary) 9%, var(--color-surface));
  border: 2px solid color-mix(in srgb, var(--color-action-primary) 72%, var(--color-border));
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.concepts-pane__selector:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 1px;
}
</style>
