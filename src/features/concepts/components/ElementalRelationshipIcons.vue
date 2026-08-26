<template>
  <span
    class="elemental-relationship-icons"
    :class="{ 'elemental-relationship-icons--responsive': responsive }"
    :aria-label="tokens.map(({ label }) => label).join(' / ')"
  >
    <span
      v-for="(token, index) in tokens"
      :key="`${token.label}-${index}`"
      class="elemental-relationship-icons__icon"
      :class="
        token.element
          ? `elemental-relationship-icons__icon--${token.element.toLowerCase()}`
          : 'elemental-relationship-icons__icon--quarter'
      "
      :data-element="token.element"
    >
      <BaseIcon v-if="token.element" :path="elementIcons[token.element]" :size="size" />
      <span v-else>{{ token.label }}</span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { mdiEarth, mdiFire, mdiWater, mdiWeatherWindy } from '@mdi/js'

import BaseIcon from '@/components/icons/BaseIcon.vue'
import {
  relationshipElement,
  type ElementalRelationship,
  type ElementName,
} from '@/features/concepts/elementalRelationships'

const props = withDefaults(
  defineProps<{
    hands?: ElementalRelationship
    props?: ElementalRelationship
    size?: number | string
    responsive?: boolean
  }>(),
  { size: 18, responsive: false },
)

const elementIcons: Readonly<Record<ElementName, string>> = {
  Earth: mdiEarth,
  Water: mdiWater,
  Air: mdiWeatherWindy,
  Fire: mdiFire,
}
const tokens = computed(() =>
  [props.hands, props.props].flatMap((relationship) => {
    if (!relationship) return []
    const element = relationshipElement(relationship)
    return [{ element, label: element ?? `${relationship.timing}${relationship.direction}` }]
  }),
)
</script>

<style scoped>
.elemental-relationship-icons {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
}

.elemental-relationship-icons__icon {
  display: inline-flex;
  align-items: center;
  filter: drop-shadow(0 0 1px var(--color-element-outline));
}

.elemental-relationship-icons--responsive :deep(.base-icon) {
  width: clamp(1rem, 3.5cqi, 2rem);
  height: clamp(1rem, 3.5cqi, 2rem);
}

.elemental-relationship-icons__icon + .elemental-relationship-icons__icon::before {
  margin-inline-end: var(--space-1);
  color: var(--color-text-muted);
  content: '/';
  font-size: 0.72em;
  font-weight: 700;
}

.elemental-relationship-icons__icon--earth {
  color: var(--color-element-earth);
}

.elemental-relationship-icons__icon--water {
  color: var(--color-element-water);
}

.elemental-relationship-icons__icon--air {
  color: var(--color-element-air);
}

.elemental-relationship-icons__icon--fire {
  color: var(--color-element-fire);
}

.elemental-relationship-icons__icon--quarter {
  color: var(--color-text-muted);
  font-weight: 800;
  line-height: 1;
}
</style>
