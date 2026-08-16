export interface BalancedControlRowsOptions {
  controlSelector: string
  extraControlCount?: number
}

export const useBalancedControlRows = <Item>(
  items: Ref<readonly Item[]>,
  { controlSelector, extraControlCount = 0 }: BalancedControlRowsOptions,
) => {
  const containerElement = ref<HTMLElement>()
  const rowCount = ref(1)

  const itemGroups = computed(() => {
    const baseGroupSize = Math.floor(items.value.length / rowCount.value)
    const largerGroupCount = items.value.length % rowCount.value
    let start = 0

    return Array.from({ length: rowCount.value }, (_, groupIndex) => {
      const groupSize = baseGroupSize + (groupIndex < largerGroupCount ? 1 : 0)
      const group = items.value.slice(start, start + groupSize)
      start += groupSize
      return group
    })
  })

  const updateRows = () => {
    const element = containerElement.value
    if (!element) return

    const controls = [...element.querySelectorAll<HTMLElement>(controlSelector)]
    const style = getComputedStyle(element)
    const gap = Number.parseFloat(style.columnGap) || 0
    const padding =
      (Number.parseFloat(style.paddingInlineStart) || 0) +
      (Number.parseFloat(style.paddingInlineEnd) || 0)
    const controlWidth = Math.max(0, ...controls.map((control) => control.offsetWidth))
    if (controlWidth === 0) {
      rowCount.value = 1
      return
    }

    const availableWidth = Math.max(0, element.clientWidth - padding)
    const controlsPerRow = Math.max(1, Math.floor((availableWidth + gap) / (controlWidth + gap)))
    const requiredRowCount = Math.max(
      1,
      Math.ceil((items.value.length + extraControlCount) / controlsPerRow),
    )
    rowCount.value = Math.min(Math.max(1, items.value.length), requiredRowCount)
  }

  let resizeObserver: ResizeObserver | undefined

  onMounted(() => {
    updateRows()
    if (typeof ResizeObserver === 'undefined' || !containerElement.value) return

    resizeObserver = new ResizeObserver(updateRows)
    resizeObserver.observe(containerElement.value)
  })

  watch(
    () => items.value.length,
    () => void nextTick(updateRows),
  )

  onBeforeUnmount(() => resizeObserver?.disconnect())

  return {
    containerElement,
    itemGroups,
  }
}
