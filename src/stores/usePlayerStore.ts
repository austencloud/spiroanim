// src\stores\SpiroAnim\usePlayerStore.ts

import type { RootDataFinal, PointInd, RootDataCompiled } from '@/types/AnimTypes'
import type { ImageExportRequest } from '@/types/ImageExportTypes'
import type {
  VideoExportProgress,
  VideoExportRequest,
  VideoExportStatus,
} from '@/types/VideoExportTypes'
import { RADIUS, ORIGRADIUS } from '@/domain/animation/AnimStruct'

import { rootCompile } from '@/math/animation/AnimFunc'
import { rootFinal, MOTIONTIMES, PROPTIMES, UNQTIMES } from '@/math/animation/PlayerFunc'

import { debounce } from '@/utils/UtilFunc'

const multi = RADIUS / ORIGRADIUS

export const DEFAULT_POSITION = [0, 0, -22 * multi] as const

export const usePlayerStore = (id: string) => {
  return defineStore(
    `sa-player-${id}`,
    () => {
      // shallowRefs and items which rapidly change, or we don't want Pinia to track
      const r = {
        CURRENT: ref(0), //       current milliseconds
        FPS: ref(0), //           FPS reported from Worker

        ORBIT: ref({
          position: [...DEFAULT_POSITION],
          target: [0, 0, 0],
        }),

        // Animation data is stored here
        ROOT: shallowRef<RootDataFinal>(
          rootFinal({
            // These will get overitten
            bpm: 120,
            prop: 0,
            color: 0,
            //scale: 10,
            guides: false,
            paths: true,
            travel: false,
            hands: true,
            arms: false,
            visible: true,
            nodes: true,
            anchors: true,
            smooth: true,
            props: [],
            aspectx: 16,
            aspecty: 9,
            distance: 22,
            thick: 4,
          }),
        ),

        // Pre-compiled data which gets sent to the worker
        COMPILED: shallowRef<RootDataCompiled>({} as RootDataCompiled),
      }

      const v = {
        raw: () => r,

        INDEX: ref(0), //         current combined Unique Time index
        EINDEX: computed(() => {
          let active = 0
          for (let index = 0; index < v.ETIMES.value.length; index++) {
            if (v.ETIMES.value[index]! > r.CURRENT.value) break
            active = index
          }
          return active
        }), //                    current displayed frame-set index

        MAX: ref(0), //           max milliseconds
        SELECTION: ref(false), // Whether progress bar works as a selection, or position
        COUNT: ref(0), //         Max setting when selection is enabled
        SELECTED: ref([0, 0]), // Current selection
        UPDATE: ref(Symbol()), // Forces an update

        PLAYING: ref(true), //    Turns Playing on/off
        TRACER: ref(false), //    Turns tracer mode on/off

        PTIMES: ref<number[][]>([[]]), // Individual times for each prop
        MTIMES: ref<number[][]>([[]]), // Individual Motion times for each prop
        UTIMES: ref<number[]>([]), //     Unique times derived from every track
        ETIMES: ref<number[]>([]), //     Times displayed by the active editor frame set

        PROJECTION: ref({
          fov: 45,
          near: 0.1,
          far: 1000,
          // NOTE: Aspect is calculated by width / height (therefor not stored here)
        }),

        // if [x]/[0] is NaN, meaning second value is 0, causes UI to use max width/height
        // Player uses maximum available width / height, and timeline displays with 4:3
        ASPECT: ref<[number, number]>([0, 0]),
        CANVAS_DIM: ref({ width: 0, height: 0 }),

        cameraCenter: ref(Symbol()), // When camera center is requested
        imageExportRequest: shallowRef<ImageExportRequest>(),
        videoExportRequest: shallowRef<VideoExportRequest>(),
        videoExportCancel: ref(Symbol()),
        videoExportStatus: ref<VideoExportStatus>('idle'),
        videoExportProgress: ref<VideoExportProgress>({ completedFrames: 0, totalFrames: 0 }),
        videoExportError: ref(''),

        trackClicks: ref<[number, PointInd, number][]>([]), // Receive click events from worker
      }

      // Recalculate Prop / Unique Times
      watchImmediate(r.ROOT, () => {
        r.COMPILED.value = rootCompile(r.ROOT.value)

        v.PTIMES.value = PROPTIMES(r.COMPILED.value)
        v.MTIMES.value = MOTIONTIMES(r.COMPILED.value)
        v.UTIMES.value = UNQTIMES([...v.PTIMES.value, ...v.MTIMES.value])
        if (v.ETIMES.value.length === 0) v.ETIMES.value = [...v.UTIMES.value]

        v.MAX.value = v.UTIMES.value.length > 0 ? v.UTIMES.value[v.UTIMES.value.length - 1]! : 0
        if (v.MAX.value < 0)
          // In case only one pattern is set
          v.MAX.value = 0
        if (v.MAX.value < r.CURRENT.value) r.CURRENT.value = v.MAX.value

        // Update aspect ratio
        if (r.ROOT.value.aspectx == 0 || r.ROOT.value.aspecty == 0) {
          v.ASPECT.value[0] = 0
          v.ASPECT.value[1] = 0
        } else {
          v.ASPECT.value[0] = r.ROOT.value.aspectx
          v.ASPECT.value[1] = r.ROOT.value.aspecty
        }
      })

      watchImmediate(v.ETIMES, (times) => {
        v.COUNT.value = Math.max(times.length - 1, 0)
        const maxIndex = v.COUNT.value
        const selected: [number, number] = [
          Math.min(v.SELECTED.value[0] ?? 0, maxIndex),
          Math.min(v.SELECTED.value[1] ?? 0, maxIndex),
        ]
        if (selected[0] !== v.SELECTED.value[0] || selected[1] !== v.SELECTED.value[1])
          v.SELECTED.value = selected
      })

      // Changing the configured viewing distance recenters the camera using the new distance.
      watch(
        () => r.ROOT.value.distance,
        () => (v.cameraCenter.value = Symbol()),
      )

      // Center Animation Event (triggers from the Center button,) triggers transform
      watch(v.cameraCenter, () => {
        r.ORBIT.value = {
          position: [0, 0, r.ROOT.value.distance * -1 * multi],
          target: [0, 0, 0],
        }
      })

      // Update INDEX when position in player changes
      watchImmediate(r.CURRENT, (current) => {
        const times = v.UTIMES.value

        if (times.length > 0 && current >= times[times.length - 1]!)
          v.INDEX.value = times.length - 1

        for (let i = 0; i < times.length - 1; i++)
          if (current >= times[i]! && current < times[i + 1]!) {
            v.INDEX.value = i
            return
          }

        if (current >= times[times.length - 1]!) v.INDEX.value = times.length - 1
        else v.INDEX.value = 0
      })

      // Manually save, as persist module appears to be saving anytime any value is modified
      watch(
        [v.PLAYING, v.TRACER /*, r.ORBIT*/],
        debounce(([PLAYING, TRACER /*, ORBIT*/]: [boolean, boolean /*, typeof r.ORBIT.value*/]) => {
          localStorage.setItem(`sa-player-${id}`, JSON.stringify({ PLAYING, TRACER /*, ORBIT*/ }))
        }, 100),
      )

      // Load from localStorage on init
      const saved = localStorage.getItem(`sa-player-${id}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as {
            PLAYING?: boolean
            TRACER?: boolean
            ORBIT?: typeof r.ORBIT.value
          }
          v.PLAYING.value = parsed.PLAYING ?? v.PLAYING.value
          v.TRACER.value = parsed.TRACER ?? v.TRACER.value
          r.ORBIT.value = parsed.ORBIT ?? r.ORBIT.value
        } catch (e) {
          console.warn('Failed to parse saved player settings:', e)
        }
      }

      return v
    }, //,
    //{
    //  persist: {
    //    pick: ['PLAYING', 'TRACER', 'ORBIT'],
    //  },
    //}
  )()
}
