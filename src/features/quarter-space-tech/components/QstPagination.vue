<template>
  <nav
    ref="paginationElement"
    class="qst-pagination"
    :class="{ 'qst-pagination--split': pageGroups.length > 1 }"
    aria-label="Quarter Space Tech library pages"
    :data-row-count="pageGroups.length"
  >
    <div
      v-for="(pageGroup, rowIndex) in pageGroups"
      :key="rowIndex"
      class="qst-pagination__row"
      data-role="qst-pagination-row"
    >
      <AppTooltip v-if="rowIndex === 0" text="Previous page">
        <template #activator="{ props: activatorProps }">
          <button
            v-bind="activatorProps"
            type="button"
            aria-label="Previous page"
            data-role="qst-page-previous"
            :disabled="pageIndex === 0"
            @click="emit('change', pageIndex - 1)"
          >
            <BaseIcon :path="mdiChevronLeft" :size="20" />
          </button>
        </template>
      </AppTooltip>
      <AppTooltip
        v-for="pageNumber in pageGroup"
        :key="pageNumber"
        :text="`Go to page ${pageNumber}`"
      >
        <template #activator="{ props: activatorProps }">
          <button
            v-bind="activatorProps"
            type="button"
            :aria-label="`Page ${pageNumber}`"
            :aria-current="pageNumber - 1 === pageIndex ? 'page' : undefined"
            :data-page="pageNumber"
            data-role="qst-page"
            @click="emit('change', pageNumber - 1)"
          >
            {{ pageNumber }}
          </button>
        </template>
      </AppTooltip>
      <AppTooltip v-if="rowIndex === pageGroups.length - 1" text="Next page">
        <template #activator="{ props: activatorProps }">
          <button
            v-bind="activatorProps"
            type="button"
            aria-label="Next page"
            data-role="qst-page-next"
            :disabled="pageIndex === pageCount - 1"
            @click="emit('change', pageIndex + 1)"
          >
            <BaseIcon :path="mdiChevronRight" :size="20" />
          </button>
        </template>
      </AppTooltip>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { mdiChevronLeft, mdiChevronRight } from '@mdi/js'

import BaseIcon from '@/components/icons/BaseIcon.vue'
import AppTooltip from '@/components/AppTooltip.vue'
import { useBalancedControlRows } from '@/composables/useBalancedControlRows'

const props = defineProps<{
  pageCount: number
  pageIndex: number
}>()

const emit = defineEmits<{
  change: [pageIndex: number]
}>()

const pageNumbers = computed(() =>
  Array.from({ length: props.pageCount }, (_, pageIndex) => pageIndex + 1),
)
const { containerElement: paginationElement, itemGroups: pageGroups } = useBalancedControlRows(
  pageNumbers,
  {
    controlSelector: 'button',
    extraControlCount: 2,
  },
)
</script>

<style scoped>
.qst-pagination {
  display: flex;
  max-inline-size: 100%;
  padding: var(--space-2);
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.qst-pagination__row {
  display: contents;
}

.qst-pagination--split {
  display: grid;
}

.qst-pagination--split .qst-pagination__row {
  display: flex;
  justify-content: center;
  gap: var(--space-1);
}

.qst-pagination button {
  display: grid;
  min-inline-size: 2rem;
  min-block-size: 2rem;
  padding: 0.25rem;
  color: var(--color-text);
  font: inherit;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  place-items: center;
}

.qst-pagination button[aria-current='page'] {
  color: var(--color-on-action-primary);
  background: var(--color-action-primary);
  border-color: var(--color-action-primary);
}

.qst-pagination button:disabled {
  cursor: default;
  opacity: 0.45;
}

.qst-pagination button:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}
</style>
