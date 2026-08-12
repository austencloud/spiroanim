<template>
  <h3 ref="titleElement" class="qst-pattern-title">{{ caption }}</h3>
</template>

<script setup lang="ts">
const props = defineProps<{
  caption: string
}>()

const titleElement = ref<HTMLElement>()
let resizeObserver: ResizeObserver | undefined

const fitTitle = () => {
  const element = titleElement.value
  if (!element) return

  element.style.removeProperty('--qst-pattern-title-scale')
  if (element.clientWidth <= 0 || element.scrollWidth <= element.clientWidth) return

  element.style.setProperty(
    '--qst-pattern-title-scale',
    String(element.clientWidth / element.scrollWidth),
  )
}

watch(
  () => props.caption,
  () => void nextTick(fitTitle),
)

onMounted(() => {
  fitTitle()
  if (typeof ResizeObserver === 'undefined' || !titleElement.value) return

  resizeObserver = new ResizeObserver(fitTitle)
  resizeObserver.observe(titleElement.value)
})

onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<style scoped>
.qst-pattern-title {
  min-inline-size: 0;
  margin: 0;
  padding-inline-end: 1.5rem;
  overflow: hidden;
  color: var(--color-text);
  font-size: clamp(0.55rem, calc(0.94rem * var(--qst-pattern-title-scale, 1)), 0.94rem);
  line-height: 1.25;
  white-space: nowrap;
}
</style>
