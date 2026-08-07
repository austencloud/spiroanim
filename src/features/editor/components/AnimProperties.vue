<template>
  <div
    ref="eScroll"
    class="scrollbar"
    :class="{ 'scrollbar--main-left': isInsideMainLeftPane }"
    :style="scrollStyle"
  >
    <div class="properties-grid" :style="gridStyle">
      <div class="sticky">
        <div class="container-cntrl">
          <div class="cntrl">
            <AppTooltip text="Back">
              <template #activator="{ props: tooltipProps }">
                <button
                  v-bind="tooltipProps"
                  class="icon-button"
                  type="button"
                  aria-label="Previous frame"
                  @click="clickRewind"
                >
                  <BaseIcon :path="mdiRewindOutline" />
                </button>
              </template>
            </AppTooltip>
            <AppTooltip text="Forward">
              <template #activator="{ props: tooltipProps }">
                <button
                  v-bind="tooltipProps"
                  class="icon-button"
                  type="button"
                  aria-label="Next frame"
                  @click="clickForward"
                >
                  <BaseIcon :path="mdiFastForwardOutline" />
                </button>
              </template>
            </AppTooltip>
            <AppTooltip text="Undo">
              <template #activator="{ props: tooltipProps }">
                <button
                  v-bind="tooltipProps"
                  class="icon-button"
                  type="button"
                  aria-label="Undo"
                  @click="clickUndo"
                >
                  <BaseIcon :path="mdiUndoVariant" />
                </button>
              </template>
            </AppTooltip>
          </div>
          <div class="props-header">
            <AppTooltip text="Position">
              <template #activator="{ props: tooltipProps }">
                <span v-bind="tooltipProps"
                  >Pos:&nbsp;<span class="modifying-count">{{ position }}</span></span
                >
              </template>
            </AppTooltip>
            <AppTooltip text="Modifying">
              <template #activator="{ props: tooltipProps }">
                <span v-bind="tooltipProps"
                  >Mod:&nbsp;<span class="modifying-count">{{ modifyingCount }}</span></span
                >
              </template>
            </AppTooltip>
          </div>
        </div>
      </div>
      <div class="prop-cell" :class="clsCell2">
        <div v-show="pFRAMES !== 'camera'" class="prop-options">
          <template v-if="pMULTI">
            <AppTooltip v-for="prop in ACTIVE" :key="'pc' + prop" :text="'Prop #' + (prop + 1)">
              <template #activator="{ props: tooltipProps }">
                <label v-bind="tooltipProps" class="prop-option">
                  <input v-model="pSELECTED[prop]" type="checkbox" @change="onSelectedChange" />
                  <span class="circle" :style="circleColor(prop)" />
                </label>
              </template>
            </AppTooltip>
          </template>
          <template v-else>
            <AppTooltip v-for="prop in ACTIVE" :key="'pr' + prop" :text="'Prop #' + (prop + 1)">
              <template #activator="{ props: tooltipProps }">
                <label v-bind="tooltipProps" class="prop-option">
                  <input
                    v-model.number="pRADIO"
                    type="radio"
                    :name="'prop-radio-' + props.store"
                    :value="prop"
                  />
                  <span class="circle" :style="circleColor(prop)" />
                </label>
              </template>
            </AppTooltip>
          </template>
        </div>
      </div>
      <div v-show="props.cols == 2" />
      <div :class="clsCell3">
        <div class="selection-options">
          <select v-model="pFRAMES" class="frame-set" aria-label="Frame set">
            <option value="animation">Animation</option>
            <option value="motion">Motion</option>
            <option value="camera">Camera</option>
          </select>
          <AppTooltip v-if="pFRAMES !== 'camera'" text="Select multiple props">
            <template #activator="{ props: tooltipProps }">
              <label v-bind="tooltipProps"><input v-model="pMULTI" type="checkbox" /> Multi</label>
            </template>
          </AppTooltip>
          <AppTooltip
            v-if="SELECTION && pFRAMES !== 'camera'"
            text="Only include props with points at both selection bounds"
          >
            <template #activator="{ props: tooltipProps }">
              <label v-bind="tooltipProps"><input v-model="pBOUND" type="checkbox" /> Bound</label>
            </template>
          </AppTooltip>
        </div>
      </div>
      <div v-for="n in extraCols" :key="'ec' + n" class="sticky" />
      <div class="break" />
      <template v-if="pFRAMES === 'animation'">
        <div v-show="ANIMS.length"><Animations class="expansion-panel" /></div>
        <div v-show="ANIMS.length"><Advanced /></div>
        <div v-show="PROPS.length"><Base /></div>
        <div><Root class="expansion-panel" /></div>
        <div><Settings /></div>
      </template>
      <template v-else-if="pFRAMES === 'motion'">
        <div v-if="MOTIONS.length"><Motion class="expansion-panel" /></div>
        <div v-else class="empty-frames">No Motion frames</div>
      </template>
      <template v-else>
        <div v-if="CAMERAS.length"><Orbit class="expansion-panel" /></div>
        <div v-if="CAMERAS.length"><Center class="expansion-panel" /></div>
        <div v-if="!CAMERAS.length" class="empty-frames">No Camera frames</div>
      </template>
      <div v-if="PROPS.length || pFRAMES === 'camera'" class="expansion-panel"><Manage /></div>
    </div>
  </div>
</template>
<script setup lang="ts">
import Animations from './properties/panels/AnimationsPanel.vue'
import Advanced from './properties/panels/AdvancedPanel.vue'
import Root from './properties/panels/RootPanel.vue'
import Settings from './properties/panels/SettingsPanel.vue'
import Base from './properties/panels/BasesPanel.vue'
import Manage from './properties/panels/ManagePanel.vue'
import Motion from './properties/panels/MotionPanel.vue'
import Center from './properties/panels/CenterPanel.vue'
import Orbit from './properties/panels/OrbitPanel.vue'
import AppTooltip from '@/components/AppTooltip.vue'
import BaseIcon from '@/components/icons/BaseIcon.vue'

import { mdiRewindOutline, mdiFastForwardOutline, mdiUndoVariant } from '@mdi/js'

import { usePlayerStore } from '@/stores/usePlayerStore'
import { useProperties } from '@/features/editor/composables/useProperties'
import { usePlayerFrameNavigation } from '@/composables/usePlayerFrameNavigation'
import { useQSMainStore } from '@/stores/useQSMainStore'
import { useMainPaneStore } from '@/stores/useMainPaneStore'

import { COLSET } from '@/domain/animation/AnimStruct'
import { toColor } from '@/utils/UtilFunc'
import { msToBeat } from '@/math/animation/PlayerFunc'

const props = withDefaults(
  defineProps<{
    dim: { width: number; height: number; perc: number }
    cols: number
    store?: string
  }>(),
  {
    store: 'main',
  },
)

provide(
  'store',
  computed(() => props.store),
)

const dim: Readonly<typeof props.dim> = readonly(props.dim)
provide('dim', dim)

const playerStore = usePlayerStore(props.store)
const { ROOT } = playerStore.raw()
const { SELECTION } = storeToRefs(playerStore)
const { rewind: clickRewind, forward: clickForward } = usePlayerFrameNavigation(props.store)

const {
  START,
  END,
  ACTIVE,
  ANIMS,
  MOTIONS,
  CAMERAS,
  PROPS,
  pMULTI,
  pSELECTED,
  pRADIO,
  pBOUND,
  pFRAMES,
  pEXPANDED,
  pDESKTOP,
  pMOBILE,
} = useProperties(props.store)

const qsStore = useQSMainStore()
const { undoQS } = qsStore

const { parents: mainPaneParents } = storeToRefs(useMainPaneStore())
const isInsideMainLeftPane = computed(() => mainPaneParents.value.editor === 'left')

watch(pFRAMES, () => {
  SELECTION.value = false
})

const cols = computed(() => props.cols)

const eScroll = ref<HTMLElement>()

const gridTemplateColumns = ref<CSSProperties['grid-template-columns']>('repeat(1, 100%)')

//watch(cols, ()=>console.log('cols', cols))

const extraCols = computed(() => (cols.value > 3 ? props.cols - 3 : 0))

watchImmediate(cols, (cols) => {
  gridTemplateColumns.value = 'repeat(' + cols + ', ' + 100 / cols + '%)'
})

watchImmediate(cols, (cols) => {
  pEXPANDED.value = cols > 1 ? pDESKTOP.value : pMOBILE.value
})

// Reset, template will rebuild
//pSELECTED.value = {}

onMounted(() => {
  // Apply ACTIVE identifiers to selected props
  watchImmediate(
    [pSELECTED, ROOT],
    () => {
      let update = false
      for (let i = 0; i < ROOT.value.props.length; i++) {
        const val = pSELECTED.value[i] ? true : false
        const prop = ROOT.value.props[i]!
        if (prop.active !== val) {
          prop.active = val
          update = true
        }
      }
      // Only trigger if updates were made, otherwise causes infinite recursion
      if (update) triggerRef(ROOT) // Trigger shallow watchers
    },
    { deep: true },
  )
})

onUnmounted(() => {
  // Remove any ACTIVE identifiers from props
  for (let i = 0; i < ROOT.value.props.length; i++) delete ROOT.value.props[i]!.active
  triggerRef(ROOT)
})

function onSelectedChange() {
  triggerRef(ROOT)
}

function clickUndo() {
  const previous = undoQS()
  if (previous !== undefined) ROOT.value = previous
}

function circleColor(index: number) {
  const color = ROOT.value.color,
    prop = ROOT.value.props[index]!
  return {
    // Prop colors are fixed animation content rather than theme UI colors.
    'background-color': toColor(COLSET[prop.color !== undefined ? prop.color : color]![0]),
  }
}

const position = computed(() => {
  const bpm = ROOT.value.bpm,
    start = START.value ?? 0,
    end = END.value ?? 0
  return msToBeat(start, bpm) + (start != end ? '/' + msToBeat(end, bpm) : '')
})

const modifyingCount = computed(() =>
  pFRAMES.value === 'animation'
    ? ANIMS.value.length
    : pFRAMES.value === 'motion'
      ? MOTIONS.value.length
      : CAMERAS.value.length,
)

const clsCell2 = computed(() => {
  return props.cols >= 2 ? 'sticky' : ''
})

const clsCell3 = computed(() => {
  return props.cols >= 3 ? 'sticky' : ''
})

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

const gridStyle = computed<CSSProperties>(() => ({
  'grid-template-columns': gridTemplateColumns.value,
  'padding-bottom': 'var(--size-pane-switch-bottom-clearance)',
  'font-size': '16px',
  color: 'var(--color-text)',
  display: 'grid',
}))
</script>
<style scoped>
.properties-grid {
  width: max-content;
  min-width: 100%;
}

.scrollbar--main-left .properties-grid > .sticky:first-child {
  /* Reserve the navigation button's width without shortening the toolbar borders or grid track. */
  padding-inline-start: var(--size-editor-toolbar-height);
}

.expansion-panel {
  padding: 2px;
}
.sticky {
  position: sticky;
  top: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  min-height: var(--size-editor-toolbar-height);
  background-color: var(--color-editor-toolbar-background);
  padding-bottom: 1px;
  border-bottom: solid 1px;
  border-color: var(--color-workspace-separator);
}
.container-cntrl {
  display: grid;
  align-items: center;
  width: 100%;
  grid-template-columns: minmax(min-content, auto) 1fr;
}
.props-header {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  padding-inline-start: 15px;
  text-align: center;
}
.break {
  grid-column: 1 / -1;
  height: 0;
  margin: 0;
}

.cntrl {
  display: flex;
  gap: var(--space-1);
  padding-inline: 15px;
}

.modifying-count {
  color: var(--color-action-primary);
  font-size: 18px;
}

.icon-button {
  padding: 2px;
  color: var(--color-text-muted);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
}

.icon-button:hover {
  color: var(--color-action-primary);
}

.icon-button:focus-visible,
.prop-option input:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.prop-options,
.selection-options {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-2);
}

.frame-set {
  min-height: 1.75rem;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.empty-frames {
  padding: var(--space-4);
  color: var(--color-text-muted);
  text-align: center;
}

.prop-option {
  display: inline-flex;
  gap: var(--space-1);
  align-items: center;
}

.circle {
  top: 12px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  z-index: 502;
  opacity: 75%;
}
</style>
