interface VtgBuilderDropTargetOptions {
  portionCount: number
  selectedIndex: number | undefined
  targetIndex: number
  allowFirstDrop?: boolean
}

/** Keeps the active Builder insertion context and the accepted drop target in sync. */
export const isVtgBuilderDropAllowed = ({
  portionCount,
  selectedIndex,
  targetIndex,
  allowFirstDrop = false,
}: VtgBuilderDropTargetOptions): boolean => {
  if (targetIndex < 0 || targetIndex > portionCount) return false
  if (portionCount === 0) return targetIndex === 0
  if (selectedIndex !== undefined) return targetIndex === selectedIndex
  return allowFirstDrop || targetIndex > 0
}
