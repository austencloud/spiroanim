import { describe, expect, it } from 'vitest'

import { resolveVtgBuilderSelectionAfterInsert } from '@/features/builder/resolveVtgBuilderSelectionAfterInsert'

describe('resolveVtgBuilderSelectionAfterInsert', () => {
  it.each([
    { selected: undefined, inserted: 1, expected: undefined },
    { selected: 0, inserted: 0, expected: 1 },
    { selected: 1, inserted: 1, expected: 2 },
    { selected: 2, inserted: 1, expected: 3 },
    { selected: 1, inserted: 2, expected: 1 },
  ])(
    'maps selection $selected after inserting at $inserted to $expected',
    ({ selected, inserted, expected }) => {
      expect(resolveVtgBuilderSelectionAfterInsert(selected, inserted)).toBe(expected)
    },
  )
})
