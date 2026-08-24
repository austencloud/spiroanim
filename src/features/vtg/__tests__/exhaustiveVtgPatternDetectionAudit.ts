import { beforeAll, describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { findVtgPatternMatch } from '@/features/vtg/matchVtgAnimation'
import type {
  VtgCellReference,
  VtgPatternMatch,
  VtgPatternSelection,
  VtgRuleNumber,
  VtgSpeedRatio,
} from '@/features/vtg/types'
import { getVtgBeats, getVtgPatternOrientations } from '@/features/vtg/types'
import { rootCompile } from '@/math/animation/AnimFunc'
import { useBaseQS } from '@/services/query/createBaseQS'
import { CURRENT_SPIRO_ANIM_QS_VERSION, loadSpiroAnimQSVersion } from '@/services/query/versions'
import type { RootDataFinal } from '@/types/AnimTypes'

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const satisfies readonly VtgRuleNumber[]
const booleanOptions = [false, true] as const
const spinToggleCells: ReadonlySet<VtgCellReference> = new Set(['5-5', '5-6', '6-5', '6-6'])
// Three.js matrix/quaternion composition can leave harmless vector components around 1e-8.
// A micro-unit comparison still catches meaningful authored or serialized animation differences.
const precision = 1e6
const exhaustiveAuditTimeout = 10 * 60 * 1000

type Codec = Awaited<ReturnType<typeof useSpiroAnimQS>>

interface DetectionFailure {
  source: VtgPatternSelection
  detected?: VtgPatternMatch
  reason: 'unmatched' | 'different-animation'
  firstDifference?: {
    prop: number
    frame: number
    field: string
    source: number
    regenerated: number
  }
  serializationDifference?: ReturnType<typeof findFirstDifference>
}

const normalizeNumber = (value: number) => {
  const normalized = Math.round(value * precision) / precision
  return Object.is(normalized, -0) ? 0 : normalized
}
const normalizeAngle = (value: number) => {
  let normalized = ((((normalizeNumber(value) + 180) % 360) + 360) % 360) - 180
  const nearestWholeDegree = Math.round(normalized)
  if (Math.abs(normalized - nearestWholeDegree) <= 1e-6) normalized = nearestWholeDegree
  return normalized === -180 ? 180 : normalized
}

const exactFrameFields = [
  'turns',
  'twist',
  'twist-roll',
  'beats',
  'scale',
  'depth',
  'type',
  'adjust',
  'arc',
  'plane',
  'axis',
  'position-x',
  'position-y',
  'position-z',
  'rotation-x',
  'rotation-y',
  'rotation-z',
] as const

const createExactAnimationData = (animation: RootDataFinal) => {
  const compiled = rootCompile(animation)
  return {
    bpm: compiled.bpm,
    props: compiled.props.map((prop) =>
      prop.anim.map((frame) => [
        normalizeNumber(frame.turns),
        normalizeNumber(frame.twist),
        normalizeNumber(frame.twistRoll),
        normalizeNumber(frame.beats),
        normalizeNumber(frame.scale),
        normalizeNumber(frame.depth),
        normalizeNumber(frame.type),
        normalizeNumber(frame.adjust),
        normalizeAngle(frame.arc),
        normalizeAngle(frame.plane),
        normalizeAngle(frame.axis),
        ...frame.pos.map(normalizeNumber),
        ...frame.rot.map(normalizeNumber),
      ]),
    ),
  }
}

const createExactAnimationSignature = (animation: RootDataFinal) =>
  JSON.stringify(createExactAnimationData(animation))

const findFirstDifference = (source: RootDataFinal, regenerated: RootDataFinal) => {
  const sourceData = createExactAnimationData(source)
  const regeneratedData = createExactAnimationData(regenerated)
  for (const [propIndex, sourceProp] of sourceData.props.entries()) {
    const regeneratedProp = regeneratedData.props[propIndex]
    if (!regeneratedProp) continue
    for (const [frameIndex, sourceFrame] of sourceProp.entries()) {
      const regeneratedFrame = regeneratedProp[frameIndex]
      if (!regeneratedFrame) continue
      const fieldIndex = sourceFrame.findIndex((value, index) => value !== regeneratedFrame[index])
      if (fieldIndex !== -1) {
        return {
          prop: propIndex,
          frame: frameIndex,
          field: exactFrameFields[fieldIndex] ?? `field-${fieldIndex}`,
          source: sourceFrame[fieldIndex]!,
          regenerated: regeneratedFrame[fieldIndex]!,
        }
      }
    }
  }
}

const createSelections = (speedRatio: VtgSpeedRatio) => {
  const selections: VtgPatternSelection[] = []
  for (const row of ruleNumbers) {
    for (const column of ruleNumbers) {
      const reference = `${row}-${column}` as VtgCellReference
      const antiOptions = spinToggleCells.has(reference) ? booleanOptions : ([false] as const)
      for (const isAnti of antiOptions) {
        for (const beat of getVtgBeats(speedRatio)) {
          for (const swapProps of booleanOptions) {
            for (const reversePlane of booleanOptions) {
              for (const orientation of getVtgPatternOrientations(speedRatio)) {
                selections.push({
                  reference,
                  speedRatio,
                  isAnti,
                  swapProps,
                  reversePlane,
                  beat,
                  orientation,
                })
              }
            }
          }
        }
      }
    }
  }
  return selections
}

export function defineExhaustiveVtgPatternDetectionAudit(speedRatio: VtgSpeedRatio) {
  describe(`exhaustive VTG ${speedRatio} pattern detection`, () => {
    let codec: Codec

    beforeAll(async () => {
      const version = await loadSpiroAnimQSVersion(CURRENT_SPIRO_ANIM_QS_VERSION)
      codec = await useSpiroAnimQS(
        version.VDEF,
        useBaseQS(version.VDEF, { charset: version.CHARSET }),
        CURRENT_SPIRO_ANIM_QS_VERSION,
      )
    })

    it(
      'regenerates every current-QS source pattern exactly',
      async () => {
        const failures: DetectionFailure[] = []
        const selections = createSelections(speedRatio)

        for (const selection of selections) {
          const source = createDefaultVtgAnimation(selection)
          if (!source) throw new Error(`Missing source animation for ${JSON.stringify(selection)}`)
          const decoded = await codec.decodeVer(codec.encodeQS(source, false))
          const detected = findVtgPatternMatch(decoded)
          if (!detected) {
            failures.push({ source: selection, reason: 'unmatched' })
            continue
          }

          const regenerated = createDefaultVtgAnimation(detected)
          if (
            !regenerated ||
            createExactAnimationSignature(regenerated) !== createExactAnimationSignature(decoded)
          ) {
            failures.push({
              source: selection,
              detected,
              reason: 'different-animation',
              ...(regenerated
                ? { firstDifference: findFirstDifference(decoded, regenerated) }
                : undefined),
              ...(createExactAnimationSignature(source) === createExactAnimationSignature(decoded)
                ? undefined
                : { serializationDifference: findFirstDifference(source, decoded) }),
            })
          }
        }

        expect({
          checked: selections.length,
          failureCount: failures.length,
          failures: failures.slice(0, 3),
        }).toEqual({ checked: selections.length, failureCount: 0, failures: [] })
      },
      exhaustiveAuditTimeout,
    )
  })
}
