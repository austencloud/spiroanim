<template>
  <div class="timeline" :style="timelineStyle">
    <div ref="eScroll" class="scrollbar" :style="scrollStyle">
      <QuickSlotsControl
        v-if="quickSlotCount > 0"
        class="timeline-quick-slots"
        @apply="emit('quickSlotApply', $event)"
        @save="emit('quickSlotSave', $event)"
      />
      <div
        class="timeline-scroll-content"
        :class="{ 'timeline-scroll-content--with-quick-slots': quickSlotCount > 0 }"
      >
        <div :style="gridStyle">
          <div
            v-for="(time, index) in ETIMES"
            ref="eCells"
            :key="`u${time}`"
            :style="thumbStyle"
            class="timeline-cell"
            :class="{
              'timeline-cell--selected': isThumbnailSelected(index),
              'timeline-cell--placeholder': isPlaceholder(index),
            }"
          >
            <span
              v-for="circle in circles[index]"
              :key="`u${time}-p${circle.prop}`"
              class="circle"
              :class="{ 'circle--prop-visible': isPropMarkerVisible(circle.prop) }"
              :style="circleCSS(circle.prop, circle.color)"
            />
            <img
              ref="eThumbs"
              src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
              :data-index="index"
              :alt="`Animation thumbnail ${index + 1}`"
              class="thumb"
              :style="thumbStyle"
              role="button"
              tabindex="0"
              @click="thumbClick(index, $event)"
              @keydown.enter="thumbClick(index, $event)"
              @keydown.space.prevent="thumbClick(index, $event)"
            />
            <AppTooltip class="thumbStart" :text="showFrameIndexes ? 'Index: Beat' : 'Beats'">
              <template #activator="{ props: tooltipProps }">
                <span v-bind="tooltipProps"
                  ><span v-if="showFrameIndexes" class="thumbIndex">{{ index + 1 }}: </span
                  >{{ msToBeat(time, ROOT.bpm) }}</span
                >
              </template>
            </AppTooltip>
          </div>
        </div>
        <div :style="activeStyle"></div>
        <div class="cursor" :style="cursorStyle"></div>
      </div>
    </div>
    <div class="timeline-value-control" role="group" aria-label="Timeline Value">
      <AppTooltip text="Decrease Timeline Columns">
        <template #activator="{ props: tooltipProps }">
          <button
            v-bind="tooltipProps"
            type="button"
            aria-label="Decrease Timeline Value"
            :disabled="columnOffset <= MIN_TIMELINE_COLUMN_OFFSET"
            @click="decreaseColumnOffset"
          >
            <BaseIcon :path="mdiMinus" :size="20" />
          </button>
        </template>
      </AppTooltip>
      <output aria-live="polite">{{ columnOffset }}</output>
      <AppTooltip text="Increase Timeline Columns">
        <template #activator="{ props: tooltipProps }">
          <button
            v-bind="tooltipProps"
            type="button"
            aria-label="Increase Timeline Value"
            :disabled="columnOffset >= MAX_TIMELINE_COLUMN_OFFSET"
            @click="increaseColumnOffset"
          >
            <BaseIcon :path="mdiPlus" :size="20" />
          </button>
        </template>
      </AppTooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
// src\components\SpiroAnim\AnimTimeline.vue

import AppTooltip from '@/components/AppTooltip.vue'
import BaseIcon from '@/components/icons/BaseIcon.vue'
import QuickSlotsControl from '@/features/concepts/components/QuickSlotsControl.vue'
import { usePingPongValue, easeInOut } from '@/composables/usePingPongValue'
import { throttleTrailing, nextFrame, toColor } from '@/utils/UtilFunc'
import { COLSET } from '@/domain/animation/AnimStruct'
import { msToBeat } from '@/math/animation/PlayerFunc'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useViewportStore } from '@/stores/useViewportStore'
import { useMainPaneStore } from '@/stores/useMainPaneStore'
import { usePropertiesStore } from '@/features/editor/stores/usePropertiesStore'
import { useEditorAccessStore } from '@/features/editor/stores/useEditorAccessStore'
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'
import {
  MAX_TIMELINE_COLUMN_OFFSET,
  MIN_TIMELINE_COLUMN_OFFSET,
  useTimelineSettingsStore,
} from '@/stores/useTimelineSettingsStore'
import { createMessageChannel } from '@/workers/createMessageChannel'
import type { AnimBridgeMap } from '@/workers/animation/AnimWorkerTypes'
import { mdiMinus, mdiPlus } from '@mdi/js'

const emit = defineEmits<{
  quickSlotApply: [path: string]
  quickSlotSave: [slot: number]
}>()

const props = withDefaults(
  defineProps<{
    dim: { width: number; height: number; perc: number }
    landscape?: boolean
    store?: string
    cols?: number
  }>(),
  {
    store: 'main',
    landscape: false,
    cols: undefined,
  },
)

const { parents: mainViews } = storeToRefs(useMainPaneStore())
const { quickSlotCount } = storeToRefs(useConceptsStore())
const { pSELECTED, pFRAMES, showFullTimeline } = storeToRefs(usePropertiesStore(props.store))
const { editorLoaded } = storeToRefs(useEditorAccessStore())
const timelineSettingsStore = useTimelineSettingsStore()
const { decreaseColumnOffset, increaseColumnOffset, adjustedColumnCount } = timelineSettingsStore
const { columnOffset } = storeToRefs(timelineSettingsStore)

// Keep the local object stable while following replacement dimension props from pane placement.
const dim = reactive({ ...props.dim })
watchEffect(() => Object.assign(dim, props.dim))

// Create worker and message channel
const worker = new Worker(new URL('@/workers/AnimWorker.ts', import.meta.url), { type: 'module' })
const msgChnl = createMessageChannel<AnimBridgeMap>(worker)
const { send, call, /*on, register,*/ warnStr } = msgChnl

// Send warning string to worker, gets sent back, then register it
call('warnStr', 'Player').then(warnStr)

const playerStore = usePlayerStore(props.store)
const { ROOT, COMPILED, CURRENT } = playerStore.raw()
const {
  ETIMES,
  PLAYING,
  UPDATE,
  SELECTION,
  SELECTED,
  PTIMES,
  MTIMES,
  CTIMES,
  ASPECT,
  PROJECTION,
  MAX,
} = storeToRefs(playerStore)
const { pixelRatio } = storeToRefs(useViewportStore())

const eScroll = ref<HTMLElement>()
const eCells = ref<HTMLElement[]>([])
const eThumbs = ref<HTMLImageElement[]>([])

interface TimelineCircle {
  color: number
  prop: number
}

const circles = ref<TimelineCircle[][]>([])

const frameIndex = computed(() => {
  let active = 0
  for (let index = 0; index < ETIMES.value.length; index++) {
    if (ETIMES.value[index]! > CURRENT.value) break
    active = index
  }
  return active
})

const ownTimes = computed(() => {
  const frameTimes =
    pFRAMES.value === 'animation'
      ? PTIMES.value
      : pFRAMES.value === 'motion'
        ? MTIMES.value
        : [CTIMES.value]
  const displayedTimes =
    pFRAMES.value === 'camera'
      ? frameTimes
      : !editorLoaded.value || showFullTimeline.value
        ? PTIMES.value
        : frameTimes.filter((_, index) => pSELECTED.value[index])
  return [...new Set(displayedTimes.flat())].sort((first, second) => first - second)
})

const showFrameIndexes = computed(() => {
  const showAnimationFrames = !editorLoaded.value || showFullTimeline.value

  if (!showAnimationFrames && pFRAMES.value === 'camera') {
    return ROOT.value.camera.some((frame) => frame.orbit?.beats !== undefined)
  }

  return ROOT.value.props.some((prop, index) => {
    if (!showAnimationFrames && pSELECTED.value[index] !== true) return false

    const frames = showAnimationFrames || pFRAMES.value === 'animation' ? prop.anim : prop.motion
    return frames?.some((frame) => frame.beats !== undefined) === true
  })
})

const gridTemplateColumns = ref<CSSProperties['grid-template-columns']>('repeat(1, 100%)')
const gridAutoRows = ref<CSSProperties['grid-auto-rows']>('100px')

// Vars for thumbnail image requests
let requesting = false //            Prevents concurrent image requests
let repeat = false //                True when images have been requested during a request
let imageGeneration = 0 //            Invalidates responses requested before timeline/data changes
let imageRefreshQueued = false //     Coalesces simultaneous reactive invalidations
let imgsLoaded: boolean[] = [] //    Tracks if images are up to date
const imgsVisible: boolean[] = [] // Tracks if thumbnail is visible

// Makes items in the image thicker than player
const girth = 2

// Values for thumbnail double click detection
let lastClick = 0
let lastIndex = -1

// Tracks visible thumbnails
let thumbObserver: IntersectionObserver

// Tracks cell dimensions
const cellDim = reactive({ width: 0, height: 0 })

// Grid position / layout properties
const gridPos = reactive({
  col: 0,
  row: 0,
  cols: 1,
  rows: 1, // Not used but gets set
})

// Active layer properties
const activePos = reactive({
  left: 0,
  top: 0,
  height: 20,
  bottom: 1,
})

// Cursor properties
const cursorPos = reactive({
  left: 0,
  top: 0,
  width: 10,
})

// Values for animating the Cursor animation
const cursorWidth = {
  playing: 10,
  min: 6,
  max: 12,
}

// Cursor animation handler
const { value: cursorAnimated, animating: cursorAnimating } = usePingPongValue(
  cursorWidth.min,
  cursorWidth.max,
  250,
  easeInOut,
)

// Calculates the aspect ratio from values in the store
const aspectRatio = computed(() => ASPECT.value[0] / ASPECT.value[1])

const selectedRange = computed<readonly [number, number]>(() => {
  if (!SELECTION.value) return [frameIndex.value, frameIndex.value]

  const start = SELECTED.value[0] ?? 0
  const end = SELECTED.value[1] ?? start
  return start <= end ? [start, end] : [end, start]
})

onMounted(() => {
  watchImmediate([cellDim, pixelRatio], () => {
    send('resize', { width: cellDim.width, height: cellDim.height, ratio: pixelRatio.value })
  })
  watchImmediate([PROJECTION, cellDim], () => {
    send('projection', {
      ...toRaw(PROJECTION.value),
      aspect: cellDim.width / cellDim.height,
    })
  })

  // Initialize worker, which creates the offscreenCanvas
  call('initialize', { girth, timeline: true, thumbnail: true })
    .then((success) => {
      if (!success) console.warn('Timeline Worker reported a failure to initialize.')
    })
    .catch((err) => {
      console.warn('Initialization of Timeline Worker failed.', err)
    })

  // Send data NOW, and when it updates
  watchImmediate(COMPILED, (data, old) => {
    send('data', toRaw(data))
    if (old !== undefined) invalidateImages()
  })

  // Observer for tracking visible thumbnails, requesting images from worker
  thumbObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const target = entry.target as HTMLElement
        const indexStr = target.dataset.index
        const index = indexStr !== undefined ? parseInt(indexStr) : NaN
        if (!isNaN(index)) imgsVisible[index] = entry.isIntersecting
      })
      requestImages()
    },
    { root: eScroll.value, threshold: 0.05 },
  )

  // Update the observer and reset image loaded tracking
  watch(
    eThumbs,
    (newThumbs, oldThumbs) => {
      oldThumbs?.forEach((o) => thumbObserver.unobserve(o))
      imgsLoaded = Array.from({ length: ETIMES.value.length }, () => false)
      newThumbs.forEach((o) => thumbObserver.observe(o))
    },
    // NOTE: Deep is necessary here
    { deep: true, immediate: true },
  )

  // Handle resizing based on eScroll's realtime dimensions, and update gridPos.cols
  // This eliminates race conditions that I previously ran into
  const { width, height } = useElementBounding(eScroll)
  watchImmediate(
    [width, height, aspectRatio, columnOffset, () => props.cols],
    ([width, height, aspect]) => {
      // If 0's this executes again
      if (width === 0 || height === 0) return

      // Use clientWidth to exclude the scroll bar
      const sWidth = eScroll.value?.clientWidth ?? 0
      const baseColumnCount = props.cols ?? calcCols(dim.perc, props.landscape)
      gridPos.cols = adjustedColumnCount(baseColumnCount)
      gridPos.rows = Math.ceil(ETIMES.value.length / gridPos.cols)

      // Calculate width / height of the thumbnails
      cellDim.width = Math.floor(sWidth / gridPos.cols)
      cellDim.height = Math.floor(isNaN(aspect) ? cellDim.width * 0.75 : cellDim.width / aspect)

      // Layout CSS Updates
      gridTemplateColumns.value = `repeat(${gridPos.cols}, ${100 / gridPos.cols}%)`
      gridAutoRows.value = `${cellDim.height}px`
    },
  )

  // Request images and scroll to active item when we've resized
  // Moved out of resize handler to resolve a race condition
  watch(cellDim, () => {
    scrollActive()
    invalidateImages()
  })

  // Calculate current row and column
  watchEffect(() => {
    gridPos.row = Math.floor(frameIndex.value / gridPos.cols)
    gridPos.col = frameIndex.value % gridPos.cols
  })

  // Reposition the active layer
  watchEffect(() => {
    activePos.left = cellDim.width * gridPos.col
    activePos.top =
      cellDim.height * gridPos.row + cellDim.height - activePos.height - activePos.bottom
  })

  // Pause cursor animation when playing
  watchEffect(() => {
    const playerHidden = mainViews.value.player == 'hidden'
    cursorAnimating.value = !PLAYING.value || playerHidden
  })

  // Animate and move the cursor
  // This was a source of lag in dev env and dev tools open
  // moved from watchEffect to watch and applied a throttle
  watch(
    [
      CURRENT,
      frameIndex,
      ETIMES,
      cursorAnimated,
      cursorAnimating,
      () => [cellDim.width, cellDim.height],
    ],
    throttleTrailing(() => {
      // Cursor animation
      const anim = cursorAnimated.value
      const cursorW = cursorAnimating.value ? anim : cursorWidth.playing
      cursorPos.width = cursorW

      // Calculate core values
      const { width: cellW, height: cellH } = cellDim
      const { cols, col, row } = gridPos
      const { start, end } = cursorOffset(col, cols, cellW, cursorW)
      const perc = framePerc(CURRENT.value, frameIndex.value, ETIMES.value)

      // Final assignment
      cursorPos.left = col * cellW + start + (end - start) * perc
      cursorPos.top = row * cellH
    }, 16), // Close to 60fps limit cap
  )

  // Update circles / colors data
  watchImmediate(
    [ROOT, pFRAMES, showFullTimeline, editorLoaded, PTIMES, MTIMES, CTIMES, ETIMES],
    ([data]) => {
      const result: TimelineCircle[][] = []
      if (!ETIMES.value?.length) return

      // Loop through each unique timestamp
      for (let i = 0; i < ETIMES.value.length; i++) {
        const time = ETIMES.value[i]!
        const row: TimelineCircle[] = []

        const displayedPropTimes =
          pFRAMES.value === 'camera'
            ? []
            : !editorLoaded.value || showFullTimeline.value
              ? PTIMES.value
              : pFRAMES.value === 'animation'
                ? PTIMES.value
                : MTIMES.value
        for (let j = 0; j < displayedPropTimes.length; j++) {
          const times = displayedPropTimes[j]!
          if (times.includes(time)) {
            const prop = data.props[j]!
            const colIndex = prop.color ?? data.color
            // Prop colors are fixed animation content rather than theme UI colors.
            row.push({ color: COLSET[colIndex]![0], prop: j })
          }
        }
        result.push(row)
      }
      circles.value = result
    },
  )

  watch([pFRAMES, ETIMES], invalidateImages, { deep: true })

  // Auto scroll to the active element as row
  watch([() => gridPos.row, PLAYING], scrollActive, { immediate: true })

  // Truncate lengths if the displayed frame set shrinks
  watch(
    () => ETIMES.value.length,
    (len) => {
      truncateArray(eCells.value, len)
      truncateArray(eThumbs.value, len)
    },
  )
})

onBeforeUnmount(() => {
  // Unmount Cleanup
  thumbObserver.disconnect()
  call('dispose', undefined).then(() => {
    worker.terminate()
  })
})

// Column count logic
function calcCols(perc: number, landscape: boolean): number {
  if (landscape) {
    if (perc >= 80) return 4
    if (perc >= 40) return 3
    if (perc > 20) return 2
    return 1
  } else {
    if (perc >= 80) return 1
    if (perc >= 40) return 2
    if (perc > 20) return 3
    return 4
  }
}

// Percentage completed of the current time block
function framePerc(ms: number, i: number, times: number[] = ETIMES.value) {
  if (times.length === 1 && MAX.value > 0) return Math.max(0, Math.min(ms / MAX.value, 1))
  if (i >= times.length - 1) return 0

  const startTime = times[i] ?? 0
  const endTime = times[i + 1] ?? MAX.value
  const dura = endTime - startTime

  // Fallback: if no next frame, snap to start
  return !isFinite(dura) ? 0 : (ms - startTime) / dura
}

// Calculates offsets for Cursor to always be within bounds and fluid
function cursorOffset(col: number, cols: number, cellW: number, cursorW: number) {
  // Only one column: left edge → right edge
  if (cols === 1) {
    return {
      start: 0,
      end: cellW - cursorW,
    }
  }
  // First column: left edge → center-right
  if (col === 0) {
    return {
      start: 0,
      end: cellW - cursorW / 2,
    }
  }
  // Last column: center-left → right edge
  if (col === cols - 1) {
    return {
      start: -cursorW / 2,
      end: cellW - cursorW,
    }
  }
  // Middle column: center-left → center-right
  return {
    start: -cursorW / 2,
    end: cellW - cursorW / 2,
  }
}

// Determines what percentage of a cell is visible
function getScrollVisibleHeightPercent(el: HTMLElement, scrollContainer: HTMLElement): number {
  const elRect = el.getBoundingClientRect()
  const containerRect = scrollContainer.getBoundingClientRect()

  const topVisible = Math.max(containerRect.top, elRect.top)
  const bottomVisible = Math.min(containerRect.bottom, elRect.bottom)

  const visibleHeight = Math.max(0, bottomVisible - topVisible)
  return visibleHeight / elRect.height
}

// Scrolls to the active thumbnail
async function scrollActive() {
  await nextFrame() // Fix from old version of SpiroAnim on old iPad, kept just in case
  const active = thumbnailAt(frameIndex.value)
  const scroll = eScroll.value
  if (scroll == undefined || active == undefined) return
  if (!imgsVisible[frameIndex.value] || getScrollVisibleHeightPercent(active, scroll) < 1) {
    const activeRect = active.getBoundingClientRect()
    const scrollRect = scroll.getBoundingClientRect()
    scroll.scrollTop += activeRect.top - scrollRect.top - scroll.clientTop
  }
}

function thumbnailAt(index: number): HTMLImageElement | undefined {
  return (
    eScroll.value?.querySelector<HTMLImageElement>(`.thumb[data-index="${index}"]`) ?? undefined
  )
}

// Shorthand function to shorten an array when data changes
function truncateArray(arr: unknown[], len: number) {
  if (arr.length > len) arr.length = len
}

// Handles thumbnail click logic: toggles selection on double click, updates CURRENT time
function thumbClick(index: number, event: MouseEvent | KeyboardEvent) {
  const now = performance.now()
  const editorVisible = mainViews.value.editor == 'hidden'
  const currentIndex = frameIndex.value
  const selectionWasActive = SELECTION.value
  UPDATE.value = Symbol()

  if (event.shiftKey) {
    const anchor = selectionWasActive ? (SELECTED.value[0] ?? currentIndex) : currentIndex
    const selectedEnd = SELECTED.value[1] ?? anchor
    const end = selectionWasActive
      ? index < anchor
        ? selectedEnd
        : Math.min(index + 1, ETIMES.value.length - 1)
      : Math.min(Math.max(anchor, index) + 1, ETIMES.value.length - 1)
    SELECTION.value = true
    SELECTED.value[0] = Math.min(anchor, index)
    SELECTED.value[1] = Math.max(end, index)
  } else if (lastIndex === index && now - lastClick <= 500) {
    // Toggle SELECTION mode on double click (within 500ms)
    SELECTION.value = !SELECTION.value
    //if (SELECTION.value && !editorVisible) PLAYING.value = true
  } else {
    lastClick = now
    lastIndex = index
  }

  // Update current time to selected index
  CURRENT.value = ETIMES.value[index]!

  if (SELECTION.value && !event.shiftKey) {
    // Select range: [index, index+1] (or clamp to last index)
    const max = ETIMES.value.length - 1
    SELECTED.value[0] = index
    SELECTED.value[1] = Math.min(index + 1, max)
  } // else if (!editorVisible) {
  //  PLAYING.value = false
  //}
  if (!editorVisible) PLAYING.value = false

  // Pointer clicks should not leave a focus ring when a modifier key is pressed afterward.
  // Keep focus intact for keyboard activation so thumbnails remain keyboard navigable.
  const clickedThumbnail = event.currentTarget
  if (
    event instanceof MouseEvent &&
    event.detail > 0 &&
    clickedThumbnail instanceof HTMLImageElement
  )
    clickedThumbnail.blur()
}

// Requests images from worker upon events in onMounted
function requestImages() {
  if (dim.width <= 0 || dim.height <= 0) return

  if (requesting) {
    repeat = true
    return
  } else {
    // Determine items which are visible and need to be loaded
    const visible = []
    for (let i = 0; i < imgsVisible.length; i++)
      if (imgsVisible[i] && !imgsLoaded[i]) visible.push(i)
    // Request images as needed
    if (visible.length) {
      const generation = imageGeneration
      const requests = visible.map((index) => ({ index, time: ETIMES.value[index] ?? 0 }))
      const requestedTimes = new Map(requests.map(({ index, time }) => [index, time]))
      requesting = true
      call('reqimgs', requests)
        .then((urls) => {
          for (const strI in urls) {
            const i = Number(strI)
            const url = urls[i]!
            const img = thumbnailAt(i)
            if (
              generation !== imageGeneration ||
              requestedTimes.get(i) !== ETIMES.value[i] ||
              !img
            ) {
              if (url.startsWith('blob:')) URL.revokeObjectURL(url)
              continue
            }

            const prev = img.src

            // Defer revoke until after new image has loaded
            const revoke = () => {
              if (prev.startsWith('blob:')) URL.revokeObjectURL(prev)
              img.removeEventListener('load', revoke)
              img.removeEventListener('error', revoke)
            }

            img.addEventListener('load', revoke)
            img.addEventListener('error', revoke)

            img.src = url
            imgsLoaded[i] = true
          }
        })
        .catch((error: unknown) => {
          console.warn('Timeline thumbnail request failed.', error)
        })
        .finally(() => {
          requesting = false
          if (repeat) {
            repeat = false
            requestImages()
          }
        })
    }
  }
}

function invalidateImages() {
  imageGeneration++
  imgsLoaded = Array.from({ length: ETIMES.value.length }, () => false)
  if (imageRefreshQueued) return

  imageRefreshQueued = true
  void nextTick(() => {
    imageRefreshQueued = false
    requestImages()
  })
}

function circleCSS(prop: number, color: number): CSSProperties {
  const size = 6
  const left = 3 + prop * size + prop * 3
  return {
    left: left + 'px',
    'background-color': toColor(color),
    //visibility: left + size < cellDim.width ? 'visible' : 'hidden',
  }
}

function isThumbnailSelected(index: number): boolean {
  const range = selectedRange.value
  return index >= range[0] && index <= range[1]
}

function isPropMarkerVisible(prop: number): boolean {
  return !editorLoaded.value || showFullTimeline.value || pSELECTED.value[prop] === true
}

function isPlaceholder(index: number): boolean {
  return !ownTimes.value.includes(ETIMES.value[index] ?? 0)
}

const scrollStyle = computed<CSSProperties>(() => ({
  width: `${dim.width}px`,
  height: `${dim.height}px`,
  position: 'relative',
  'overflow-y': 'scroll',
  'overflow-x': 'visible',
  'border-top': 'solid 1px',
  'border-bottom': 'solid 1px',
  'border-color': 'var(--color-workspace-boundary)',
}))

const timelineStyle = computed<CSSProperties>(() => ({
  width: `${dim.width}px`,
  height: `${dim.height}px`,
}))

const gridStyle = computed<CSSProperties>(() => ({
  width: `${gridPos.cols * cellDim.width}px`, // eliminates occasional gaps in cells
  'grid-template-columns': gridTemplateColumns.value,
  'grid-auto-rows': gridAutoRows.value,
  'padding-bottom': 'var(--size-pane-switch-bottom-clearance)',
  display: 'grid',
}))

const thumbStyle = computed<CSSProperties>(() => ({
  width: `${cellDim.width}px`,
  height: `${cellDim.height}px`,
}))

const activeStyle = computed<CSSProperties>(() => ({
  top: `${activePos.top}px`,
  left: `${activePos.left}px`,
  width: `${cellDim.width}px`,
  height: `${activePos.height}px`,
  position: 'absolute',
  'z-index': '500',
  'background-color': 'color-mix(in srgb, var(--color-action-primary) 5%, transparent)',
}))

const cursorStyle = computed<CSSProperties>(() => ({
  top: `${cursorPos.top}px`,
  left: `${cursorPos.left}px`,
  width: `${cursorPos.width}px`,
  height: `${cellDim.height}px`,
}))
</script>

<style scoped>
.timeline {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: clip;
}
.timeline-quick-slots {
  max-inline-size: calc(100% - 2 * var(--space-2));
  margin-block: var(--space-1);
}
.timeline-scroll-content {
  position: relative;
}
.timeline-scroll-content--with-quick-slots {
  border-block-start: 1px solid var(--color-workspace-separator);
}
.timeline-value-control {
  position: absolute;
  bottom: var(--space-pane-bottom-offset);
  left: 50%;
  z-index: 1010;
  display: flex;
  height: var(--size-pane-switch-button);
  overflow: hidden;
  color: var(--color-text);
  background: color-mix(in srgb, var(--color-surface) 50%, transparent);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
  transform: translateX(-50%);
}
.timeline-value-control button {
  display: grid;
  width: var(--size-pane-switch-button);
  padding: 0;
  color: var(--color-action-primary);
  cursor: pointer;
  background: transparent;
  border: 0;
  place-items: center;
}
.timeline-value-control button:hover {
  color: var(--color-text);
  background: color-mix(in srgb, var(--color-action-primary) 10%, transparent);
}
.timeline-value-control button:disabled {
  color: var(--color-text-muted);
  cursor: not-allowed;
  opacity: 0.5;
}
.timeline-value-control button:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: -2px;
}
.timeline-value-control output {
  display: grid;
  min-width: var(--size-pane-switch-button);
  padding-inline: var(--space-1);
  border-inline: 1px solid var(--color-border);
  font-variant-numeric: tabular-nums;
  place-items: center;
}
.cursor {
  position: absolute;
  z-index: 501;
  background-color: color-mix(in srgb, var(--color-action-primary) 10%, transparent);
}
.timeline-cell {
  position: relative;
  border-bottom: solid 1px;
  border-color: var(--color-workspace-separator);
  overflow: visible;
}
.circle {
  top: 12px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  position: absolute;
  z-index: 502;
  opacity: 75%;
  visibility: hidden;
}
.timeline-cell--selected .circle--prop-visible {
  visibility: visible;
}
.timeline-cell--placeholder .thumb {
  opacity: 0.55;
}
.thumbStart {
  position: absolute;
  bottom: 0px;
  left: 22px;
  color: var(--color-text);
  font-size: 12px;
  z-index: 502;
}
.thumbIndex {
  color: var(--color-action-primary);
}
</style>
