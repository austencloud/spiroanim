import { describe, expect, it } from 'vitest'

import { getVtgTopHeaderRule } from '@/features/vtg/data/vtgTopHeaderRules'

describe('getVtgTopHeaderRule', () => {
  it.each([
    ['1:1', [3, 4, 1, 2, 5, 6], true],
    ['1:2', [1, 2, 3, 4, 5, 6], false],
    ['1:3', [1, 2, 3, 4, 5, 6], true],
    ['1:4', [1, 2, 3, 4, 5, 6], false],
    ['1:5', [3, 4, 1, 2, 5, 6], true],
  ] as const)(
    'preserves the established %s top-header rule',
    (speedRatio, ruleNumbers, showDetails) => {
      expect(getVtgTopHeaderRule(speedRatio)).toEqual({ ruleNumbers, showDetails })
    },
  )

  it.each(['1:2v3', '1:3v2', '1:1v5'] as const)(
    'uses the detail-free standard top headers for undefined ratio %s',
    (speedRatio) => {
      expect(getVtgTopHeaderRule(speedRatio)).toEqual({
        ruleNumbers: [1, 2, 3, 4, 5, 6],
        showDetails: false,
      })
    },
  )
})
