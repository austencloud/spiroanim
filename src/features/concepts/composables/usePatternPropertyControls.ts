import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'
import type {
  VtgFoldMode,
  VtgFoldSpan,
  VtgFoldValue,
  VtgTwistMode,
} from '@/features/concepts/stores/useConceptsStore'
import {
  applyVtgFoldSettings,
  deriveVtgFoldSimpleSources,
  extractVtgFoldValues,
} from '@/features/vtg/applyVtgFoldSettings'
import type { RootDataFinal } from '@/types/AnimTypes'

interface PatternPropertyControlOptions {
  animation: Readonly<Ref<RootDataFinal | undefined>>
  onAnimationUpdate: (animation: RootDataFinal) => void
}

export const usePatternPropertyControls = ({
  animation,
  onAnimationUpdate,
}: PatternPropertyControlOptions) => {
  const conceptsStore = useConceptsStore()
  const {
    vtgTwistMode,
    vtgTwistValues,
    vtgFoldValues,
    vtgFoldValuesMaterialized,
    vtgFoldMode,
    vtgFoldBeat,
    vtgFoldRepeat,
    vtgFoldEvery,
    vtgFoldAlternate,
    vtgFoldSpan,
    vtgFoldMirror,
    vtgActiveProperty,
  } = storeToRefs(conceptsStore)

  const emitPropertyAnimation = () => {
    if (!animation.value) return
    onAnimationUpdate(conceptsStore.applyVtgPropertyControls(animation.value))
  }

  const getSimpleFoldSources = () =>
    deriveVtgFoldSimpleSources(
      vtgFoldValues.value,
      vtgFoldBeat.value,
      vtgFoldSpan.value,
      vtgFoldValuesMaterialized.value,
    )

  const materializeSimpleFoldValues = (sources = getSimpleFoldSources()) => {
    if (!animation.value) return
    vtgFoldValues.value = extractVtgFoldValues(
      applyVtgFoldSettings(animation.value, sources, {
        mode: 'simple',
        beat: vtgFoldBeat.value,
        repeat: vtgFoldRepeat.value,
        every: vtgFoldEvery.value,
        alternate: vtgFoldAlternate.value,
        span: vtgFoldSpan.value,
        mirror: vtgFoldMirror.value,
      }),
    )
    vtgFoldValuesMaterialized.value = true
  }

  const updateTwistSetting = (propIndex: 0 | 1, beat: number, value?: number) => {
    conceptsStore.setVtgTwistValue(propIndex, beat, value)
    emitPropertyAnimation()
  }

  const updateTwistMode = (mode: VtgTwistMode) => {
    vtgTwistMode.value = mode
    emitPropertyAnimation()
  }

  const updateFoldSetting = (
    propIndex: 0 | 1,
    beat: number,
    fold: keyof VtgFoldValue,
    value?: number,
  ) => {
    if (vtgFoldMode.value === 'simple') {
      const sources = getSimpleFoldSources()
      const source = sources[propIndex][String(beat)] ?? {}
      if (value === undefined) delete source[fold]
      else source[fold] = value
      if (source.yaw === undefined && source.rotate === undefined) {
        delete sources[propIndex][String(beat)]
      } else sources[propIndex][String(beat)] = source
      materializeSimpleFoldValues(sources)
    } else {
      conceptsStore.setVtgFoldValue(propIndex, beat, fold, value)
      vtgFoldValuesMaterialized.value = true
    }
    emitPropertyAnimation()
  }

  const updateFoldMode = (mode: VtgFoldMode) => {
    if (vtgFoldMode.value === 'simple' && mode === 'advanced') materializeSimpleFoldValues()
    vtgFoldMode.value = mode
    emitPropertyAnimation()
  }

  const updateFoldBeat = (propIndex: 0 | 1, beat: number) => {
    const sources = getSimpleFoldSources()
    const previousBeat = vtgFoldBeat.value[propIndex]
    const source = sources[propIndex][String(previousBeat)]
    vtgFoldBeat.value[propIndex] = beat
    if (vtgFoldMirror.value && propIndex === 0) vtgFoldBeat.value[1] = beat
    delete sources[propIndex][String(previousBeat)]
    if (source) sources[propIndex][String(beat)] = source
    materializeSimpleFoldValues(sources)
    emitPropertyAnimation()
  }

  const updateFoldRepeat = (propIndex: 0 | 1, repeat: boolean) => {
    const sources = getSimpleFoldSources()
    vtgFoldRepeat.value[propIndex] = repeat
    if (vtgFoldMirror.value && propIndex === 0) vtgFoldRepeat.value[1] = repeat
    if (!repeat) vtgFoldAlternate.value[propIndex] = false
    materializeSimpleFoldValues(sources)
    emitPropertyAnimation()
  }

  const updateFoldEvery = (propIndex: 0 | 1, every: number) => {
    const sources = getSimpleFoldSources()
    vtgFoldEvery.value[propIndex] = every
    if (vtgFoldMirror.value && propIndex === 0) vtgFoldEvery.value[1] = every
    materializeSimpleFoldValues(sources)
    emitPropertyAnimation()
  }

  const updateFoldAlternate = (propIndex: 0 | 1, alternate: boolean) => {
    const sources = getSimpleFoldSources()
    vtgFoldAlternate.value[propIndex] = alternate
    if (vtgFoldMirror.value && propIndex === 0) vtgFoldAlternate.value[1] = alternate
    materializeSimpleFoldValues(sources)
    emitPropertyAnimation()
  }

  const updateFoldSpan = (span: VtgFoldSpan) => {
    const sources = getSimpleFoldSources()
    vtgFoldSpan.value = span
    materializeSimpleFoldValues(sources)
    emitPropertyAnimation()
  }

  const updateFoldMirror = (mirror: boolean) => {
    const sources = getSimpleFoldSources()
    vtgFoldMirror.value = mirror
    if (mirror) {
      vtgFoldBeat.value[1] = vtgFoldBeat.value[0]
      vtgFoldRepeat.value[1] = vtgFoldRepeat.value[0]
      vtgFoldEvery.value[1] = vtgFoldEvery.value[0]
      vtgFoldAlternate.value[1] = vtgFoldAlternate.value[0]
    }
    materializeSimpleFoldValues(sources)
    emitPropertyAnimation()
  }

  return {
    vtgTwistMode,
    vtgTwistValues,
    vtgFoldValues,
    vtgFoldValuesMaterialized,
    vtgFoldMode,
    vtgFoldBeat,
    vtgFoldRepeat,
    vtgFoldEvery,
    vtgFoldAlternate,
    vtgFoldSpan,
    vtgFoldMirror,
    vtgActiveProperty,
    updateTwistSetting,
    updateTwistMode,
    updateFoldSetting,
    updateFoldMode,
    updateFoldBeat,
    updateFoldRepeat,
    updateFoldEvery,
    updateFoldAlternate,
    updateFoldSpan,
    updateFoldMirror,
  }
}
