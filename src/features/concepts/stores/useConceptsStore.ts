import { conceptKeys } from '@/features/concepts/types'
import type { ConceptKey } from '@/features/concepts/types'
import {
  vtgBpmControl,
  vtgPlayerSettings,
  vtgScaleControl,
  vtgSpacingControl,
  vtgThickControl,
} from '@/features/vtg/data/vtgPlayerSettings'
import { isVtgSpeedRatio, vtgDefaultSpeedRatio, vtgPatternOrientations } from '@/features/vtg/types'
import type { VtgPatternOrientation, VtgSpeedRatio } from '@/features/vtg/types'
import type { PropInd } from '@/types/AnimTypes'
import { COLORS, PROPSR } from '@/domain/animation/AnimStruct'
import { isTouchDevice } from '@/utils/device'
import {
  defaultPatternPropColors,
  type PatternPropColor,
} from '@/features/concepts/patternPropColors'

const defaultQuickSlotCount = 0
const restoredQuickSlotCount = 4
const createEmptyQuickSlots = (count: number) => Array<string | null>(count).fill(null)

export interface QuickSlotSet {
  id: string
  name: string
  paths: Array<string | null>
  selectedSlot: number | null
}

export type VtgTwistMode = 'simple' | 'advanced'
export type VtgTwistValues = [Record<string, number>, Record<string, number>]
export interface VtgFoldValue {
  yaw?: number
  rotate?: number
}
export type VtgFoldValues = [Record<string, VtgFoldValue>, Record<string, VtgFoldValue>]
export type VtgFoldMode = 'simple' | 'advanced'
export type VtgFoldSpan = 'eighth' | 'quarter'
export type VtgFoldSideSettings<T> = [T, T]
export type VtgPropertyKey = 'axis' | 'twist' | 'turns'

const normalizeVtgTwistSide = (value: unknown): Record<string, number> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter(([beat, twist]) => {
      const numericBeat = Number(beat)
      return (
        Number.isFinite(numericBeat) &&
        numericBeat >= 0 &&
        typeof twist === 'number' &&
        Number.isFinite(twist) &&
        twist >= -360 &&
        twist <= 360 &&
        twist % 45 === 0
      )
    }),
  )
}

const quickSlotSetIdPrefix = 'quick-slot-set-'
const defaultQuickSlotSetName = (number: number) => `Quick Slot Set #${number}`
const copyQuickSlotPaths = (paths: Array<string | null>) => [...paths]

export const useConceptsStore = defineStore(
  'sa-concepts',
  () => {
    const selectedConcept = ref<ConceptKey>('vtg')
    const quickSlotCount = ref(defaultQuickSlotCount)
    const selectedQuickSlot = ref<number | null>(null)
    const quickSlotPaths = ref<Array<string | null>>(createEmptyQuickSlots(defaultQuickSlotCount))
    const quickSlotSets = ref<QuickSlotSet[]>([])
    const selectedQuickSlotSetId = ref<string | null>(null)
    const nextQuickSlotSetId = ref(1)
    const qtrEnabled = ref(false)
    const speedRatio = ref<VtgSpeedRatio>(vtgDefaultSpeedRatio)
    const swapProps = ref(false)
    const reversePlane = ref(false)
    const orientation = ref<VtgPatternOrientation>(0)
    const bpm = ref<number>(vtgBpmControl.default)
    const scale = ref<number>(vtgScaleControl.default)
    const thick = ref<number>(vtgThickControl.default)
    const spacing = ref<number>(vtgSpacingControl.default)
    const paths = ref<boolean>(vtgPlayerSettings.paths)
    const hands = ref<boolean>(vtgPlayerSettings.hands)
    const arms = ref<boolean>(vtgPlayerSettings.arms)
    const leftPropVisible = ref(true)
    const rightPropVisible = ref(true)
    const customizeExpanded = ref(false)
    const classicLayout = ref(true)
    const leftPropColor = ref<PatternPropColor>(defaultPatternPropColors[0])
    const rightPropColor = ref<PatternPropColor>(defaultPatternPropColors[1])
    const prop = ref<PropInd>(2)
    const sliders = ref(!isTouchDevice())
    const vtgTwistMode = ref<VtgTwistMode>('simple')
    const vtgTwistApply = ref(true)
    const vtgTwistValues = ref<VtgTwistValues>([{}, {}])
    const vtgFoldValues = ref<VtgFoldValues>([{}, {}])
    const vtgFoldValuesMaterialized = ref(false)
    const vtgFoldMode = ref<VtgFoldMode>('simple')
    const vtgFoldApply = ref(true)
    const vtgFoldBeat = ref<VtgFoldSideSettings<number>>([2, 2])
    const vtgFoldRepeat = ref<VtgFoldSideSettings<boolean>>([true, true])
    const vtgFoldEvery = ref<VtgFoldSideSettings<number>>([2, 2])
    const vtgFoldAlternate = ref<VtgFoldSideSettings<boolean>>([false, false])
    const vtgFoldSpan = ref<VtgFoldSpan>('quarter')
    const vtgPropertiesExpanded = ref(false)
    const vtgActiveProperty = ref<VtgPropertyKey | null>(null)

    const setVtgTwistValue = (propIndex: 0 | 1, beat: number, value?: number) => {
      const beatKey = String(beat)
      if (value === undefined) delete vtgTwistValues.value[propIndex][beatKey]
      else vtgTwistValues.value[propIndex][beatKey] = value
    }
    const setVtgFoldValue = (
      propIndex: 0 | 1,
      beat: number,
      fold: keyof VtgFoldValue,
      value?: number,
    ) => {
      const beatKey = String(beat)
      const beatValue = vtgFoldValues.value[propIndex][beatKey] ?? {}
      if (value === undefined) delete beatValue[fold]
      else beatValue[fold] = value
      if (beatValue.yaw === undefined && beatValue.rotate === undefined) {
        delete vtgFoldValues.value[propIndex][beatKey]
      } else vtgFoldValues.value[propIndex][beatKey] = beatValue
    }

    const resetPatternControls = () => {
      speedRatio.value = vtgDefaultSpeedRatio
      swapProps.value = false
      reversePlane.value = false
      orientation.value = 0
      bpm.value = vtgBpmControl.default
      scale.value = vtgScaleControl.default
      thick.value = vtgThickControl.default
      spacing.value = vtgSpacingControl.default
      paths.value = vtgPlayerSettings.paths
      hands.value = vtgPlayerSettings.hands
      arms.value = vtgPlayerSettings.arms
      leftPropVisible.value = true
      rightPropVisible.value = true
      leftPropColor.value = defaultPatternPropColors[0]
      rightPropColor.value = defaultPatternPropColors[1]
      sliders.value = !isTouchDevice()
    }

    const addQuickSlot = () => {
      quickSlotCount.value++
      quickSlotPaths.value.push(null)
    }

    const removeQuickSlot = () => {
      if (quickSlotCount.value <= 0) return

      quickSlotCount.value--
      quickSlotPaths.value.length = quickSlotCount.value
      if (quickSlotCount.value === 0) {
        selectedQuickSlot.value = null
      } else if (selectedQuickSlot.value !== null) {
        selectedQuickSlot.value = Math.min(selectedQuickSlot.value, quickSlotCount.value)
      }
    }

    const replaceQuickSlots = (paths: readonly (string | null)[]) => {
      if (!paths.every((path) => path === null || (typeof path === 'string' && path.length > 0))) {
        return false
      }

      quickSlotCount.value = paths.length
      quickSlotPaths.value = [...paths]
      selectedQuickSlot.value = null
      return true
    }

    const replaceQuickSlotsWithEmpty = (count: number) => {
      if (!Number.isSafeInteger(count) || count < 0) return false
      return replaceQuickSlots(createEmptyQuickSlots(count))
    }

    const restoreQuickSlots = () => {
      replaceQuickSlotsWithEmpty(restoredQuickSlotCount)
    }

    const saveCurrentQuickSlot = (path: string) => {
      if (selectedQuickSlot.value === null) return
      quickSlotPaths.value[selectedQuickSlot.value - 1] = path
    }

    const clearQuickSlot = (slot: number) => {
      if (!Number.isSafeInteger(slot) || slot < 1 || slot > quickSlotCount.value) return
      quickSlotPaths.value[slot - 1] = null
    }

    const toggleQuickSlot = (slot: number) => {
      selectedQuickSlot.value = selectedQuickSlot.value === slot ? null : slot
    }

    const selectQuickSlotForPath = (path: string) => {
      const query = path.split('?', 2)[1]?.split('#', 1)[0]
      if (!query) {
        selectedQuickSlot.value = null
        return
      }

      const selectedPath =
        selectedQuickSlot.value === null
          ? undefined
          : quickSlotPaths.value[selectedQuickSlot.value - 1]
      if (selectedPath?.split('?', 2)[1]?.split('#', 1)[0] === query) return

      const matchingIndex = quickSlotPaths.value.findIndex(
        (quickSlotPath) => quickSlotPath?.split('?', 2)[1]?.split('#', 1)[0] === query,
      )
      selectedQuickSlot.value = matchingIndex === -1 ? null : matchingIndex + 1
    }

    const nextQuickSlotSetName = () => {
      const existingNames = new Set(quickSlotSets.value.map((set) => set.name))
      let number = 1
      while (existingNames.has(defaultQuickSlotSetName(number))) number++
      return defaultQuickSlotSetName(number)
    }

    const snapshotQuickSlots = (id: string, name: string): QuickSlotSet => ({
      id,
      name: name.trim() || nextQuickSlotSetName(),
      paths: copyQuickSlotPaths(quickSlotPaths.value),
      selectedSlot: selectedQuickSlot.value,
    })

    const saveNewQuickSlotSet = (name: string) => {
      const id = `${quickSlotSetIdPrefix}${nextQuickSlotSetId.value++}`
      quickSlotSets.value.push(snapshotQuickSlots(id, name))
      selectedQuickSlotSetId.value = id
      return id
    }

    const overwriteQuickSlotSet = (id: string, name: string) => {
      const index = quickSlotSets.value.findIndex((set) => set.id === id)
      if (index === -1) return false

      quickSlotSets.value[index] = snapshotQuickSlots(id, name)
      selectedQuickSlotSetId.value = id
      return true
    }

    const loadQuickSlotSet = (id: string) => {
      const set = quickSlotSets.value.find((candidate) => candidate.id === id)
      if (!set) return false

      quickSlotCount.value = set.paths.length
      quickSlotPaths.value = copyQuickSlotPaths(set.paths)
      selectedQuickSlot.value =
        set.selectedSlot !== null && set.selectedSlot <= quickSlotCount.value
          ? set.selectedSlot
          : null
      selectedQuickSlotSetId.value = id
      return true
    }

    const deleteQuickSlotSet = (id: string) => {
      const index = quickSlotSets.value.findIndex((set) => set.id === id)
      if (index === -1) return false

      quickSlotSets.value.splice(index, 1)
      if (selectedQuickSlotSetId.value === id) {
        selectedQuickSlotSetId.value =
          quickSlotSets.value[index]?.id ?? quickSlotSets.value.at(-1)?.id ?? null
      }
      return true
    }

    return {
      selectedConcept,
      quickSlotCount,
      selectedQuickSlot,
      quickSlotPaths,
      quickSlotSets,
      selectedQuickSlotSetId,
      nextQuickSlotSetId,
      qtrEnabled,
      speedRatio,
      swapProps,
      reversePlane,
      orientation,
      bpm,
      scale,
      thick,
      spacing,
      paths,
      hands,
      arms,
      leftPropVisible,
      rightPropVisible,
      customizeExpanded,
      classicLayout,
      leftPropColor,
      rightPropColor,
      prop,
      sliders,
      vtgTwistMode,
      vtgTwistApply,
      vtgTwistValues,
      setVtgTwistValue,
      vtgFoldValues,
      vtgFoldValuesMaterialized,
      setVtgFoldValue,
      vtgFoldMode,
      vtgFoldApply,
      vtgFoldBeat,
      vtgFoldRepeat,
      vtgFoldEvery,
      vtgFoldAlternate,
      vtgFoldSpan,
      vtgPropertiesExpanded,
      vtgActiveProperty,
      resetPatternControls,
      addQuickSlot,
      removeQuickSlot,
      replaceQuickSlots,
      replaceQuickSlotsWithEmpty,
      restoreQuickSlots,
      saveCurrentQuickSlot,
      clearQuickSlot,
      toggleQuickSlot,
      selectQuickSlotForPath,
      nextQuickSlotSetName,
      saveNewQuickSlotSet,
      overwriteQuickSlotSet,
      loadQuickSlotSet,
      deleteQuickSlotSet,
    }
  },
  {
    persist: {
      pick: [
        'selectedConcept',
        'quickSlotCount',
        'selectedQuickSlot',
        'quickSlotPaths',
        'quickSlotSets',
        'selectedQuickSlotSetId',
        'nextQuickSlotSetId',
        'qtrEnabled',
        'speedRatio',
        'swapProps',
        'reversePlane',
        'orientation',
        'bpm',
        'scale',
        'thick',
        'spacing',
        'paths',
        'hands',
        'arms',
        'leftPropVisible',
        'rightPropVisible',
        'leftPropColor',
        'rightPropColor',
        'prop',
        'sliders',
        'vtgTwistMode',
        'vtgTwistApply',
        'vtgTwistValues',
        'vtgFoldValues',
        'vtgFoldValuesMaterialized',
        'vtgFoldMode',
        'vtgFoldApply',
        'vtgFoldBeat',
        'vtgFoldRepeat',
        'vtgFoldEvery',
        'vtgFoldAlternate',
        'vtgFoldSpan',
        'vtgPropertiesExpanded',
        'vtgActiveProperty',
        'customizeExpanded',
        'classicLayout',
      ],
      afterHydrate: ({ store }) => {
        const hydratedConcept: string = store.selectedConcept
        if (hydratedConcept === 'qtr') {
          store.selectedConcept = 'vtg'
          store.qtrEnabled = true
        }
        if (!conceptKeys.some((concept) => concept === store.selectedConcept)) {
          store.selectedConcept = 'vtg'
        }
        if (!Number.isSafeInteger(store.quickSlotCount) || store.quickSlotCount < 0) {
          store.quickSlotCount = defaultQuickSlotCount
        }
        if (store.quickSlotCount === 0 || store.selectedQuickSlot === null) {
          store.selectedQuickSlot = null
          // An explicitly cleared selection is valid persisted state.
        } else if (!Number.isSafeInteger(store.selectedQuickSlot) || store.selectedQuickSlot < 1) {
          store.selectedQuickSlot = 1
        } else {
          store.selectedQuickSlot = Math.min(store.selectedQuickSlot, store.quickSlotCount)
        }
        if (!Array.isArray(store.quickSlotPaths)) {
          store.quickSlotPaths = createEmptyQuickSlots(store.quickSlotCount)
        } else {
          store.quickSlotPaths = Array.from({ length: store.quickSlotCount }, (_, index) => {
            const path = store.quickSlotPaths[index]
            return typeof path === 'string' && path.length > 0 ? path : null
          })
        }
        if (!Array.isArray(store.quickSlotSets)) {
          store.quickSlotSets = []
        } else {
          store.quickSlotSets = store.quickSlotSets.flatMap((set: QuickSlotSet) => {
            if (
              typeof set?.id !== 'string' ||
              typeof set.name !== 'string' ||
              !Array.isArray(set.paths)
            )
              return []
            const paths = set.paths.map((path) =>
              typeof path === 'string' && path.length > 0 ? path : null,
            )
            const selectedSlot =
              Number.isSafeInteger(set.selectedSlot) &&
              set.selectedSlot !== null &&
              set.selectedSlot >= 1 &&
              set.selectedSlot <= paths.length
                ? set.selectedSlot
                : null
            return [{ id: set.id, name: set.name.trim() || 'Quick Slot Set', paths, selectedSlot }]
          })
        }
        if (
          typeof store.selectedQuickSlotSetId !== 'string' ||
          !store.quickSlotSets.some((set: QuickSlotSet) => set.id === store.selectedQuickSlotSetId)
        ) {
          store.selectedQuickSlotSetId = null
        }
        const nextIdAfterHydratedSets = store.quickSlotSets.reduce(
          (highest: number, set: QuickSlotSet) => {
            const numericId = Number(set.id.slice(quickSlotSetIdPrefix.length))
            return set.id.startsWith(quickSlotSetIdPrefix) && Number.isSafeInteger(numericId)
              ? Math.max(highest, numericId + 1)
              : highest
          },
          1,
        )
        store.nextQuickSlotSetId =
          Number.isSafeInteger(store.nextQuickSlotSetId) && store.nextQuickSlotSetId >= 1
            ? Math.max(store.nextQuickSlotSetId, nextIdAfterHydratedSets)
            : nextIdAfterHydratedSets
        if (!isVtgSpeedRatio(store.speedRatio)) {
          store.speedRatio = vtgDefaultSpeedRatio
        }
        if (!vtgPatternOrientations.includes(store.orientation)) store.orientation = 0
        if (
          !Number.isInteger(store.bpm) ||
          store.bpm < vtgBpmControl.min ||
          store.bpm > vtgBpmControl.max
        ) {
          store.bpm = vtgBpmControl.default
        }
        if (
          typeof store.scale !== 'number' ||
          !Number.isFinite(store.scale) ||
          store.scale < vtgScaleControl.min ||
          store.scale > vtgScaleControl.max
        ) {
          store.scale = vtgScaleControl.default
        }
        if (
          !Number.isInteger(store.thick) ||
          store.thick < vtgThickControl.min ||
          store.thick > vtgThickControl.max
        ) {
          store.thick = vtgThickControl.default
        }
        if (
          !Number.isInteger(store.spacing) ||
          store.spacing < vtgSpacingControl.min ||
          store.spacing > vtgSpacingControl.max
        ) {
          store.spacing = vtgSpacingControl.default
        }
        if (typeof store.paths !== 'boolean') store.paths = vtgPlayerSettings.paths
        if (typeof store.hands !== 'boolean') store.hands = vtgPlayerSettings.hands
        if (typeof store.arms !== 'boolean') store.arms = vtgPlayerSettings.arms
        if (typeof store.leftPropVisible !== 'boolean') store.leftPropVisible = true
        if (typeof store.rightPropVisible !== 'boolean') store.rightPropVisible = true
        if (!store.leftPropVisible && !store.rightPropVisible) store.rightPropVisible = true
        if (!COLORS.includes(store.leftPropColor)) {
          store.leftPropColor = defaultPatternPropColors[0]
        }
        if (!COLORS.includes(store.rightPropColor)) {
          store.rightPropColor = defaultPatternPropColors[1]
        }
        if (!Number.isInteger(store.prop) || store.prop < 0 || store.prop >= PROPSR.length) {
          store.prop = 2
        }
        if (typeof store.sliders !== 'boolean') store.sliders = !isTouchDevice()
        if (store.vtgTwistMode !== 'simple' && store.vtgTwistMode !== 'advanced') {
          store.vtgTwistMode = 'simple'
        }
        const hydratedTwistValues: unknown = store.vtgTwistValues
        store.vtgTwistValues = Array.isArray(hydratedTwistValues)
          ? [
              normalizeVtgTwistSide(hydratedTwistValues[0]),
              normalizeVtgTwistSide(hydratedTwistValues[1]),
            ]
          : [{}, {}]
        if (!Array.isArray(store.vtgFoldValues) || store.vtgFoldValues.length !== 2) {
          store.vtgFoldValues = [{}, {}]
        }
        if (typeof store.vtgFoldValuesMaterialized !== 'boolean') {
          store.vtgFoldValuesMaterialized = false
        }
        if (store.vtgFoldMode !== 'simple' && store.vtgFoldMode !== 'advanced') {
          store.vtgFoldMode = 'simple'
        }
        if (typeof store.vtgTwistApply !== 'boolean') store.vtgTwistApply = true
        if (typeof store.vtgFoldApply !== 'boolean') store.vtgFoldApply = true
        const hydratedFoldBeat: unknown = store.vtgFoldBeat
        const legacyFoldBeat =
          typeof hydratedFoldBeat === 'number' && Number.isFinite(hydratedFoldBeat)
            ? hydratedFoldBeat
            : 2
        store.vtgFoldBeat = Array.isArray(hydratedFoldBeat)
          ? [
              typeof hydratedFoldBeat[0] === 'number' && Number.isFinite(hydratedFoldBeat[0])
                ? hydratedFoldBeat[0]
                : 2,
              typeof hydratedFoldBeat[1] === 'number' && Number.isFinite(hydratedFoldBeat[1])
                ? hydratedFoldBeat[1]
                : 2,
            ]
          : [legacyFoldBeat, legacyFoldBeat]
        const hydratedFoldRepeat: unknown = store.vtgFoldRepeat
        const legacyFoldRepeat = typeof hydratedFoldRepeat === 'boolean' ? hydratedFoldRepeat : true
        store.vtgFoldRepeat = Array.isArray(hydratedFoldRepeat)
          ? [hydratedFoldRepeat[0] === true, hydratedFoldRepeat[1] === true]
          : [legacyFoldRepeat, legacyFoldRepeat]
        const hydratedFoldEvery: unknown = store.vtgFoldEvery
        const normalizeEvery = (value: unknown) =>
          typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 2
        const legacyFoldEvery = normalizeEvery(hydratedFoldEvery)
        store.vtgFoldEvery = Array.isArray(hydratedFoldEvery)
          ? [normalizeEvery(hydratedFoldEvery[0]), normalizeEvery(hydratedFoldEvery[1])]
          : [legacyFoldEvery, legacyFoldEvery]
        const hydratedFoldAlternate: unknown = store.vtgFoldAlternate
        const legacyFoldAlternate =
          typeof hydratedFoldAlternate === 'boolean' ? hydratedFoldAlternate : false
        store.vtgFoldAlternate = Array.isArray(hydratedFoldAlternate)
          ? [hydratedFoldAlternate[0] === true, hydratedFoldAlternate[1] === true]
          : [legacyFoldAlternate, legacyFoldAlternate]
        if (store.vtgFoldSpan !== 'eighth' && store.vtgFoldSpan !== 'quarter') {
          store.vtgFoldSpan = 'quarter'
        }
        if (typeof store.vtgPropertiesExpanded !== 'boolean') {
          store.vtgPropertiesExpanded = false
        }
        if (!['axis', 'twist', 'turns', null].includes(store.vtgActiveProperty)) {
          store.vtgActiveProperty = null
        }
        if (typeof store.customizeExpanded !== 'boolean') store.customizeExpanded = false
        if (typeof store.classicLayout !== 'boolean') store.classicLayout = true
      },
    },
  },
)
