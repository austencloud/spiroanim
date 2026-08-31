import type { WatchSource } from 'vue'

/** Tracks a stable workspace surface against a pane-owned placement marker. */
export function usePaneSurface(
  target: Ref<HTMLElementUndef>,
  viewLeft: Ref<number>,
  viewTop: Ref<number>,
  refreshSources: WatchSource[] = [],
) {
  const {
    left,
    top,
    width,
    height,
    update: updateBounds,
  } = useElementBounding(target, {
    updateTiming: 'next-frame',
  })

  const positionStyle = computed<CSSProperties>(() => ({
    left: `${left.value - viewLeft.value}px`,
    top: `${top.value - viewTop.value}px`,
    width: `${width.value}px`,
    height: `${height.value}px`,
    visibility: target.value === undefined ? 'hidden' : 'visible',
  }))

  // A marker can change position without changing size when views swap between panes.
  watch(
    [target, ...refreshSources],
    () => {
      void nextTick(updateBounds)
    },
    { flush: 'post', immediate: true },
  )

  return { width, height, positionStyle }
}
