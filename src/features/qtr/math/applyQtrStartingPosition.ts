import { Vector3 } from 'three'

import type { QtrBeat } from '@/features/qtr/types'
import { rootCompile } from '@/math/animation/AnimFunc'
import {
  deriveOrthogonalPosition,
  getInitialPlacement,
} from '@/math/animation/SpatialRelationshipFunc'
import type { RootDataFinal } from '@/types/AnimTypes'

export const applyQtrStartingPosition = (
  animation: RootDataFinal,
  beat: QtrBeat,
  swapProps = false,
): RootDataFinal | undefined => {
  if (animation.props.length !== 2) return undefined

  const compiled = rootCompile(animation)
  const beatIndex = beat - 1
  const firstSelectedBeat = compiled.props[0]?.anim[beatIndex]
  const secondSelectedBeat = compiled.props[1]?.anim[beatIndex]
  if (!firstSelectedBeat || !secondSelectedBeat) return undefined

  const quarterPropIndex = swapProps ? 1 : 0
  const targetPositions = [firstSelectedBeat, secondSelectedBeat].map((frame, propIndex) =>
    propIndex === quarterPropIndex
      ? deriveOrthogonalPosition(
          new Vector3().fromArray(frame.pos),
          new Vector3().fromArray(frame.posx),
        )
      : new Vector3().fromArray(frame.pos),
  )

  return {
    ...animation,
    props: animation.props.map((prop, propIndex) => {
      const firstFrame = prop.anim[0]
      const targetPosition = targetPositions[propIndex]
      if (!firstFrame || !targetPosition) return prop
      const placement = getInitialPlacement(targetPosition)

      return {
        ...prop,
        anim: [
          {
            ...firstFrame,
            ...placement,
          },
          ...prop.anim.slice(1),
        ],
      }
    }),
  }
}
