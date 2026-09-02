/** Preserves selection by portion or trailing-slot identity after a Builder portion is inserted. */
export const resolveVtgBuilderSelectionAfterInsert = (
  selectedIndex: number | undefined,
  insertedIndex: number,
): number | undefined => {
  if (selectedIndex === undefined) return undefined
  return selectedIndex >= insertedIndex ? selectedIndex + 1 : selectedIndex
}
