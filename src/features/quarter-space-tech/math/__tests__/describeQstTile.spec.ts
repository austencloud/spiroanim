import { describe, expect, it } from 'vitest'

import { describeQstTransition } from '@/features/quarter-space-tech/math/analyzeQstAnimation'
import { describeQstTile } from '@/features/quarter-space-tech/math/describeQstTile'

describe('QST diagram descriptions', () => {
  it('classifies relation changes and quarter movement abbreviations', () => {
    expect(describeQstTransition(['top', 'top'], ['left', 'right'])).toBe('TS')
    expect(describeQstTransition(['left', 'right'], ['front', 'front'])).toBe('ST')
    expect(describeQstTransition(['top', 'left'], ['left', 'bottom'])).toBe('F')
    expect(describeQstTransition(['top', 'front'], ['right', 'bottom'])).toBe('OB')
  })

  it('keeps Front and Back on the center tile and orients shared fills from the next beat', () => {
    expect(describeQstTile(['front', 'front'], ['right', 'right'], 'TT')).toMatchObject({
      current: ['front', 'front'],
      sharedFill: 'second-top',
    })
    expect(describeQstTile(['back', 'back'], ['left', 'right'], 'TS')).toMatchObject({
      current: ['back', 'back'],
      sharedFill: 'first-left',
    })
  })
})
