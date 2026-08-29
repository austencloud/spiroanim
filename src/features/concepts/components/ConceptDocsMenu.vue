<template>
  <BasePopupMenu v-model:open="isOpen" class="concept-docs-menu" data-role="concept-docs-menu">
    <template #trigger>
      <span>Docs</span>
      <BaseIcon
        class="concept-docs-menu__chevron"
        :class="{ 'concept-docs-menu__chevron--open': isOpen }"
        :path="mdiChevronDown"
        :size="14"
        aria-hidden="true"
      />
    </template>

    <a class="concept-docs-menu__link" :href="vtgReferenceHref" role="menuitem"> VTG Reference </a>
    <a class="concept-docs-menu__link" :href="vtg3Href" role="menuitem"> Noel's VTG3 </a>
  </BasePopupMenu>
</template>

<script setup lang="ts">
import { mdiChevronDown } from '@mdi/js'

import BaseIcon from '@/components/icons/BaseIcon.vue'
import BasePopupMenu from '@/components/ui/BasePopupMenu.vue'

const isOpen = ref(false)
const props = withDefaults(defineProps<{ returnPath?: string }>(), { returnPath: '/app' })
const returnQuery = computed(() => new URLSearchParams({ returnTo: props.returnPath }).toString())
const vtgReferenceHref = computed(() => `/vtg-reference/?${returnQuery.value}`)
const vtg3Href = computed(() => `/vtg3/?${returnQuery.value}`)
</script>

<style scoped>
.concept-docs-menu {
  --popup-menu-trigger-width: var(--size-concepts-docs-trigger);
  --popup-menu-trigger-padding: var(--space-2);
  --popup-menu-panel-min-width: 11rem;

  pointer-events: auto;
}

.concept-docs-menu :deep(.base-popup-menu__trigger) {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-1);
  font-weight: 800;
}

.concept-docs-menu__chevron {
  transition: transform var(--transition-fast);
}

.concept-docs-menu__chevron--open {
  transform: rotate(180deg);
}

.concept-docs-menu__link {
  display: flex;
}

@media (prefers-reduced-motion: reduce) {
  .concept-docs-menu__chevron {
    transition: none;
  }
}
</style>
