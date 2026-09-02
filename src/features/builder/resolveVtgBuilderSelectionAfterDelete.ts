/** Preserves selection by portion identity after one Builder portion is removed. */
export const resolveVtgBuilderSelectionAfterDelete = (
  selectedIndex: number | undefined,
  deletedIndex: number,
): number | undefined => {
  if (selectedIndex === undefined || selectedIndex === deletedIndex) return undefined
  return selectedIndex > deletedIndex ? selectedIndex - 1 : selectedIndex
}
