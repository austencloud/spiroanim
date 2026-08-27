import {
  applyVtgPlaybackControls,
  createDefaultVtgAnimation,
} from '@/features/vtg/createVtgAnimation'
import { getVtgScaleControlValue } from '@/features/vtg/data/vtgPlayerSettings'
import {
  createVtgAnimationSignature,
  createCompiledVtgPatternSignature,
  createVtgDirectionSignature,
  getVtgAnimationScale,
  getVtgPropRotationOffsets,
  getVtgStartingTurns,
} from '@/features/vtg/math/createVtgAnimationSignature'
import { inferVtgTiming } from '@/features/vtg/math/inferVtgSpeedRatio'
import type {
  VtgCellReference,
  VtgBeat,
  VtgPatternMatch,
  VtgPatternMatchPreferences,
  VtgPatternRotationFilter,
  VtgPatternSelection,
  VtgRuleNumber,
  VtgSpeedRatio,
} from '@/features/vtg/types'
import {
  formatVtgSpeedRatio,
  getVtgBeats,
  getVtgPropSpeedRatios,
  getVtgTimingCycleCount,
  vtgDefaultBeat,
} from '@/features/vtg/types'
import { applyPatternFinalTransforms } from '@/features/concepts/applyPatternFinalTransforms'
import {
  doubleAnimationPlayback,
  doublePlaybackMultiplier,
} from '@/math/animation/subdivideAnimationPlayback'
import { analyzeAlternatingPatternPlaybacks } from '@/math/animation/alternatePatternPlayback'
import { rootCompile } from '@/math/animation/AnimFunc'
import type { RootDataFinal } from '@/types/AnimTypes'

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const satisfies readonly VtgRuleNumber[]
const booleanOptions = [false, true] as const
const spinToggleCells: ReadonlySet<VtgCellReference> = new Set(['5-6', '6-6', '5-5', '6-5'])
type Candidate = Omit<VtgPatternMatch, 'bpm' | 'scale' | 'orientation'> & {
  baseOrientation: number
  startingTurns: readonly [number, number]
}
type OrientedCandidateState = {
  animation: RootDataFinal
  signatureKey: string
}

const startingTurnsDifferenceByMatch = new WeakMap<VtgPatternMatch, number>()
const orientedSignatureDifferenceByMatch = new WeakMap<VtgPatternMatch, number>()
const exactRegenerationDifferenceByMatch = new WeakMap<VtgPatternMatch, number>()
const orientedStateByCandidate = new WeakMap<Candidate, Map<number, OrientedCandidateState>>()

const inheritMatchRankings = (source: VtgPatternMatch, target: VtgPatternMatch) => {
  const startingTurnsDifference = startingTurnsDifferenceByMatch.get(source)
  if (startingTurnsDifference !== undefined) {
    startingTurnsDifferenceByMatch.set(target, startingTurnsDifference)
  }
  const orientedSignatureDifference = orientedSignatureDifferenceByMatch.get(source)
  if (orientedSignatureDifference !== undefined) {
    orientedSignatureDifferenceByMatch.set(target, orientedSignatureDifference)
  }
  const exactRegenerationDifference = exactRegenerationDifferenceByMatch.get(source)
  if (exactRegenerationDifference !== undefined) {
    exactRegenerationDifferenceByMatch.set(target, exactRegenerationDifference)
  }
  return target
}

const candidateIndexes = new Map<
  VtgSpeedRatio,
  Map<VtgBeat, ReadonlyMap<string, readonly Candidate[]>>
>()
const normalizeOrientation = (value: number) => {
  let normalized = ((((value + 180) % 360) + 360) % 360) - 180
  const nearestWholeDegree = Math.round(normalized)
  if (Math.abs(normalized - nearestWholeDegree) <= 1e-6) normalized = nearestWholeDegree
  return normalized === -180 ? 180 : normalized
}
// Three.js composition can leave harmless vector components around 1e-8. Keep matcher ranking
// aligned with the compiler-level semantic comparison used by the exhaustive detection audit.
const applyCandidatePropRotationOffsets = (
  animation: RootDataFinal,
  offsets: readonly [number, number],
): RootDataFinal => ({
  ...animation,
  props: animation.props.map((prop, index) => {
    const firstFrame = prop.anim[0]
    const offset = offsets[index] ?? 0
    return !firstFrame || offset === 0
      ? prop
      : {
          ...prop,
          anim: [{ ...firstFrame, turns: (firstFrame.turns ?? 0) + offset }, ...prop.anim.slice(1)],
        }
  }),
})
const createCellReference = (row: VtgRuleNumber, column: VtgRuleNumber): VtgCellReference =>
  `${row}-${column}`

const getCandidateRatios = (speedRatio: VtgSpeedRatio): readonly VtgSpeedRatio[] => {
  const [left, right] = getVtgPropSpeedRatios(speedRatio)
  if (left === right) return [speedRatio]
  return [speedRatio, formatVtgSpeedRatio(right, left)]
}

const getOrientedCandidateState = (
  candidate: Candidate,
  orientation: number,
): OrientedCandidateState | undefined => {
  const cachedByOrientation = orientedStateByCandidate.get(candidate) ?? new Map()
  orientedStateByCandidate.set(candidate, cachedByOrientation)
  const cached = cachedByOrientation.get(orientation)
  if (cached) return cached

  const animation = createDefaultVtgAnimation({
    reference: candidate.reference,
    speedRatio: candidate.speedRatio,
    isAnti: candidate.isAnti,
    swapProps: candidate.swapProps,
    reversePlane: candidate.reversePlane,
    beat: candidate.beat,
    orientation,
  })
  if (!animation) return undefined
  const signature = createVtgDirectionSignature(animation)
  if (!signature) return undefined
  const state = { animation, signatureKey: signature.key }
  cachedByOrientation.set(orientation, state)
  return state
}

const buildCandidateIndex = (speedRatio: VtgSpeedRatio, beat: VtgBeat) => {
  const index = new Map<string, Candidate[]>()
  for (const candidateRatio of getCandidateRatios(speedRatio)) {
    if (!getVtgBeats(candidateRatio).includes(beat)) continue
    for (const column of ruleNumbers) {
      for (const row of ruleNumbers) {
        const reference = createCellReference(row, column)
        const antiOptions = spinToggleCells.has(reference) ? booleanOptions : ([false] as const)
        for (const isAnti of antiOptions) {
          const base = createDefaultVtgAnimation({
            reference,
            speedRatio: candidateRatio,
            isAnti,
            orientation: 0,
          })
          if (!base) continue
          const playback = applyVtgPlaybackControls(base, { speedRatio: candidateRatio, beat })
          if (!playback) continue
          for (const swapProps of booleanOptions) {
            for (const reversePlane of booleanOptions) {
              const transformed = applyPatternFinalTransforms(playback, {
                swapProps,
                reversePlane,
              })
              if (inferVtgTiming(transformed)?.speedRatio !== speedRatio) continue
              const signature = createVtgDirectionSignature(transformed)
              const startingTurns = getVtgStartingTurns(transformed)
              if (!signature || !startingTurns) continue
              const candidates = index.get(signature.key) ?? []
              candidates.push({
                reference,
                speedRatio: candidateRatio,
                isAnti,
                swapProps,
                reversePlane,
                ...(beat === vtgDefaultBeat ? undefined : { beat }),
                baseOrientation: signature.orientation,
                startingTurns,
              })
              index.set(signature.key, candidates)
            }
          }
        }
      }
    }
  }
  const speedRatioIndexes = candidateIndexes.get(speedRatio) ?? new Map()
  speedRatioIndexes.set(beat, index)
  candidateIndexes.set(speedRatio, speedRatioIndexes)
  return index
}

const findCandidates = (speedRatio: VtgSpeedRatio, signature: string) => {
  const matches: Candidate[] = []
  for (const beat of getVtgBeats(speedRatio)) {
    const index =
      candidateIndexes.get(speedRatio)?.get(beat) ?? buildCandidateIndex(speedRatio, beat)
    const beatMatches = index.get(signature) ?? []
    matches.push(...beatMatches)
  }
  return matches
}

const findBaseMatches = (
  animation: RootDataFinal,
  rotationFilter?: VtgPatternRotationFilter,
): readonly VtgPatternMatch[] => {
  const timing = inferVtgTiming(animation)
  const signature = createVtgDirectionSignature(animation)
  const startingTurns = getVtgStartingTurns(animation)
  const adjustedScale = getVtgAnimationScale(animation)
  if (!timing || !signature || !startingTurns || adjustedScale === undefined) return []
  const exactAnimationSignature = createCompiledVtgPatternSignature(animation)

  const candidates = findCandidates(timing.speedRatio, signature.key)
  const scale = getVtgScaleControlValue(adjustedScale, timing.speedRatio)
  return candidates.flatMap((candidate) => {
    const orientationDifference = signature.orientation - candidate.baseOrientation
    // Orientation is applied before the final 180 transform. Reversing the initial motion plane
    // mirrors the observed positional delta, so recover the authored orientation with its sign
    // restored before regenerating the candidate.
    const orientation = normalizeOrientation(
      candidate.reversePlane ? -orientationDifference : orientationDifference,
    )
    if (
      (rotationFilter === 'unrotated' && orientation !== 0) ||
      (rotationFilter === 'rotated' && orientation === 0)
    )
      return []
    const {
      baseOrientation: _baseOrientation,
      startingTurns: canonicalStartingTurns,
      ...match
    } = candidate
    const orientedState = getOrientedCandidateState(candidate, orientation)
    if (!orientedState) return []
    const propRotationOffsets = getVtgPropRotationOffsets(animation, orientedState.animation)
    if (!propRotationOffsets) return []
    const propRotationOffsetDifference = propRotationOffsets.reduce(
      (total, offset) => total + Math.abs(offset),
      0,
    )
    const turnsDifference = canonicalStartingTurns.reduce(
      (total, turns, index) => total + Math.abs(startingTurns[index]! - turns),
      0,
    )
    const result: VtgPatternMatch = {
      ...match,
      ...(orientation === 0 ? undefined : { orientation }),
      ...(propRotationOffsetDifference === 0 ? undefined : { propRotationOffsets }),
      bpm: animation.bpm / doublePlaybackMultiplier,
      scale,
    }
    startingTurnsDifferenceByMatch.set(result, turnsDifference)
    orientedSignatureDifferenceByMatch.set(
      result,
      Number(orientedState.signatureKey !== signature.key),
    )
    const alignedCandidate = applyCandidatePropRotationOffsets(
      orientedState.animation,
      propRotationOffsets,
    )
    exactRegenerationDifferenceByMatch.set(
      result,
      Number(createCompiledVtgPatternSignature(alignedCandidate) !== exactAnimationSignature),
    )
    return [result]
  })
}

const findAtPlaybackResolution = (
  animation: RootDataFinal,
  rotationFilter?: VtgPatternRotationFilter,
): readonly VtgPatternMatch[] => {
  const alternating = analyzeAlternatingPatternPlaybacks(animation)
  if (alternating.length === 0) return findBaseMatches(animation, rotationFilter)
  return alternating.flatMap((analysis) =>
    findBaseMatches(analysis.base, rotationFilter)
      .filter(
        (match) =>
          getVtgTimingCycleCount(match.speedRatio) ===
          ((analysis.base.props[0]?.anim.length ?? 1) - 1) / 8,
      )
      .map((match) => {
        const transitionMatch: VtgPatternMatch = {
          ...match,
          transition: true,
          transitionBeats: analysis.transitionBeats,
          ...(analysis.transitionAfterBeat ? { transitionAfterBeat: true } : undefined),
          ...(analysis.transitionQuad ? { transitionQuad: true } : undefined),
          ...(analysis.transitionSecond ? { transitionSecond: true } : undefined),
        }
        return inheritMatchRankings(match, transitionMatch)
      }),
  )
}

const vtgIntervalsPerTimingCycle = 8

const needsCanonicalPlaybackSubdivision = (animation: RootDataFinal): boolean => {
  const firstProp = animation.props[0]
  if (!firstProp || animation.props.some((prop) => prop.anim.length !== firstProp.anim.length)) {
    return false
  }

  const intervalCount = firstProp.anim.length - 1
  const timing = inferVtgTiming(animation)
  if (!timing || intervalCount <= 0) return false

  const canonicalIntervalCount =
    getVtgTimingCycleCount(timing.speedRatio) * vtgIntervalsPerTimingCycle
  const requiredMultiplier = canonicalIntervalCount / intervalCount
  return (
    Number.isInteger(requiredMultiplier) &&
    requiredMultiplier >= doublePlaybackMultiplier &&
    (requiredMultiplier & (requiredMultiplier - 1)) === 0
  )
}

/**
 * VTG patterns have a canonical frame grid, but equivalent authored playback may have been
 * consolidated by Editor Halve. Retry through the shared playback subdivision so matching does
 * not depend on which compatible frame resolution the user supplied.
 */
const findInternal = (
  animation: RootDataFinal,
  rotationFilter?: VtgPatternRotationFilter,
): readonly VtgPatternMatch[] => {
  let normalized = animation
  while (true) {
    const matches = findAtPlaybackResolution(normalized, rotationFilter)
    if (matches.length > 0) return matches
    if (!needsCanonicalPlaybackSubdivision(normalized)) break

    const doubled = doubleAnimationPlayback(normalized)
    if (!doubled) break
    normalized = doubled
  }
  return []
}

export const findVtgPatternMatches = (
  animation: RootDataFinal,
  rotationFilter?: VtgPatternRotationFilter,
): readonly VtgPatternMatch[] => findInternal(animation, rotationFilter)

const preferenceDifferenceCount = (
  match: VtgPatternMatch,
  preferences: VtgPatternMatchPreferences,
) =>
  Number(match.swapProps !== preferences.swapProps) +
  Number(match.reversePlane !== preferences.reversePlane)

export const findVtgPatternMatch = (
  animation: RootDataFinal,
  preferences?: VtgPatternMatchPreferences,
  rotationFilter?: VtgPatternRotationFilter,
): VtgPatternMatch | undefined =>
  [...findInternal(animation, rotationFilter)].sort((first, second) => {
    const exactRegenerationDifference =
      (exactRegenerationDifferenceByMatch.get(first) ?? 0) -
      (exactRegenerationDifferenceByMatch.get(second) ?? 0)
    if (exactRegenerationDifference) return exactRegenerationDifference

    // When multiple candidates reproduce the complete animation exactly, exhaust the unrotated
    // interpretations before allowing orientation to select an equivalent cell at another beat.
    const rotationDifference =
      Number((first.orientation ?? 0) !== 0) - Number((second.orientation ?? 0) !== 0)
    if (rotationDifference) return rotationDifference

    const propRotationOffsetDifference =
      Number(first.propRotationOffsets !== undefined) -
      Number(second.propRotationOffsets !== undefined)
    if (propRotationOffsetDifference) return propRotationOffsetDifference

    const orientedSignatureDifference =
      (orientedSignatureDifferenceByMatch.get(first) ?? 0) -
      (orientedSignatureDifferenceByMatch.get(second) ?? 0)
    if (orientedSignatureDifference) return orientedSignatureDifference

    // Several table cells are geometrically identical after Swap/180. Prefer the interpretation
    // that belongs to the table directly before using retained UI preferences as a tie-breaker.
    const transformDifference =
      Number(first.swapProps) +
      Number(first.reversePlane) -
      Number(second.swapProps) -
      Number(second.reversePlane)
    if (transformDifference !== 0) return transformDifference

    const preferenceDifference = preferences
      ? preferenceDifferenceCount(first, preferences) -
        preferenceDifferenceCount(second, preferences)
      : 0
    if (preferenceDifference) return preferenceDifference

    const startingTurnsDifference =
      (startingTurnsDifferenceByMatch.get(first) ?? 0) -
      (startingTurnsDifferenceByMatch.get(second) ?? 0)
    if (startingTurnsDifference) return startingTurnsDifference

    return (first.beat ?? vtgDefaultBeat) - (second.beat ?? vtgDefaultBeat)
  })[0]

export const matchesVtgSelection = (
  animation: RootDataFinal,
  selection: VtgPatternSelection,
): boolean => {
  const candidate = createDefaultVtgAnimation(selection)
  return (
    candidate !== undefined &&
    createVtgAnimationSignature(animation) === createVtgAnimationSignature(candidate)
  )
}

export const exactlyMatchesVtgSelection = (
  animation: RootDataFinal,
  selection: VtgPatternSelection,
): boolean => {
  const candidate = createDefaultVtgAnimation(selection)
  return (
    candidate !== undefined &&
    createCompiledVtgPatternSignature(animation) === createCompiledVtgPatternSignature(candidate)
  )
}
