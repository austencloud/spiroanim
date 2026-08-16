<template>
  <fieldset
    ref="quickSlotsElement"
    class="quick-slots"
    :class="{ 'quick-slots--split': slotGroups.length > 1 }"
    data-role="quick-slots"
    :data-row-count="slotGroups.length"
  >
    <legend class="quick-slots__visually-hidden">Quick Slots</legend>

    <div
      v-for="(slotGroup, rowIndex) in slotGroups"
      :key="rowIndex"
      class="quick-slots__row"
      data-role="quick-slots-row"
    >
      <AppTooltip v-if="rowIndex === 0" text="Remove a Quick Slot" :disabled="touchDevice">
        <template #activator="{ props: activatorProps }">
          <QuickSlotVisual
            v-bind="activatorProps"
            aria-label="Remove a Quick Slot"
            data-role="quick-slot-remove"
            @click="conceptsStore.removeQuickSlot()"
          >
            <BaseIcon :path="mdiMinus" :size="18" />
          </QuickSlotVisual>
        </template>
      </AppTooltip>

      <AppTooltip
        v-for="slot in slotGroup"
        :key="slot"
        :text="`${selectedQuickSlot === slot ? 'Clear' : 'Select'} Quick Slot ${slot}`"
        :disabled="touchDevice"
      >
        <template #activator="{ props: activatorProps }">
          <label v-bind="activatorProps" :data-role="`quick-slot-${slot}`">
            <input
              v-model="selectedQuickSlot"
              type="radio"
              name="quick-slot"
              :value="slot"
              :aria-label="`Quick Slot ${slot}`"
              @click="clearQuickSlotIfSelected(slot)"
              @change="applyQuickSlot(slot)"
            />
            <QuickSlotVisual tag="span">Q{{ slot }}</QuickSlotVisual>
          </label>
        </template>
      </AppTooltip>

      <AppTooltip
        v-if="rowIndex === slotGroups.length - 1"
        text="Add a Quick Slot"
        :disabled="touchDevice"
      >
        <template #activator="{ props: activatorProps }">
          <QuickSlotVisual
            v-bind="activatorProps"
            aria-label="Add a Quick Slot"
            data-role="quick-slot-add"
            @click="conceptsStore.addQuickSlot()"
          >
            <BaseIcon :path="mdiPlus" :size="18" />
          </QuickSlotVisual>
        </template>
      </AppTooltip>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { mdiMinus, mdiPlus } from '@mdi/js'

import BaseIcon from '@/components/icons/BaseIcon.vue'
import AppTooltip from '@/components/AppTooltip.vue'
import QuickSlotVisual from '@/features/concepts/components/QuickSlotVisual.vue'
import { useBalancedControlRows } from '@/composables/useBalancedControlRows'
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'
import { isTouchDevice } from '@/utils/device'

const emit = defineEmits<{
  apply: [path: string]
}>()

const conceptsStore = useConceptsStore()
const { quickSlotCount, selectedQuickSlot } = storeToRefs(conceptsStore)
const quickSlots = computed(() =>
  Array.from({ length: quickSlotCount.value }, (_, index) => index + 1),
)
const { containerElement: quickSlotsElement, itemGroups: slotGroups } = useBalancedControlRows(
  quickSlots,
  {
    controlSelector: '.quick-slot-visual',
    extraControlCount: 2,
  },
)
const touchDevice = typeof navigator !== 'undefined' && isTouchDevice()

const clearQuickSlotIfSelected = (slot: number) => {
  if (selectedQuickSlot.value === slot) conceptsStore.toggleQuickSlot(slot)
}

const applyQuickSlot = (slot: number) => {
  const path = conceptsStore.quickSlotPaths[slot - 1]
  if (path) emit('apply', path)
}
</script>

<style scoped>
.quick-slots {
  display: flex;
  max-inline-size: 100%;
  padding: var(--space-1);
  margin: 0 auto;
  border: 0;
  gap: var(--space-1);
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

.quick-slots__row {
  display: contents;
}

.quick-slots--split {
  display: grid;
}

.quick-slots--split .quick-slots__row {
  display: flex;
  justify-content: center;
  gap: var(--space-1);
}

.quick-slots label {
  position: relative;
  cursor: pointer;
}

.quick-slots input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.quick-slots input:checked + .quick-slot-visual {
  --quick-slot-accent: color-mix(
    in srgb,
    var(--color-action-primary) 68%,
    var(--color-status-success)
  );
  color: var(--color-on-action-primary);
  background: var(--quick-slot-accent);
  border-color: var(--quick-slot-accent);
  box-shadow: var(--shadow-sm);
}

.quick-slots label:hover > input:not(:checked) + .quick-slot-visual {
  --quick-slot-accent: color-mix(
    in srgb,
    var(--color-action-primary) 68%,
    var(--color-status-success)
  );
  background: color-mix(in srgb, var(--quick-slot-accent) 17%, var(--color-surface));
}

.quick-slots input:focus-visible + .quick-slot-visual {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.quick-slots__visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  white-space: nowrap;
  border: 0;
  clip-path: inset(50%);
}
</style>
