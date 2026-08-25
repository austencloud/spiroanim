import type {
  VtgFoldMode,
  VtgFoldSideSettings,
  VtgFoldSpan,
  VtgFoldValue,
  VtgFoldValues,
} from '@/features/concepts/stores/useConceptsStore'
import type { RootDataFinal } from '@/types/AnimTypes'

/** Applies persistent generator Fold settings without mutating the generated VTG animation. */
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
