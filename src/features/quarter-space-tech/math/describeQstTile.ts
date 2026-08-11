import type {
  QstPosition,
  QstPositionPair,
  QstSharedFill,
  QstTileDescription,
  QstTransitionCode,
} from '@/features/quarter-space-tech/types'

type FillChoices = readonly [
  QstSharedFill,
  QstSharedFill,
  QstSharedFill,
  QstSharedFill,
  QstSharedFill,
  QstSharedFill,
]

const commonFill = (
  next: QstPositionPair,
  roles: readonly [QstPosition, QstPosition, QstPosition, QstPosition, QstPosition],
  fills: FillChoices,
): QstSharedFill => {
  const [firstNext, secondNext] = next
  const [front, left, right, bottom, back] = roles
  const [straight, splitCross, rightSide, leftSide, rightCross, leftCross] = fills

  if (
    (firstNext === front && secondNext === front) ||
    (firstNext === front && secondNext === bottom) ||
    (firstNext === bottom && secondNext === front) ||
    (firstNext === left && secondNext === right) ||
    (firstNext === bottom && secondNext === bottom) ||
    (firstNext === back && secondNext === back) ||
    (firstNext === front && secondNext === back) ||
    (firstNext === bottom && secondNext === back) ||
    (firstNext === back && secondNext === front) ||
    (firstNext === back && secondNext === bottom)
  )
    return straight
  if (
    (firstNext === front || firstNext === right || firstNext === bottom || firstNext === back) &&
    secondNext === right
  )
    return rightSide
  if (
    firstNext === left &&
    (secondNext === front || secondNext === left || secondNext === bottom || secondNext === back)
  )
    return leftSide
  if (firstNext === right && secondNext === left) return splitCross
  if (firstNext === right && (secondNext === front || secondNext === bottom || secondNext === back))
    return rightCross
  if ((firstNext === front || firstNext === bottom || firstNext === back) && secondNext === left)
    return leftCross
  return straight
}

const centerFill = (
  next: QstPositionPair,
  roles: readonly [QstPosition, QstPosition, QstPosition, QstPosition, QstPosition],
  fills: readonly [
    QstSharedFill,
    QstSharedFill,
    QstSharedFill,
    QstSharedFill,
    QstSharedFill,
    QstSharedFill,
    QstSharedFill,
    QstSharedFill,
  ],
): QstSharedFill => {
  const [firstNext, secondNext] = next
  const [front, left, right, bottom, back] = roles
  const [
    straight,
    splitCross,
    rightSide,
    leftSide,
    rightCross,
    leftCross,
    horizontal1,
    horizontal2,
  ] = fills

  if (
    (firstNext === front && secondNext === front) ||
    (firstNext === front && secondNext === bottom) ||
    (firstNext === bottom && secondNext === front) ||
    (firstNext === left && secondNext === right) ||
    (firstNext === bottom && secondNext === bottom) ||
    (firstNext === back && secondNext === back) ||
    (firstNext === front && secondNext === back) ||
    (firstNext === bottom && secondNext === back) ||
    (firstNext === back && secondNext === front) ||
    (firstNext === back && secondNext === bottom)
  )
    return straight
  if ((firstNext === front && secondNext === right) || (firstNext === left && secondNext === back))
    return rightSide
  if ((firstNext === left && secondNext === front) || (firstNext === back && secondNext === right))
    return leftSide
  if (
    (firstNext === right && secondNext === right) ||
    (firstNext === bottom && secondNext === right) ||
    (firstNext === right && secondNext === bottom)
  )
    return horizontal1
  if (
    (firstNext === left && secondNext === left) ||
    (firstNext === left && secondNext === bottom) ||
    (firstNext === bottom && secondNext === left)
  )
    return horizontal2
  if (firstNext === right && secondNext === left) return splitCross
  if ((firstNext === right && secondNext === front) || (firstNext === back && secondNext === left))
    return rightCross
  if ((firstNext === front && secondNext === left) || (firstNext === right && secondNext === back))
    return leftCross
  return straight
}

export const describeQstTile = (
  current: QstPositionPair,
  next: QstPositionPair,
  transition: QstTransitionCode,
): QstTileDescription => {
  const [first, second] = current
  if (first !== second) return { current, transition }

  let sharedFill: QstSharedFill
  if (first === 'top') {
    sharedFill = commonFill(
      next,
      ['front', 'left', 'right', 'bottom', 'back'],
      [
        'first-left',
        'second-left',
        'first-bottom-left',
        'first-top-left',
        'second-bottom-left',
        'second-top-left',
      ],
    )
  } else if (first === 'left') {
    sharedFill = commonFill(
      next,
      ['front', 'bottom', 'top', 'right', 'back'],
      [
        'second-top',
        'first-top',
        'second-top-left',
        'first-bottom-left',
        'first-top-left',
        'second-bottom-left',
      ],
    )
  } else if (first === 'right') {
    sharedFill = commonFill(
      next,
      ['front', 'top', 'bottom', 'left', 'back'],
      [
        'first-top',
        'second-top',
        'first-top-left',
        'second-bottom-left',
        'second-top-left',
        'first-bottom-left',
      ],
    )
  } else if (first === 'bottom') {
    sharedFill = commonFill(
      next,
      ['front', 'left', 'right', 'top', 'back'],
      [
        'first-left',
        'second-left',
        'first-top-left',
        'first-bottom-left',
        'second-top-left',
        'second-bottom-left',
      ],
    )
  } else if (first === 'front') {
    sharedFill = centerFill(
      next,
      ['bottom', 'left', 'right', 'back', 'top'],
      [
        'first-left',
        'second-left',
        'first-bottom-left',
        'first-top-left',
        'second-bottom-left',
        'second-top-left',
        'second-top',
        'first-top',
      ],
    )
  } else {
    // Front and Back share the center tile, but Back uses the hollow-center treatment in the view.
    sharedFill = centerFill(
      next,
      ['top', 'left', 'right', 'front', 'bottom'],
      [
        'first-left',
        'second-left',
        'first-top-left',
        'first-bottom-left',
        'second-top-left',
        'second-bottom-left',
        'second-top',
        'first-top',
      ],
    )
  }

  return { current, sharedFill, transition }
}
