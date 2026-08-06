import type {
  PropDataFinal,
  AnimData,
  AnimDataCompiled,
  FrameSet,
  MotionData,
  MotionDataCompiled,
} from '@/types/AnimTypes'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { UNQTIMES } from '@/math/animation/PlayerFunc'

export interface AnimIdent {
  prop: number
  index: number
}

const MIN_INCREMENT = 30

function calculateIncrement(value: number) {
  let divisor = 360

  // Calculate the Greatest Common Denominator (GCD)
  while (divisor !== 0) [value, divisor] = [divisor, value % divisor]

  // Reduce the value while maintaining divisibility and respecting the soft minimum
  while (value % 2 === 0) {
    const halved = value / 2
    if (halved >= MIN_INCREMENT) value = halved
    else break
  }

  return value
}

export const usePropertiesStore = (id: string) => {
  return defineStore(
    `sa-properties-${id}`,
    () => {
      const playerStore = usePlayerStore(id)
      const { ROOT, COMPILED } = playerStore.raw()
      const { EINDEX, SELECTION, SELECTED, PTIMES, MTIMES, UTIMES, ETIMES } =
        storeToRefs(playerStore)

      // Default collapsed state
      const pMOBILE = ref<Record<string, string[]>>({
        anim: ['anim'],
        advanced: ['advanced'],
        motion: ['motion'],
      })

      const START = ref(0)
      const END = ref(0)
      const ACTIVE = ref<number[]>([])

      const IDENT = ref<AnimIdent[]>([])
      const ANIMS = ref<AnimData[]>([])
      const CMPDS = ref<AnimDataCompiled[]>([])
      const MOTIONS = ref<MotionData[]>([])
      const MCOMPDS = ref<MotionDataCompiled[]>([])
      const PROPS = ref<PropDataFinal[]>([])

      const pBOUND = ref(true)
      const pMULTI = ref(false)
      const pFRAMES = ref<FrameSet>('animation')
      const pSELECTED = ref<Record<number, boolean>>({ 0: true })
      const pRADIO = ref(-1)

      // Default expanded state "Desktop Mode"
      const pDESKTOP = ref<Record<string, string[]>>({
        anim: ['anim'],
        advanced: ['advanced'],
        base: ['base'],
        root: ['root'],
        settings: ['settings'],
        manage: ['manage'],
        rotate: ['rotate'],
        motion: ['motion'],
      })
      const pEXPANDED = ref<Record<string, string[]>>(pMOBILE.value)

      watch(
        [COMPILED, EINDEX, SELECTION, SELECTED, pBOUND, pSELECTED, pFRAMES],
        () => {
          const propTimes = pFRAMES.value === 'animation' ? PTIMES.value : MTIMES.value
          const ownTimes = UNQTIMES(propTimes)
          const overallEnd = UTIMES.value.at(-1) ?? 0
          const unqTimes =
            ownTimes.length === 0
              ? [0]
              : overallEnd > ownTimes.at(-1)!
                ? [...ownTimes, overallEnd]
                : ownTimes
          if (
            unqTimes.length !== ETIMES.value.length ||
            unqTimes.some((time, index) => time !== ETIMES.value[index])
          )
            ETIMES.value = unqTimes
          let activeIndex = 0
          const current = playerStore.raw().CURRENT.value
          for (let i = 0; i < unqTimes.length; i++) {
            if (unqTimes[i]! > current) break
            activeIndex = i
          }
          START.value = unqTimes[SELECTION.value ? SELECTED.value[0]! : activeIndex] ?? 0
          END.value = unqTimes[SELECTION.value ? SELECTED.value[1]! : activeIndex] ?? 0
          ANIMS.value = []
          CMPDS.value = []
          MOTIONS.value = []
          MCOMPDS.value = []
          IDENT.value = []
          PROPS.value = []
          ACTIVE.value = []
          for (let i = 0; i < propTimes.length; i++) {
            const pt = propTimes[i]!
            let add = false
            if (
              SELECTION.value &&
              propTimes.length &&
              pBOUND.value &&
              (!pt.includes(START.value) || !pt.includes(END.value))
            )
              continue
            for (let j = 0; j < pt.length; j++) {
              const val = pt[j]!
              if (val >= START.value && val <= END.value) {
                add = true
                if (pSELECTED.value[i]) {
                  if (pFRAMES.value === 'animation') {
                    ANIMS.value.push(ROOT.value.props[i]!.anim[j]!)
                    CMPDS.value.push(COMPILED.value.props[i]!.anim[j]!)
                  } else {
                    MOTIONS.value.push(ROOT.value.props[i]!.motion[j]!)
                    MCOMPDS.value.push(COMPILED.value.props[i]!.motion[j]!)
                  }
                  IDENT.value.push({
                    prop: i,
                    index: j,
                  })
                }
              }
            }
            if (add || EINDEX.value == 0) {
              ACTIVE.value.push(i)
              if (pSELECTED.value[i]) PROPS.value.push(ROOT.value.props[i]!)
            }
          }
          for (const i in pSELECTED.value)
            if (pSELECTED.value[i]) {
              pRADIO.value = parseInt(i, 10)
              break
            }
        },
        { immediate: true /*, deep: true*/ },
      )

      watchImmediate([pRADIO, pMULTI], () => {
        const val = pRADIO.value
        if (ACTIVE.value.indexOf(val) != -1 && !pMULTI.value) {
          for (const i in pSELECTED.value) pSELECTED.value[i] = false
          pSELECTED.value[val] = true
        }
      })

      return {
        pMOBILE,

        pDESKTOP,

        pBOUND,
        pMULTI,
        pFRAMES,
        pSELECTED,
        pRADIO,

        pINPUT: ref(''),
        pEXPANDED,

        IDENT,
        ANIMS,
        CMPDS,
        MOTIONS,
        MCOMPDS,
        PROPS,

        START,
        END,
        ACTIVE,

        ARCDENOM: computed(() => calculateIncrement(CMPDS.value[0]?.arc ?? 90)),
      }
    },
    {
      persist: {
        pick: [/*'pMOBILE',*/ 'pDESKTOP', 'pBOUND', 'pMULTI'],
      },
    },
  )()
}
