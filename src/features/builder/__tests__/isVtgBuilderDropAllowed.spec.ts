import { describe, expect, it } from 'vitest'

import { isVtgBuilderDropAllowed } from '@/features/builder/isVtgBuilderDropAllowed'

describe('isVtgBuilderDropAllowed', () => {
  it.each([
    { portions: 0, selected: undefined, target: 0, fullGrid: false, expected: true },
    { portions: 0, selected: undefined, target: 1, fullGrid: true, expected: false },
    { portions: 3, selected: undefined, target: 0, fullGrid: false, expected: false },
    { portions: 3, selected: undefined, target: 1, fullGrid: false, expected: true },
    { portions: 3, selected: undefined, target: 0, fullGrid: true, expected: true },
    { portions: 3, selected: 0, target: 0, fullGrid: true, expected: true },
    { portions: 3, selected: 0, target: 1, fullGrid: true, expected: false },
    { portions: 3, selected: 1, target: 0, fullGrid: true, expected: false },
    { portions: 3, selected: 1, target: 1, fullGrid: true, expected: true },
    { portions: 3, selected: 1, target: 2, fullGrid: true, expected: false },
    { portions: 3, selected: 3, target: 2, fullGrid: true, expected: false },
    { portions: 3, selected: 3, target: 3, fullGrid: true, expected: true },
  ])(
    'returns $expected for $portions portions, selection $selected, and target $target',
    ({ portions, selected, target, fullGrid, expected }) => {
      expect(
        isVtgBuilderDropAllowed({
          portionCount: portions,
          selectedIndex: selected,
          targetIndex: target,
          allowFirstDrop: fullGrid,
        }),
      ).toBe(expected)
    },
  )
})
