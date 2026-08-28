import {
  createCompiledVtgPatternSignature,
  createCompiledVtgPatternSignatureFromCompiled,
  createVtgAnimationSignature,
  createVtgDirectionSignature,
  createVtgDirectionSignatureFromCompiled,
  getVtgAnimationScale,
  getVtgPropRotationOffsetsFromCompiled,
  type CompiledVtgAnimation,
} from '@/features/vtg/math/createVtgAnimationSignature'
import { getVtgScaleControlValue } from '@/features/vtg/data/vtgPlayerSettings'
import {
  inferVtgTiming,
  inferVtgTimingFromCompiled,
} from '@/features/vtg/math/inferVtgSpeedRatio'
import type {
  VtgBeat,
  VtgCellReference,
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
  vtgTransitionInitialTurnsOffsets,
} from '@/features/vtg/types'
import {
  doubleAnimationPlayback,
  doublePlaybackMultiplier,
} from '@/math/animation/subdivideAnimationPlayback'
import { analyzeAlternatingPatternPlaybacks } from '@/math/animation/alternatePatternPlayback'
import { applyPatternFinalTransforms } from '@/features/concepts/applyPatternFinalTransforms'
import { applyVtgPlaybackControls } from '@/features/vtg/createVtgAnimation'
import { rootCompile } from '@/math/animation/AnimFunc'
import type { RootDataFinal } from '@/types/AnimTypes'

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const satisfies readonly VtgRuleNumber[]
const booleanOptions = [false, true] as const
const spinToggleCells: ReadonlySet<VtgCellReference> = new Set(['5-6', '6-6', '5-5', '6-5'])
const vtgIntervalsPerTimingCycle = 8

interface CatalogCandidate {
  reference: VtgCellReference
  speedRatio: VtgSpeedRatio
  isAnti: boolean
  swapProps: boolean
  reversePlane: boolean
  beat?: VtgBeat
  baseOrientation: number
  baseState: OrientedCandidate
}

interface RankedMatch<Match extends VtgPatternMatch> {
  match: Match
  exactDifference: number
  orientedSignatureDifference: number
}

interface OrientedCandidate {
  animation: RootDataFinal
  compiled: CompiledVtgAnimation
  directionSignature: string | undefined
  exactSignature?: string
}

export interface VtgCatalogMatchResolution<Match extends VtgPatternMatch> {
  match: Match
  exact: boolean
}

interface VtgCatalogMatcherAdapter<
  Selection extends VtgPatternSelection,
  Match extends VtgPatternMatch,
> {
  createDefaultAnimation: (selection: Selection) => RootDataFinal | undefined
  createCatalogBaseAnimation: (selection: Selection) => RootDataFinal | undefined
  toSelection: (selection: VtgPatternSelection) => Selection
  toMatch: (match: VtgPatternMatch) => Match
}

const normalizeOrientation = (value: number) => {
  let normalized = ((((value + 180) % 360) + 360) % 360) - 180
  const nearestWholeDegree = Math.round(normalized)
  if (Math.abs(normalized - nearestWholeDegree) <= 1e-6) normalized = nearestWholeDegree
  return normalized === -180 ? 180 : normalized
}

const createCellReference = (row: VtgRuleNumber, column: VtgRuleNumber): VtgCellReference =>
  `${row}-${column}`

const getCandidateRatios = (speedRatio: VtgSpeedRatio): readonly VtgSpeedRatio[] => {
  const [left, right] = getVtgPropSpeedRatios(speedRatio)
  if (left === right) return [speedRatio]
  return [speedRatio, formatVtgSpeedRatio(right, left)]
}

const preferenceDifferenceCount = (
  match: VtgPatternMatch,
  preferences: VtgPatternMatchPreferences,
) =>
  Number(match.swapProps !== preferences.swapProps) +
  Number(match.reversePlane !== preferences.reversePlane)

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

const applyPropRotationOffsets = (
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
          anim: [
            { ...firstFrame, turns: (firstFrame.turns ?? 0) + offset },
            ...prop.anim.slice(1),
          ],
        }
  }),
})

export const createVtgCatalogMatcher = <
  Selection extends VtgPatternSelection,
  Match extends VtgPatternMatch,
>({
  createDefaultAnimation,
  createCatalogBaseAnimation,
  toSelection,
  toMatch,
}: VtgCatalogMatcherAdapter<Selection, Match>) => {
  const candidateIndexes = new Map<
    VtgSpeedRatio,
    Map<VtgBeat, ReadonlyMap<string, readonly CatalogCandidate[]>>
  >()
  const catalogBases = new Map<string, RootDataFinal | undefined>()
  const catalogPlaybacks = new Map<string, RootDataFinal | undefined>()
  const orientedAnimations = new WeakMap<CatalogCandidate, Map<number, OrientedCandidate>>()

  const createSelection = (
    candidate: CatalogCandidate,
    orientation: number,
    initialTurnsOffset?: VtgPatternSelection['initialTurnsOffset'],
    propRotationOffsets?: readonly [number, number],
  ): Selection =>
    toSelection({
      reference: candidate.reference,
      speedRatio: candidate.speedRatio,
      isAnti: candidate.isAnti,
      swapProps: candidate.swapProps,
      reversePlane: candidate.reversePlane,
      ...(candidate.beat === undefined ? undefined : { beat: candidate.beat }),
      ...(orientation === 0 ? undefined : { orientation }),
      ...(initialTurnsOffset === undefined ? undefined : { initialTurnsOffset }),
      ...(propRotationOffsets === undefined ? undefined : { propRotationOffsets }),
    })

  const getOrientedAnimation = (candidate: CatalogCandidate, orientation: number) => {
    if (orientation === 0) return candidate.baseState

    const cachedByOrientation =
      orientedAnimations.get(candidate) ?? new Map<number, OrientedCandidate>()
    orientedAnimations.set(candidate, cachedByOrientation)
    const cached = cachedByOrientation.get(orientation)
    if (cached) return cached

    const animation = createDefaultAnimation(createSelection(candidate, orientation))
    if (!animation) return undefined
    const compiled = rootCompile(animation)
    const state: OrientedCandidate = {
      animation,
      compiled,
      directionSignature: createVtgDirectionSignatureFromCompiled(animation, compiled)?.key,
    }
    cachedByOrientation.set(orientation, state)
    return state
  }

  const getCatalogPlayback = (
    reference: VtgCellReference,
    speedRatio: VtgSpeedRatio,
    isAnti: boolean,
    beat: VtgBeat,
  ) => {
    const baseKey = `${reference}:${speedRatio}:${Number(isAnti)}`
    let base = catalogBases.get(baseKey)
    if (!catalogBases.has(baseKey)) {
      base = createCatalogBaseAnimation(
        toSelection({
          reference,
          speedRatio,
          isAnti,
          swapProps: false,
          reversePlane: false,
        }),
      )
      catalogBases.set(baseKey, base)
    }

    const playbackKey = `${baseKey}:${beat}`
    let playback = catalogPlaybacks.get(playbackKey)
    if (!catalogPlaybacks.has(playbackKey)) {
      playback = base ? applyVtgPlaybackControls(base, { speedRatio, beat }) : undefined
      catalogPlaybacks.set(playbackKey, playback)
    }
    return playback
  }

  const buildCandidateIndex = (speedRatio: VtgSpeedRatio, beat: VtgBeat) => {
    const index = new Map<string, CatalogCandidate[]>()
    for (const candidateRatio of getCandidateRatios(speedRatio)) {
      if (!getVtgBeats(candidateRatio).includes(beat)) continue
      for (const column of ruleNumbers) {
        for (const row of ruleNumbers) {
          const reference = createCellReference(row, column)
          const antiOptions = spinToggleCells.has(reference) ? booleanOptions : ([false] as const)
          for (const isAnti of antiOptions) {
            const playback = getCatalogPlayback(reference, candidateRatio, isAnti, beat)
            if (!playback) continue

            for (const reversePlane of booleanOptions) {
              for (const swapProps of booleanOptions) {
                const animation = applyPatternFinalTransforms(playback, {
                  swapProps,
                  reversePlane,
                })
                const compiled = rootCompile(animation)
                if (inferVtgTimingFromCompiled(animation, compiled)?.speedRatio !== speedRatio) {
                  continue
                }
                const signature = createVtgDirectionSignatureFromCompiled(animation, compiled)
                if (!signature) continue
                const baseState: OrientedCandidate = {
                  animation,
                  compiled,
                  directionSignature: signature.key,
                }

                const candidates = index.get(signature.key) ?? []
                candidates.push({
                  reference,
                  speedRatio: candidateRatio,
                  isAnti,
                  swapProps,
                  reversePlane,
                  ...(beat === vtgDefaultBeat ? undefined : { beat }),
                  baseOrientation: signature.orientation,
                  baseState,
                })
                index.set(signature.key, candidates)
              }
            }
          }
        }
      }
    }

    const indexes = candidateIndexes.get(speedRatio) ?? new Map()
    indexes.set(beat, index)
    candidateIndexes.set(speedRatio, indexes)
    return index
  }

  const findCandidates = (speedRatio: VtgSpeedRatio, signature: string) =>
    getVtgBeats(speedRatio).flatMap((beat) => {
      const index =
        candidateIndexes.get(speedRatio)?.get(beat) ?? buildCandidateIndex(speedRatio, beat)
      return index.get(signature) ?? []
    })

  const createRankedMatch = (
    animation: RootDataFinal,
    compiledAnimation: CompiledVtgAnimation,
    exactAnimationSignature: string | undefined,
    inputSignature: NonNullable<ReturnType<typeof createVtgDirectionSignature>>,
    scale: number,
    candidate: CatalogCandidate,
    orientation: number,
    calculateExact: boolean,
    initialTurnsOffset?: VtgPatternSelection['initialTurnsOffset'],
  ): RankedMatch<Match> | undefined => {
    const orientedState: OrientedCandidate | undefined =
      initialTurnsOffset === undefined
        ? getOrientedAnimation(candidate, orientation)
        : (() => {
            const animation = createDefaultAnimation(
              createSelection(candidate, orientation, initialTurnsOffset),
            )
            if (!animation) return undefined
            const compiled = rootCompile(animation)
            return {
              animation,
              compiled,
              directionSignature: createVtgDirectionSignatureFromCompiled(animation, compiled)?.key,
            }
          })()
    if (!orientedState) return undefined

    const propRotationOffsets = getVtgPropRotationOffsetsFromCompiled(
      animation,
      orientedState.animation,
      compiledAnimation,
      orientedState.compiled,
    )
    if (!propRotationOffsets) return undefined
    const hasPropRotationOffsets = propRotationOffsets.some((offset) => offset !== 0)
    const regeneratedSignature = calculateExact
      ? hasPropRotationOffsets
        ? createCompiledVtgPatternSignature(
            applyPropRotationOffsets(orientedState.animation, propRotationOffsets),
          )
        : (orientedState.exactSignature ??=
            createCompiledVtgPatternSignatureFromCompiled(orientedState.compiled))
      : undefined
    const match = toMatch({
      reference: candidate.reference,
      speedRatio: candidate.speedRatio,
      isAnti: candidate.isAnti,
      swapProps: candidate.swapProps,
      reversePlane: candidate.reversePlane,
      ...(candidate.beat === undefined ? undefined : { beat: candidate.beat }),
      ...(orientation === 0 ? undefined : { orientation }),
      ...(initialTurnsOffset === undefined ? undefined : { initialTurnsOffset }),
      ...(hasPropRotationOffsets ? { propRotationOffsets } : undefined),
      bpm: animation.bpm / doublePlaybackMultiplier,
      scale,
    })

    return {
      match,
      exactDifference: Number(
        calculateExact && regeneratedSignature !== exactAnimationSignature,
      ),
      orientedSignatureDifference: Number(
        orientedState.directionSignature !== inputSignature.key,
      ),
    }
  }

  const findBaseMatches = (
    animation: RootDataFinal,
    rotationFilter?: VtgPatternRotationFilter,
    calculateExact = true,
  ): readonly RankedMatch<Match>[] => {
    const compiled = rootCompile(animation)
    const timing = inferVtgTimingFromCompiled(animation, compiled)
    const signature = createVtgDirectionSignatureFromCompiled(animation, compiled)
    const adjustedScale = getVtgAnimationScale(animation)
    if (!timing || !signature || adjustedScale === undefined) return []

    const exactSignature = calculateExact
      ? createCompiledVtgPatternSignatureFromCompiled(compiled)
      : undefined
    const scale = getVtgScaleControlValue(adjustedScale, timing.speedRatio)
    return findCandidates(timing.speedRatio, signature.key).flatMap((candidate) => {
      const orientationDifference = signature.orientation - candidate.baseOrientation
      const orientation = normalizeOrientation(
        candidate.reversePlane ? -orientationDifference : orientationDifference,
      )
      if (
        (rotationFilter === 'unrotated' && orientation !== 0) ||
        (rotationFilter === 'rotated' && orientation === 0)
      ) {
        return []
      }

      const base = createRankedMatch(
        animation,
        compiled,
        exactSignature,
        signature,
        scale,
        candidate,
        orientation,
        calculateExact,
      )
      if (!base) return []

      const offsets = base.match.propRotationOffsets
      const commonOffset = offsets && offsets[0] === offsets[1] ? offsets[0] : undefined
      const initialTurnsOffset = vtgTransitionInitialTurnsOffsets.find(
        (offset) => offset === commonOffset,
      )
      if (initialTurnsOffset === undefined) return [base]

      const initialTurns = createRankedMatch(
        animation,
        compiled,
        exactSignature,
        signature,
        scale,
        candidate,
        orientation,
        calculateExact,
        initialTurnsOffset,
      )
      return initialTurns ? [base, initialTurns] : [base]
    })
  }

  const findAtPlaybackResolution = (
    animation: RootDataFinal,
    rotationFilter?: VtgPatternRotationFilter,
    calculateExact = true,
  ): readonly RankedMatch<Match>[] => {
    const alternating = analyzeAlternatingPatternPlaybacks(animation)
    if (alternating.length === 0) {
      return findBaseMatches(animation, rotationFilter, calculateExact)
    }

    return alternating.flatMap((analysis) =>
      findBaseMatches(analysis.base, rotationFilter, calculateExact)
        .filter(
          ({ match }) =>
            getVtgTimingCycleCount(match.speedRatio) ===
            ((analysis.base.props[0]?.anim.length ?? 1) - 1) / vtgIntervalsPerTimingCycle,
        )
        .map(({ match, ...ranking }) => ({
          ...ranking,
          match: toMatch({
            ...match,
            transition: true,
            transitionBeats: analysis.transitionBeats,
            ...(analysis.transitionAfterBeat ? { transitionAfterBeat: true } : undefined),
            ...(analysis.transitionQuad ? { transitionQuad: true } : undefined),
            ...(analysis.transitionSecond ? { transitionSecond: true } : undefined),
          }),
        })),
    )
  }

  const findInternal = (
    animation: RootDataFinal,
    rotationFilter?: VtgPatternRotationFilter,
    calculateExact = true,
  ): readonly RankedMatch<Match>[] => {
    let normalized = animation
    while (true) {
      const matches = findAtPlaybackResolution(normalized, rotationFilter, calculateExact)
      if (matches.length > 0) return matches
      if (!needsCanonicalPlaybackSubdivision(normalized)) return []

      const doubled = doubleAnimationPlayback(normalized)
      if (!doubled) return []
      normalized = doubled
    }
  }

  const sortMatches = (
    matches: readonly RankedMatch<Match>[],
    preferences?: VtgPatternMatchPreferences & { orientation?: number },
  ) =>
    [...matches].sort((first, second) => {
      const exactDifference = first.exactDifference - second.exactDifference
      if (exactDifference) return exactDifference

      const propRotationDifference =
        Number(first.match.propRotationOffsets !== undefined) -
        Number(second.match.propRotationOffsets !== undefined)
      if (propRotationDifference) return propRotationDifference

      const orientedDifference =
        first.orientedSignatureDifference - second.orientedSignatureDifference
      if (orientedDifference) return orientedDifference

      const transformDifference =
        Number(first.match.swapProps) +
        Number(first.match.reversePlane) -
        Number(second.match.swapProps) -
        Number(second.match.reversePlane)
      if (transformDifference) return transformDifference

      const preferenceDifference = preferences
        ? preferenceDifferenceCount(first.match, preferences) -
          preferenceDifferenceCount(second.match, preferences)
        : 0
      if (preferenceDifference) return preferenceDifference

      const preferredOrientation = preferences?.orientation
      const orientationDifference = preferredOrientation === undefined
        ? Number((first.match.orientation ?? 0) !== 0) -
            Number((second.match.orientation ?? 0) !== 0)
        : Number((first.match.orientation ?? 0) !== preferredOrientation) -
            Number((second.match.orientation ?? 0) !== preferredOrientation)
      if (orientationDifference) return orientationDifference

      // Search every beat in the preferred orientation before considering a rotated duplicate.
      // "Rotation last" refers to candidate precedence, not to choosing the lowest beat globally.
      return (first.match.beat ?? vtgDefaultBeat) - (second.match.beat ?? vtgDefaultBeat)
    })

  const findMatches = (animation: RootDataFinal, rotationFilter?: VtgPatternRotationFilter) =>
    findInternal(animation, rotationFilter, false).map(({ match }) => match)

  const findResolution = (
    animation: RootDataFinal,
    preferences?: VtgPatternMatchPreferences & { orientation?: number },
    rotationFilter?: VtgPatternRotationFilter,
  ): VtgCatalogMatchResolution<Match> | undefined => {
    const ranked = sortMatches(findInternal(animation, rotationFilter), preferences)[0]
    return ranked ? { match: ranked.match, exact: ranked.exactDifference === 0 } : undefined
  }

  const matchesSelection = (animation: RootDataFinal, selection: Selection) => {
    const candidate = createDefaultAnimation(selection)
    return (
      candidate !== undefined &&
      createVtgAnimationSignature(animation) === createVtgAnimationSignature(candidate)
    )
  }

  const exactlyMatchesSelection = (animation: RootDataFinal, selection: Selection) => {
    const candidate = createDefaultAnimation(selection)
    return (
      candidate !== undefined &&
      createCompiledVtgPatternSignature(animation) === createCompiledVtgPatternSignature(candidate)
    )
  }

  return { findMatches, findResolution, matchesSelection, exactlyMatchesSelection }
}
