import type { ComputedRef, Ref } from 'vue'

import {
  applyVtgBuilderPortionProperties,
  getVtgBuilderPortionAuthoredValues,
  getVtgBuilderPortionEffectiveValues,
  getVtgBuilderPortionRanges,
} from '@/features/builder/editVtgBuilderPortionProperties'
import type { VtgBuilderPreviewDetails } from '@/features/builder/resolveVtgBuilderPreviewRelationships'
import type {
  VtgFoldMode,
  VtgFoldSideSettings,
  VtgFoldSpan,
  VtgFoldValue,
  VtgFoldValues,
  VtgPropertyKey,
  VtgTwistMode,
  VtgTwistValues,
} from '@/features/concepts/stores/useConceptsStore'
import {
  applyVtgFoldSettings,
  deriveVtgFoldSimpleSources,
  detectVtgFoldSimpleSettings,
} from '@/features/vtg/applyVtgFoldSettings'
import { applyVtgTwistSettings, detectVtgTwistMode } from '@/features/vtg/applyVtgTwistSettings'
import { applyVtgPropRotationOffsets } from '@/features/vtg/createVtgAnimation'
import { rootCompile } from '@/math/animation/AnimFunc'
import type { RootDataFinal } from '@/types/AnimTypes'

interface UseVtgBuilderPortionPropertiesOptions {
  pattern: ComputedRef<RootDataFinal>
  previews: ComputedRef<readonly RootDataFinal[] | undefined>
  previewDetails: Ref<readonly VtgBuilderPreviewDetails[] | undefined>
  selectedIndex: Ref<number | undefined>
  commit: (updated: RootDataFinal) => void
}

const emptyTwistValues = (): VtgTwistValues => [{}, {}]
const emptyFoldValues = (): VtgFoldValues => [{}, {}]
const copyTwistValues = (values: VtgTwistValues): VtgTwistValues => [
  { ...values[0] },
  { ...values[1] },
]
const copyFoldValues = (values: VtgFoldValues): VtgFoldValues => [
  Object.fromEntries(Object.entries(values[0]).map(([beat, value]) => [beat, { ...value }])),
  Object.fromEntries(Object.entries(values[1]).map(([beat, value]) => [beat, { ...value }])),
]

export const useVtgBuilderPortionProperties = ({
  pattern,
  previews,
  previewDetails,
  selectedIndex,
  commit,
}: UseVtgBuilderPortionPropertiesOptions) => {
  const selectedControlAnimation = computed(() => {
    const index = selectedIndex.value
    return index === undefined ? undefined : previews.value?.[index]
  })
  const selectedLocalBeats = computed(() => {
    const frames = selectedControlAnimation.value?.props[0]?.anim ?? []
    let beat = 0
    return frames.map((frame) => {
      const frameBeat = beat
      beat += frame.beats ?? 0.5
      return frameBeat
    })
  })

  const activeProperty = ref<VtgPropertyKey | null>(null)
  const offsetValues = ref<readonly [number, number]>([0, 0])
  const twistMode = ref<VtgTwistMode>('simple')
  const foldMode = ref<VtgFoldMode>('simple')
  const foldBeat = ref<VtgFoldSideSettings<number>>([2, 2])
  const foldRepeat = ref<VtgFoldSideSettings<boolean>>([true, true])
  const foldEvery = ref<VtgFoldSideSettings<number>>([2, 2])
  const foldAlternate = ref<VtgFoldSideSettings<boolean>>([false, false])
  const foldSpan = ref<VtgFoldSpan>('eighth')
  const foldMirror = ref(true)

  const twistValues = computed<VtgTwistValues>(() => {
    const index = selectedIndex.value
    if (index === undefined) return emptyTwistValues()
    return (getVtgBuilderPortionAuthoredValues(
      pattern.value,
      index,
      selectedLocalBeats.value,
      'twist',
    ) ?? emptyTwistValues()) as VtgTwistValues
  })
  const twistDisplayValues = computed<VtgTwistValues>(() => {
    const index = selectedIndex.value
    if (index === undefined) return emptyTwistValues()
    return (
      getVtgBuilderPortionEffectiveValues(
        pattern.value,
        index,
        selectedLocalBeats.value,
        'twist',
      ) ?? emptyTwistValues()
    )
  })
  const foldValues = computed<VtgFoldValues>(() => {
    const index = selectedIndex.value
    if (index === undefined) return emptyFoldValues()
    const yaws = getVtgBuilderPortionAuthoredValues(
      pattern.value,
      index,
      selectedLocalBeats.value,
      'yaw',
    )
    const rotations = getVtgBuilderPortionAuthoredValues(
      pattern.value,
      index,
      selectedLocalBeats.value,
      'rotate',
    )
    if (!yaws || !rotations) return emptyFoldValues()

    return [0, 1].map((propIndex) => {
      const values: Record<string, VtgFoldValue> = {}
      const beats = new Set([
        ...Object.keys(yaws[propIndex] ?? {}),
        ...Object.keys(rotations[propIndex] ?? {}),
      ])
      for (const beat of beats) {
        const yaw = yaws[propIndex]?.[beat]
        const rotate = rotations[propIndex]?.[beat]
        values[beat] = {
          ...(yaw === undefined ? undefined : { yaw }),
          ...(rotate === undefined ? undefined : { rotate }),
        }
      }
      return values
    }) as VtgFoldValues
  })
  const initialYawValues = computed<readonly [number, number]>(() => {
    const index = selectedIndex.value
    if (index === undefined || index === 0) return [90, 90]
    const range = getVtgBuilderPortionRanges(pattern.value)[index]
    if (!range) return [90, 90]
    const compiled = rootCompile(pattern.value)
    return [
      compiled.props[0]?.anim[range.startFrameIndex]?.yaw ?? 90,
      compiled.props[1]?.anim[range.startFrameIndex]?.yaw ?? 90,
    ]
  })

  const syncOffsetValues = () => {
    const index = selectedIndex.value
    if (index !== 0) {
      offsetValues.value = [0, 0]
      return
    }
    offsetValues.value = previewDetails.value?.[index]?.match.propRotationOffsets ?? [0, 0]
  }

  const hydrateModes = () => {
    const animation = selectedControlAnimation.value
    if (!animation) return
    twistMode.value = detectVtgTwistMode(twistValues.value)
    const values = foldValues.value
    const hasAuthoredFold = values.some((side) => Object.keys(side).length > 0)
    const simpleFold = detectVtgFoldSimpleSettings(animation, values)
    foldMode.value = simpleFold ? 'simple' : 'advanced'
    if (!simpleFold) return

    const firstEditableFrameIndex = selectedIndex.value === 0 ? 0 : 1
    const firstEditableBeat = selectedLocalBeats.value[firstEditableFrameIndex] ?? 0
    const defaultBeat = selectedLocalBeats.value.includes(2) ? 2 : firstEditableBeat
    foldBeat.value = hasAuthoredFold ? [...simpleFold.beat] : [defaultBeat, defaultBeat]
    foldRepeat.value = [...simpleFold.repeat]
    foldEvery.value = [...simpleFold.every]
    foldAlternate.value = [...simpleFold.alternate]
    foldSpan.value = simpleFold.span
    foldMirror.value = simpleFold.mirror
  }

  watch(selectedIndex, (index) => {
    if (index !== 0 && activeProperty.value === 'offset') activeProperty.value = null
    syncOffsetValues()
    hydrateModes()
  })
  watch(previewDetails, syncOffsetValues)

  const commitWorkingProperties = (
    working: RootDataFinal,
    keys: readonly ('twist' | 'yaw' | 'rotate')[],
  ) => {
    const index = selectedIndex.value
    if (index === undefined) return
    const updated = applyVtgBuilderPortionProperties(pattern.value, index, working, keys)
    if (updated) commit(updated)
  }

  const applyTwistValues = (mode: VtgTwistMode, values: VtgTwistValues) => {
    const animation = selectedControlAnimation.value
    if (!animation) return
    commitWorkingProperties(
      applyVtgTwistSettings(animation, mode, values, {
        firstEditableFrameIndex: selectedIndex.value === 0 ? 0 : 1,
      }),
      ['twist'],
    )
  }
  const updateTwist = (propIndex: 0 | 1, beat: number, value?: number) => {
    const values = copyTwistValues(twistValues.value)
    if (value === undefined) delete values[propIndex][String(beat)]
    else values[propIndex][String(beat)] = value
    applyTwistValues(twistMode.value, values)
  }
  const updateTwistMode = (mode: VtgTwistMode) => {
    twistMode.value = mode
    applyTwistValues(mode, twistValues.value)
  }

  const foldOptions = () => ({
    mode: foldMode.value,
    beat: foldBeat.value,
    repeat: foldRepeat.value,
    every: foldEvery.value,
    alternate: foldAlternate.value,
    span: foldSpan.value,
    mirror: foldMirror.value,
    firstEditableFrameIndex: selectedIndex.value === 0 ? 0 : 1,
  })
  const simpleFoldSources = (values = foldValues.value) => {
    const firstEditableFrameIndex = selectedIndex.value === 0 ? 0 : 1
    return deriveVtgFoldSimpleSources(
      values,
      foldBeat.value,
      foldSpan.value,
      true,
      selectedLocalBeats.value[firstEditableFrameIndex] ?? 0,
    )
  }
  const applyFoldValues = (values: VtgFoldValues) => {
    const animation = selectedControlAnimation.value
    if (!animation) return
    commitWorkingProperties(applyVtgFoldSettings(animation, values, foldOptions()), [
      'yaw',
      'rotate',
    ])
  }
  const applyCurrentFold = (values = foldValues.value) =>
    applyFoldValues(foldMode.value === 'simple' ? simpleFoldSources(values) : values)
  const updateFold = (propIndex: 0 | 1, beat: number, fold: keyof VtgFoldValue, value?: number) => {
    const values =
      foldMode.value === 'simple' ? simpleFoldSources() : copyFoldValues(foldValues.value)
    const frame = values[propIndex][String(beat)] ?? {}
    if (value === undefined) delete frame[fold]
    else frame[fold] = value
    if (frame.yaw === undefined && frame.rotate === undefined) {
      delete values[propIndex][String(beat)]
    } else {
      values[propIndex][String(beat)] = frame
    }
    applyFoldValues(values)
  }
  const updateFoldMode = (mode: VtgFoldMode) => {
    foldMode.value = mode
    applyCurrentFold()
  }
  const updateFoldBeat = (propIndex: 0 | 1, beat: number) => {
    const sources = simpleFoldSources()
    const previousBeat = foldBeat.value[propIndex]
    const source = sources[propIndex][String(previousBeat)]
    foldBeat.value[propIndex] = beat
    if (foldMirror.value && propIndex === 0) foldBeat.value[1] = beat
    delete sources[propIndex][String(previousBeat)]
    if (source) sources[propIndex][String(beat)] = source
    applyFoldValues(sources)
  }
  const updateFoldRepeat = (propIndex: 0 | 1, repeat: boolean) => {
    const sources = simpleFoldSources()
    foldRepeat.value[propIndex] = repeat
    if (foldMirror.value && propIndex === 0) foldRepeat.value[1] = repeat
    if (!repeat) foldAlternate.value[propIndex] = false
    applyFoldValues(sources)
  }
  const updateFoldEvery = (propIndex: 0 | 1, every: number) => {
    const sources = simpleFoldSources()
    foldEvery.value[propIndex] = every
    if (foldMirror.value && propIndex === 0) foldEvery.value[1] = every
    applyFoldValues(sources)
  }
  const updateFoldAlternate = (propIndex: 0 | 1, alternate: boolean) => {
    const sources = simpleFoldSources()
    foldAlternate.value[propIndex] = alternate
    if (foldMirror.value && propIndex === 0) foldAlternate.value[1] = alternate
    applyFoldValues(sources)
  }
  const updateFoldSpan = (span: VtgFoldSpan) => {
    const sources = simpleFoldSources()
    foldSpan.value = span
    applyFoldValues(sources)
  }
  const updateFoldMirror = (mirror: boolean) => {
    const sources = simpleFoldSources()
    foldMirror.value = mirror
    if (mirror) {
      foldBeat.value[1] = foldBeat.value[0]
      foldRepeat.value[1] = foldRepeat.value[0]
      foldEvery.value[1] = foldEvery.value[0]
      foldAlternate.value[1] = foldAlternate.value[0]
    }
    applyFoldValues(sources)
  }

  const updateOffset = (propIndex: 0 | 1, value?: number) => {
    if (selectedIndex.value !== 0) return
    const previous = offsetValues.value
    const next: [number, number] = [...previous]
    next[propIndex] = value ?? 0
    const delta: [number, number] = [next[0] - previous[0], next[1] - previous[1]]
    offsetValues.value = next
    commit(applyVtgPropRotationOffsets(pattern.value, delta))
  }

  return {
    selectedControlAnimation,
    activeProperty,
    offsetValues,
    twistMode,
    twistValues,
    twistDisplayValues,
    foldValues,
    foldMode,
    foldBeat,
    foldRepeat,
    foldEvery,
    foldAlternate,
    foldSpan,
    foldMirror,
    initialYawValues,
    updateOffset,
    updateTwist,
    updateTwistMode,
    updateFold,
    updateFoldMode,
    updateFoldBeat,
    updateFoldRepeat,
    updateFoldEvery,
    updateFoldAlternate,
    updateFoldSpan,
    updateFoldMirror,
  }
}
