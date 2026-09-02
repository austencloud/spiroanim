import { describe, expect, it } from 'vitest'

import { resolveVtgBuilderSelectionAfterDelete } from '@/features/builder/resolveVtgBuilderSelectionAfterDelete'

describe('resolveVtgBuilderSelectionAfterDelete', () => {
  it.each([
    { selected: undefined, deleted: 1, expected: undefined },
    { selected: 1, deleted: 1, expected: undefined },
    { selected: 0, deleted: 1, expected: 0 },
    { selected: 2, deleted: 1, expected: 1 },
  ])(
    'maps selection $selected after deleting $deleted to $expected',
    ({ selected, deleted, expected }) => {
      expect(resolveVtgBuilderSelectionAfterDelete(selected, deleted)).toBe(expected)
    },
  )
})
