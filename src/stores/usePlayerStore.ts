// src\stores\SpiroAnim\usePlayerStore.ts

import type { CameraPose, RootDataFinal, PointInd, RootDataCompiled } from '@/types/AnimTypes'
import type { ImageExportRequest } from '@/types/ImageExportTypes'
import type {
  VideoExportProgress,
  VideoExportRequest,
  VideoExportStatus,
} from '@/types/VideoExportTypes'

import { rootCompile } from '@/math/animation/AnimFunc'
import {
  CAMERATIMES,
  rootFinal,
  MOTIONTIMES,
  PROPTIMES,
  UNQTIMES,
} from '@/math/animation/PlayerFunc'

import { debounce } from '@/utils/UtilFunc'

export const usePlayerStore = (id: string) => {
  return defineStore(
    `sa-player-${id}`,
    () => {
      // shallowRefs and items which rapidly change, or we don't want Pinia to track
      const r = {
        CURRENT: ref(0), //       current milliseconds
        FPS: ref(0), //           FPS reported from Worker

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

        // Optional session-only animation rendered by the Player without replacing ROOT.
        PLAYBACK_OVERRIDE: shallowRef<RootDataFinal>(),

        // Pre-compiled data which gets sent to the worker
        COMPILED: shallowRef<RootDataCompiled>({} as RootDataCompiled),
        PLAYBACK_COMPILED: shallowRef<RootDataCompiled>({} as RootDataCompiled),
      }

      const v = {
        raw: () => r,

        PLAYBACK_ROOT: computed(() => r.PLAYBACK_OVERRIDE.value ?? r.ROOT.value),
        PLAYBACK_OVERRIDE_ACTIVE: computed(() => r.PLAYBACK_OVERRIDE.value !== undefined),

        setPlaybackOverride: (animation: RootDataFinal) => {
          r.PLAYBACK_OVERRIDE.value = animation
        },
        clearPlaybackOverride: () => {
          r.PLAYBACK_OVERRIDE.value = undefined
        },

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
        PLAYBACK_MAX: ref(0), //  max milliseconds for ROOT or its temporary Player override
        SELECTION: ref(false), // Whether progress bar works as a selection, or position
        COUNT: ref(0), //         Max setting when selection is enabled
        SELECTED: ref([0, 0]), // Current selection
        UPDATE: ref(Symbol()), // Forces an update

        PLAYING: ref(true), //    Turns Playing on/off
        TRACER: ref(false), //    Turns tracer mode on/off

        PTIMES: ref<number[][]>([[]]), // Individual times for each prop
        MTIMES: ref<number[][]>([[]]), // Individual Motion times for each prop
        CTIMES: ref<number[]>([0]), // Camera frame times
        UTIMES: ref<number[]>([]), //     Unique times derived from every track
        ETIMES: ref<number[]>([]), //     Times displayed by the active editor frame set

        PROJECTION: ref({
          fov: 45,
          near: 0.1,
          far: 1000,
          // NOTE: Aspect is calculated by width / height (therefor not stored here)
        }),

        // [x]/[0] is NaN, causing the relevant canvas to use its maximum width and height.
        // ASPECT follows editable ROOT; PLAYBACK_ASPECT follows the temporary override when active.
        ASPECT: ref<[number, number]>([0, 0]),
        PLAYBACK_ASPECT: ref<[number, number]>([0, 0]),
        CANVAS_DIM: ref({ width: 0, height: 0 }),

        freeCamera: ref(false), // Persisted manual camera ownership mode
        freeCameraPose: shallowRef<CameraPose>(), // Current session-only manual pose
        cameraReset: ref(Symbol()), // Requests the initial authored pose without changing the mode
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
        const previousTimes = v.UTIMES.value
        const displayedOverallTimes =
          v.ETIMES.value.length === previousTimes.length &&
          v.ETIMES.value.every((time, index) => time === previousTimes[index])
        r.COMPILED.value = rootCompile(r.ROOT.value)

        v.PTIMES.value = PROPTIMES(r.COMPILED.value)
        v.MTIMES.value = MOTIONTIMES(r.COMPILED.value)
        v.CTIMES.value = CAMERATIMES(r.COMPILED.value)
        v.UTIMES.value = UNQTIMES([...v.PTIMES.value, ...v.MTIMES.value, v.CTIMES.value])
        if (v.ETIMES.value.length === 0 || displayedOverallTimes)
          v.ETIMES.value = [...v.UTIMES.value]

        v.MAX.value = v.UTIMES.value.length > 0 ? v.UTIMES.value[v.UTIMES.value.length - 1]! : 0
        if (v.MAX.value < 0)
          // In case only one pattern is set
          v.MAX.value = 0
        // Update aspect ratio
        if (r.ROOT.value.aspectx == 0 || r.ROOT.value.aspecty == 0) {
          v.ASPECT.value[0] = 0
          v.ASPECT.value[1] = 0
        } else {
          v.ASPECT.value[0] = r.ROOT.value.aspectx
          v.ASPECT.value[1] = r.ROOT.value.aspecty
        }
      })

      // Compile the animation currently owned by the Player. Clearing the override makes this
      // computed source point directly back to the latest ROOT without copying or replacing it.
      watchImmediate(v.PLAYBACK_ROOT, (animation) => {
        const compiled = rootCompile(animation)
        r.PLAYBACK_COMPILED.value = compiled

        const propTimes = PROPTIMES(compiled)
        const motionTimes = MOTIONTIMES(compiled)
        const cameraTimes = CAMERATIMES(compiled)
        const times = UNQTIMES([...propTimes, ...motionTimes, cameraTimes])
        v.PLAYBACK_MAX.value = Math.max(times.at(-1) ?? 0, 0)
        if (v.PLAYBACK_MAX.value < r.CURRENT.value) r.CURRENT.value = v.PLAYBACK_MAX.value

        if (animation.aspectx === 0 || animation.aspecty === 0) {
          v.PLAYBACK_ASPECT.value = [0, 0]
        } else {
          v.PLAYBACK_ASPECT.value = [animation.aspectx, animation.aspecty]
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
        [v.PLAYING, v.TRACER, v.freeCamera],
        debounce(([PLAYING, TRACER, freeCamera]: [boolean, boolean, boolean]) => {
          localStorage.setItem(`sa-player-${id}`, JSON.stringify({ PLAYING, TRACER, freeCamera }))
        }, 100),
      )

      // Load from localStorage on init
      const saved = localStorage.getItem(`sa-player-${id}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as {
            PLAYING?: boolean
            TRACER?: boolean
            freeCamera?: boolean
          }
          v.PLAYING.value = parsed.PLAYING ?? v.PLAYING.value
          v.TRACER.value = parsed.TRACER ?? v.TRACER.value
          v.freeCamera.value = parsed.freeCamera ?? v.freeCamera.value
        } catch (e) {
          console.warn('Failed to parse saved player settings:', e)
        }
      }

      return v
    }, //,
    //{
    //  persist: {
    //    pick: ['PLAYING', 'TRACER', 'freeCamera'],
    //  },
    //}
  )()
}
