import { describe, expect, it } from 'vitest'

import {
  getVtgQuarterBottomPropStates,
  getVtgQuarterSidePropStates,
  vtgQuarterBottomFrameNumbers,
} from '@/features/vtg/math/createVtgQuarterHeaderDiagram'
import type { VtgRuleNumber } from '@/features/vtg/types'

const getStates = (
  row: VtgRuleNumber,
  options: {
    swapProps?: boolean
    reversePlane?: boolean
  } = {},
) =>
  getVtgQuarterSidePropStates({
    row,
    speedRatio: '1:3',
    swapProps: options.swapProps ?? false,
    reversePlane: options.reversePlane ?? false,
  })

describe('Quarters side-header prop states', () => {
  it.each([
    [
      1,
      [
        { position: 'top', facing: 'out' },
        { position: 'right', facing: 'out' },
      ],
    ],
    [
      2,
      [
        { position: 'top', facing: 'out' },
        { position: 'left', facing: 'out' },
      ],
    ],
    [
      3,
      [
        { position: 'top', facing: 'in' },
        { position: 'right', facing: 'in' },
      ],
    ],
    [
      4,
      [
        { position: 'top', facing: 'in' },
        { position: 'left', facing: 'in' },
      ],
    ],
    [
      5,
      [
        { position: 'top', facing: 'out' },
        { position: 'left', facing: 'in' },
      ],
    ],
    [
      6,
      [
        { position: 'top', facing: 'out' },
        { position: 'right', facing: 'in' },
      ],
    ],
  ] as const)('derives row %i from the first frame of its first cell', (row, expected) => {
    expect(getStates(row)).toEqual(expected)
  })

  it('recalculates from the active Swap and Reverse forms', () => {
    expect(getStates(5, { swapProps: true })).toEqual([
      { position: 'left', facing: 'in' },
      { position: 'top', facing: 'out' },
    ])
    expect(getStates(1, { reversePlane: true })).toEqual([
      { position: 'top', facing: 'out' },
      { position: 'left', facing: 'out' },
    ])
  })

  it('keeps rows 1/2 and 3/4 distinct when Swap is enabled', () => {
    expect(getStates(1, { swapProps: true })).toEqual([
      { position: 'right', facing: 'out' },
      { position: 'top', facing: 'out' },
    ])
    expect(getStates(2, { swapProps: true })).toEqual([
      { position: 'left', facing: 'out' },
      { position: 'top', facing: 'out' },
    ])
    expect(getStates(3, { swapProps: true })).toEqual([
      { position: 'right', facing: 'in' },
      { position: 'top', facing: 'in' },
    ])
    expect(getStates(4, { swapProps: true })).toEqual([
      { position: 'left', facing: 'in' },
      { position: 'top', facing: 'in' },
    ])
  })

  it('does not change when only Speed Ratio changes', () => {
    const baseOptions = {
      row: 6,
      swapProps: false,
      reversePlane: false,
    } as const

    expect(getVtgQuarterSidePropStates({ ...baseOptions, speedRatio: '1:1' })).toEqual(
      getVtgQuarterSidePropStates({ ...baseOptions, speedRatio: '1:5' }),
    )
  })
})

describe('Quarters bottom-header prop states', () => {
  it('uses the requested one-based row-6 frame for each column', () => {
    expect(vtgQuarterBottomFrameNumbers).toEqual({
      1: 4,
      2: 4,
      3: 4,
      4: 4,
      5: 2,
      6: 4,
    })
  })

  it.each([
    [
      1,
      [
        { position: 'left', facing: 'out' },
        { position: 'bottom', facing: 'out' },
      ],
    ],
    [
      2,
      [
        { position: 'left', facing: 'out' },
        { position: 'top', facing: 'out' },
      ],
    ],
    [
      3,
      [
        { position: 'left', facing: 'in' },
        { position: 'bottom', facing: 'in' },
      ],
    ],
    [
      4,
      [
        { position: 'left', facing: 'in' },
        { position: 'top', facing: 'in' },
      ],
    ],
    [
      5,
      [
        { position: 'right', facing: 'in' },
        { position: 'top', facing: 'out' },
      ],
    ],
    [
      6,
      [
        { position: 'left', facing: 'in' },
        { position: 'top', facing: 'out' },
      ],
    ],
  ] as const)('derives column %i from its configured row-6 frame', (column, expected) => {
    expect(
      getVtgQuarterBottomPropStates({
        column,
        speedRatio: '1:3',
        isAnti: false,
        swapProps: false,
        reversePlane: false,
      }),
    ).toEqual(expected)
  })

  it('recalculates special row-6 references when Anti changes', () => {
    const getColumnFive = (isAnti: boolean) =>
      getVtgQuarterBottomPropStates({
        column: 5,
        speedRatio: '1:3',
        isAnti,
        swapProps: false,
        reversePlane: false,
      })

    expect(getColumnFive(true)).not.toEqual(getColumnFive(false))
  })
})
