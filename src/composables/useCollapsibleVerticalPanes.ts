export type VerticalPane = 'top' | 'bottom'

interface CollapsibleVerticalPanesOptions {
  topPercentage: Ref<number>
  splitEnabled: Readonly<Ref<boolean>>
  primaryPane: Readonly<Ref<VerticalPane>>
  paneVisible: Ref<Record<VerticalPane, boolean>>
}

/**
 * Preserves a vertical split while allowing one view to disappear in favor of a primary view.
 * Disabling the split expands whichever pane currently contains the primary view.
 */
export function useCollapsibleVerticalPanes({
  topPercentage,
  splitEnabled,
  primaryPane,
  paneVisible,
}: CollapsibleVerticalPanesOptions) {
  const effectiveTopPercentage = computed(() => {
    if (splitEnabled.value) return topPercentage.value
    return primaryPane.value === 'top' ? 100 : 0
  })

  const topFlex = computed<CSSProperties['flex']>(() => `0 0 ${effectiveTopPercentage.value}%`)
  const bottomFlex = computed<CSSProperties['flex']>(
    () => `0 0 ${100 - effectiveTopPercentage.value}%`,
  )

  watchImmediate(effectiveTopPercentage, (percentage) => {
    paneVisible.value.top = percentage > 0
    paneVisible.value.bottom = percentage < 100
  })

  const setTopPercentage = (percentage: number) => {
    if (percentage < 5) percentage = 0
    else if (percentage < 20) percentage = 20
    else if (percentage > 95) percentage = 100
    else if (percentage > 80) percentage = 80
    topPercentage.value = percentage
  }

  return {
    topFlex,
    bottomFlex,
    setTopPercentage,
  }
}
