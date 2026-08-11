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
      <button
        v-if="rowIndex === 0"
        type="button"
        aria-label="Previous page"
        data-role="qst-page-previous"
        :disabled="pageIndex === 0"
        @click="emit('change', pageIndex - 1)"
      >
        <BaseIcon :path="mdiChevronLeft" :size="20" />
      </button>
      <button
        v-for="pageNumber in pageGroup"
        :key="pageNumber"
        type="button"
        :aria-label="`Page ${pageNumber}`"
        :aria-current="pageNumber - 1 === pageIndex ? 'page' : undefined"
        :data-page="pageNumber"
        data-role="qst-page"
        @click="emit('change', pageNumber - 1)"
      >
        {{ pageNumber }}
      </button>
      <button
        v-if="rowIndex === pageGroups.length - 1"
        type="button"
        aria-label="Next page"
        data-role="qst-page-next"
        :disabled="pageIndex === pageCount - 1"
        @click="emit('change', pageIndex + 1)"
      >
        <BaseIcon :path="mdiChevronRight" :size="20" />
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { mdiChevronLeft, mdiChevronRight } from '@mdi/js'

import BaseIcon from '@/components/icons/BaseIcon.vue'

const props = defineProps<{
  pageCount: number
  pageIndex: number
}>()

const emit = defineEmits<{
  change: [pageIndex: number]
}>()

const paginationElement = ref<HTMLElement>()
const rowCount = ref(1)
const pageNumbers = computed(() =>
  Array.from({ length: props.pageCount }, (_, pageIndex) => pageIndex + 1),
)
const pageGroups = computed(() => {
  const baseGroupSize = Math.floor(pageNumbers.value.length / rowCount.value)
  const largerGroupCount = pageNumbers.value.length % rowCount.value
  let start = 0

  return Array.from({ length: rowCount.value }, (_, groupIndex) => {
    const groupSize = baseGroupSize + (groupIndex < largerGroupCount ? 1 : 0)
    const group = pageNumbers.value.slice(start, start + groupSize)
    start += groupSize
    return group
  })
})

const updateSplitRows = () => {
  const element = paginationElement.value
  if (!element) return

  const buttons = [...element.querySelectorAll<HTMLButtonElement>('button')]
  const style = getComputedStyle(element)
  const gap = Number.parseFloat(style.columnGap) || 0
  const padding =
    (Number.parseFloat(style.paddingInlineStart) || 0) +
    (Number.parseFloat(style.paddingInlineEnd) || 0)
  const buttonWidth = Math.max(0, ...buttons.map((button) => button.offsetWidth))
  if (buttonWidth === 0) {
    rowCount.value = 1
    return
  }

  const availableWidth = Math.max(0, element.clientWidth - padding)
  const controlsPerRow = Math.max(1, Math.floor((availableWidth + gap) / (buttonWidth + gap)))
  const requiredRowCount = Math.max(1, Math.ceil((props.pageCount + 2) / controlsPerRow))
  rowCount.value = Math.min(Math.max(1, props.pageCount), requiredRowCount)
}

let resizeObserver: ResizeObserver | undefined

onMounted(() => {
  updateSplitRows()
  if (typeof ResizeObserver === 'undefined' || !paginationElement.value) return

  resizeObserver = new ResizeObserver(updateSplitRows)
  resizeObserver.observe(paginationElement.value)
})

watch(
  () => props.pageCount,
  () => void nextTick(updateSplitRows),
)

onBeforeUnmount(() => resizeObserver?.disconnect())
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
