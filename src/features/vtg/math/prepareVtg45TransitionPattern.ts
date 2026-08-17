import { rootCompile } from '@/math/animation/AnimFunc'
import { doubleAnimationPlayback } from '@/math/animation/subdivideAnimationPlayback'
import type { AnimDataCompiled, RootDataFinal } from '@/types/AnimTypes'

const continuationFrameIndex = 1
const undoubledArc = 90
const supportedArc = 45
const supportedPropCount = 2

export interface PreparedVtg45TransitionPattern {
  pattern: RootDataFinal
  supported: boolean
}

const clonePattern = (pattern: RootDataFinal): RootDataFinal => ({
  ...pattern,
  props: pattern.props.map((prop) => ({
    ...prop,
    anim: prop.anim.map((frame) => ({ ...frame })),
    motion: prop.motion.map((frame) => ({ ...frame })),
  })),
  camera: pattern.camera.map((frame) => ({
    ...frame,
    orbit: frame.orbit === undefined ? undefined : { ...frame.orbit },
    center: frame.center === undefined ? undefined : { ...frame.center },
  })),
})

const hasContinuationArc = (frames: readonly AnimDataCompiled[], arc: number): boolean =>
  frames.length > continuationFrameIndex &&
  frames.slice(continuationFrameIndex).every((frame) => frame.arc === arc)

const hasAlignedFrames = (pattern: RootDataFinal): boolean => {
  const [firstProp, secondProp] = pattern.props
  if (!firstProp || !secondProp || firstProp.anim.length !== secondProp.anim.length) return false

  const compiled = rootCompile(pattern)
  const [firstCompiledProp, secondCompiledProp] = compiled.props
  if (!firstCompiledProp || !secondCompiledProp) return false

  return firstCompiledProp.anim.every(
    (frame, frameIndex) => frame.beats === secondCompiledProp.anim[frameIndex]?.beats,
  )
}

/** Creates the private working pattern used to determine 45 Trans support. */
export const prepareVtg45TransitionPattern = (
  source: RootDataFinal,
): PreparedVtg45TransitionPattern => {
  const copy = clonePattern(source)
  const compiledCopy = rootCompile(copy)
  const shouldDouble =
    copy.props.length === supportedPropCount &&
    compiledCopy.props.every((prop) => hasContinuationArc(prop.anim, undoubledArc))
  const pattern = shouldDouble ? (doubleAnimationPlayback(copy) ?? copy) : copy
  const compiledPattern = rootCompile(pattern)
  const supported =
    pattern.props.length === supportedPropCount &&
    compiledPattern.props.every((prop) => hasContinuationArc(prop.anim, supportedArc)) &&
    hasAlignedFrames(pattern)

  return { pattern, supported }
}
