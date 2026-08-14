import { rootCompile } from '@/math/animation/AnimFunc'
import type { RootDataFinal } from '@/types/AnimTypes'
import type { VtgSpeedRatio } from '@/features/vtg/types'
import { vtgSpeedRatios } from '@/features/vtg/types'

const normalFrameCount = 5
const doubledFrameCount = 9

const ratioByContinuationTurns: ReadonlyMap<number, VtgSpeedRatio> = new Map(
  vtgSpeedRatios.flatMap((speedRatio) => {
    const denominator = Number(speedRatio.slice(2))
    return [
      [-90 * (denominator + 1), speedRatio],
      [90 * (denominator - 1), speedRatio],
    ] as const
  }),
)

/** Infers the generated VTG ratio from normal or doubled effective continuation turns. */
export const inferVtgSpeedRatio = (animation: RootDataFinal): VtgSpeedRatio | undefined => {
  const frameCount = animation.props[0]?.anim.length
  if (
    (frameCount !== normalFrameCount && frameCount !== doubledFrameCount) ||
    animation.props.length !== 2 ||
    animation.props.some((prop) => prop.anim.length !== frameCount)
  ) {
    return undefined
  }

  const playbackMultiplier = frameCount === doubledFrameCount ? 2 : 1
  const compiled = rootCompile(animation)
  let inferredRatio: VtgSpeedRatio | undefined

  for (const prop of compiled.props) {
    for (const frame of prop.anim.slice(1)) {
      const ratio = ratioByContinuationTurns.get(frame.turns * playbackMultiplier)
      if (ratio === undefined || (inferredRatio !== undefined && ratio !== inferredRatio)) {
        return undefined
      }
      inferredRatio = ratio
    }
  }

  return inferredRatio
}
