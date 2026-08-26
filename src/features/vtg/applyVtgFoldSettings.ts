import type {
  VtgFoldMode,
  VtgFoldSideSettings,
  VtgFoldSpan,
  VtgFoldValue,
  VtgFoldValues,
} from '@/features/concepts/stores/useConceptsStore'
import type { RootDataFinal } from '@/types/AnimTypes'

export interface VtgFoldSimpleSettings {
  beat: VtgFoldSideSettings<number>
  repeat: VtgFoldSideSettings<boolean>
  every: VtgFoldSideSettings<number>
  alternate: VtgFoldSideSettings<boolean>
  span: VtgFoldSpan
}

/** Applies generator Fold settings without mutating the generated VTG animation. */
export const applyVtgFoldSettings = (
  animation: RootDataFinal,
  values: VtgFoldValues,
  options: {
    mode: VtgFoldMode
    beat: VtgFoldSideSettings<number>
    repeat: VtgFoldSideSettings<boolean>
    every: VtgFoldSideSettings<number>
    alternate: VtgFoldSideSettings<boolean>
    span: VtgFoldSpan
  } = {
    mode: 'advanced',
    beat: [2, 2],
    repeat: [true, true],
    every: [2, 2],
    alternate: [false, false],
    span: 'quarter',
  },
): RootDataFinal => ({
  ...animation,
  props: animation.props.map((prop, propIndex) => {
    let beat = 0
    return {
      ...prop,
      anim: prop.anim.map((frame) => {
        const nextFrame = { ...frame }
        delete nextFrame.yaw
        delete nextFrame.rotate
        const fold = resolveFold(values, propIndex, beat, options)
        if (fold?.yaw !== undefined) nextFrame.yaw = fold.yaw
        if (fold?.rotate !== undefined) nextFrame.rotate = fold.rotate
        beat += frame.beats ?? 0.5
        return nextFrame
      }),
    }
  }),
})

/** Captures the effective per-beat Fold values for display and editing in Advanced mode. */
export const extractVtgFoldValues = (animation: RootDataFinal): VtgFoldValues => [
  extractPropFoldValues(animation, 0),
  extractPropFoldValues(animation, 1),
]

/** Reconstructs Simple's authored source values from the effective Advanced beat table. */
export const deriveVtgFoldSimpleSources = (
  values: VtgFoldValues,
  beats: VtgFoldSideSettings<number>,
  span: VtgFoldSpan,
  materialized: boolean,
): VtgFoldValues => [
  deriveVtgFoldSimpleSource(values, beats, 0, span, materialized),
  deriveVtgFoldSimpleSource(values, beats, 1, span, materialized),
]

const deriveVtgFoldSimpleSource = (
  values: VtgFoldValues,
  beats: VtgFoldSideSettings<number>,
  propIndex: 0 | 1,
  span: VtgFoldSpan,
  materialized: boolean,
) => {
  const beat = beats[propIndex]
  const fold = values[propIndex][String(beat)]
  if (!fold) return {}
  return {
    [String(beat)]: {
      ...(fold.yaw === undefined ? {} : { yaw: fold.yaw }),
      ...(fold.rotate === undefined
        ? {}
        : { rotate: materialized && span === 'quarter' ? fold.rotate * 2 : fold.rotate }),
    },
  }
}

const extractPropFoldValues = (animation: RootDataFinal, propIndex: 0 | 1) => {
  const prop = animation.props[propIndex]
  if (!prop) return {}
  let beat = 0
  const values: Record<string, VtgFoldValue> = {}
  for (const frame of prop.anim) {
    const fold: VtgFoldValue = {
      ...(frame.yaw === undefined ? {} : { yaw: frame.yaw }),
      ...(frame.rotate === undefined ? {} : { rotate: frame.rotate }),
    }
    if (fold.yaw !== undefined || fold.rotate !== undefined) values[String(beat)] = fold
    beat += frame.beats ?? 0.5
  }
  return values
}

const resolveFold = (
  values: VtgFoldValues,
  propIndex: number,
  frameBeat: number,
  options: {
    mode: VtgFoldMode
    beat: VtgFoldSideSettings<number>
    repeat: VtgFoldSideSettings<boolean>
    every: VtgFoldSideSettings<number>
    alternate: VtgFoldSideSettings<boolean>
    span: VtgFoldSpan
  },
): VtgFoldValue | undefined => {
  if (options.mode === 'advanced') return values[propIndex]?.[String(frameBeat)]

  if (propIndex !== 0 && propIndex !== 1) return
  const interval = options.every[propIndex]
  const startBeat = options.beat[propIndex]
  const getOccurrence = (candidateBeat: number) => {
    const offset = candidateBeat - startBeat
    const occurrence = Math.round(offset / interval)
    if (occurrence < 0 || Math.abs(offset - occurrence * interval) >= 0.000001) return
    if (!options.repeat[propIndex] && occurrence !== 0) return
    return occurrence
  }
  const occurrence =
    getOccurrence(frameBeat) ??
    (options.span === 'quarter' ? getOccurrence(frameBeat + 0.5) : undefined)
  if (occurrence === undefined) return

  const sourceIndex =
    options.alternate[propIndex] && occurrence % 2 === 1 ? 1 - propIndex : propIndex
  const sourceBeat = options.beat[sourceIndex]
  const source = values[sourceIndex]?.[String(sourceBeat)]
  if (!source || options.span === 'eighth') return source
  return {
    ...(source.yaw === undefined ? {} : { yaw: source.yaw }),
    ...(source.rotate === undefined ? {} : { rotate: source.rotate / 2 }),
  }
}

const foldsEqual = (left: VtgFoldValue | undefined, right: VtgFoldValue | undefined) =>
  left?.yaw === right?.yaw && left?.rotate === right?.rotate

const frameBeats = (animation: RootDataFinal, propIndex: 0 | 1) => {
  const beats: number[] = []
  let beat = 0
  for (const frame of animation.props[propIndex]?.anim ?? []) {
    beats.push(beat)
    beat += frame.beats ?? 0.5
  }
  return beats
}

interface SideCandidate {
  beat: number
  repeat: boolean
  every: number
  alternate: boolean
}

const sideCandidates = (beats: readonly number[], span: VtgFoldSpan): SideCandidate[] => {
  const selectable = beats.filter((beat) => span === 'eighth' || Number.isInteger(beat))
  const intervals = selectable.filter((beat) => beat > 0)
  return selectable.flatMap((beat) => [
    { beat, repeat: false, every: 2, alternate: false },
    ...intervals.flatMap((every) => [
      { beat, repeat: true, every, alternate: false },
      { beat, repeat: true, every, alternate: true },
    ]),
  ])
}

const simpleSources = (
  values: VtgFoldValues,
  candidates: readonly [SideCandidate, SideCandidate],
  span: VtgFoldSpan,
): VtgFoldValues =>
  candidates.map(({ beat }, propIndex) => {
    const fold = values[propIndex]?.[String(beat)]
    if (!fold) return {}
    return {
      [String(beat)]: {
        ...(fold.yaw === undefined ? {} : { yaw: fold.yaw }),
        ...(fold.rotate === undefined
          ? {}
          : { rotate: span === 'quarter' ? fold.rotate * 2 : fold.rotate }),
      },
    }
  }) as VtgFoldValues

/** Detects a Simple schedule only when it reproduces every explicit Fold value exactly. */
export const detectVtgFoldSimpleSettings = (
  animation: RootDataFinal,
  values: VtgFoldValues = extractVtgFoldValues(animation),
): VtgFoldSimpleSettings | undefined => {
  const beats = [frameBeats(animation, 0), frameBeats(animation, 1)] as const
  for (const span of ['quarter', 'eighth'] as const) {
    const candidates = [sideCandidates(beats[0], span), sideCandidates(beats[1], span)] as const
    for (const left of candidates[0]) {
      for (const right of candidates[1]) {
        const pair = [left, right] as const
        const options: VtgFoldSimpleSettings = {
          beat: [left.beat, right.beat],
          repeat: [left.repeat, right.repeat],
          every: [left.every, right.every],
          alternate: [left.alternate, right.alternate],
          span,
        }
        const sources = simpleSources(values, pair, span)
        const matches = beats.every((propBeats, propIndex) =>
          propBeats.every((beat) =>
            foldsEqual(
              resolveFold(sources, propIndex, beat, { mode: 'simple', ...options }),
              values[propIndex]?.[String(beat)],
            ),
          ),
        )
        if (matches) return options
      }
    }
  }
}
