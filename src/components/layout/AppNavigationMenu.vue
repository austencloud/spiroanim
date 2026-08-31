<template>
  <div class="app-navigation-menu">
    <AppTooltip text="Open SpiroAnim menu" placement="bottom" :disabled="isOpen">
      <template #activator="{ props: tooltipProps }">
        <BasePopupMenu
          v-model:open="isOpen"
          class="app-navigation-menu__popup"
          panel-class="menu-panel"
          :trigger-attrs="tooltipProps"
          trigger-aria-label="Open SpiroAnim menu"
          trigger-class="menu-trigger"
        >
          <template #trigger>
            <span class="site-mark" aria-hidden="true" />
            <span class="menu-chevron" :class="{ 'menu-chevron--open': isOpen }" aria-hidden="true">
              <BaseIcon :path="mdiChevronDown" :size="14" />
            </span>
          </template>

          <button
            v-if="showFullscreen"
            class="menu-link menu-action fullscreen-menu-item"
            type="button"
            role="menuitem"
            @click="toggleFullscreenMode"
          >
            <BaseIcon :path="fullscreenIcon" :size="22" />
            <span>{{ fullscreenLabel }}</span>
          </button>
          <section class="menu-group" role="group" aria-labelledby="spiroanim-heading">
            <h2 id="spiroanim-heading">SpiroAnim</h2>
            <button
              class="menu-link menu-action share-menu-item"
              type="button"
              role="menuitem"
              @click="openShareDialog"
            >
              <BaseIcon :path="mdiShareVariantOutline" :size="22" />
              <span>Share This</span>
            </button>
            <RouterLink
              class="menu-link"
              exact-active-class="menu-link--active"
              role="menuitem"
              to="/tips"
              @click="closeMenu"
            >
              <BaseIcon :path="mdiLightbulbOnOutline" :size="22" />
              <span>Tips</span>
            </RouterLink>
            <button
              class="menu-link menu-action quick-slots-menu-item"
              type="button"
              role="menuitem"
              @click="openQuickSlotSetsDialog"
            >
              <BaseIcon :path="mdiViewGridOutline" :size="22" />
              <span>Quick Slots</span>
            </button>
            <template v-if="playerVisible">
              <button
                class="menu-link menu-action export-image-menu-item"
                type="button"
                role="menuitem"
                @click="openExportImageDialog"
              >
                <BaseIcon :path="mdiPanoramaVariant" :size="22" />
                <span>Export Image</span>
              </button>
              <button
                class="menu-link menu-action export-video-menu-item"
                :class="{ 'menu-action--unavailable': !videoExportAvailable }"
                type="button"
                role="menuitem"
                :aria-disabled="!videoExportAvailable"
                @click="openExportVideoDialog"
              >
                <BaseIcon :path="mdiMovieOpenOutline" :size="22" />
                <span>Export Video</span>
              </button>
            </template>
            <button
              class="menu-link menu-action progressive-paths-menu-item"
              type="button"
              role="menuitem"
              :aria-pressed="PROGRESSIVE_PATHS"
              @click="toggleProgressivePaths"
            >
              <BaseIcon :path="mdiAnimationPlayOutline" :size="22" />
              <span>{{ progressivePathsLabel }}</span>
            </button>
            <button
              class="menu-link menu-action all-head-paths-menu-item"
              type="button"
              role="menuitem"
              :aria-pressed="ALL_HEAD_PATHS"
              @click="toggleAllHeadPaths"
            >
              <BaseIcon :path="mdiVectorPolyline" :size="22" />
              <span>{{ allHeadPathsLabel }}</span>
            </button>
            <button
              v-if="playerVisible"
              class="menu-link menu-action tracer-menu-item"
              type="button"
              role="menuitem"
              :aria-pressed="TRACER"
              @click="toggleTracerMode"
            >
              <BaseIcon :path="tracerIcon" :size="22" />
              <span>{{ tracerLabel }}</span>
            </button>
            <button
              class="menu-link menu-action editor-access-menu-item"
              type="button"
              role="menuitem"
              :aria-pressed="editorEnabled"
              @click="toggleEditorAccess"
            >
              <BaseIcon :path="editorAccessIcon" :size="22" />
              <span>{{ editorAccessLabel }}</span>
            </button>
          </section>
          <section class="menu-group" role="group" aria-labelledby="navigation-heading">
            <h2 id="navigation-heading">Navigation</h2>
            <RouterLink
              v-for="item in navigationLinks"
              :key="item.path"
              class="menu-link"
              exact-active-class="menu-link--active"
              role="menuitem"
              :to="item.path"
              @click="closeMenu"
            >
              <BaseIcon :path="item.icon" :size="22" />
              <span>{{ item.label }}</span>
            </RouterLink>
            <PwaInstallControl variant="menu" @prompted="closeMenu" />
          </section>
          <div class="menu-footer" role="presentation">
            <button
              class="menu-link menu-action reset-menu-item"
              type="button"
              role="menuitem"
              @click="openResetDialog"
            >
              <BaseIcon :path="mdiRestoreAlert" :size="22" />
              <span>Reset App</span>
            </button>
          </div>
        </BasePopupMenu>
      </template>
    </AppTooltip>
    <ShareDialog ref="shareDialog" />
    <QuickSlotSetsDialog ref="quickSlotSetsDialog" />
    <PwaResetDialog ref="resetDialog" />
    <ExportImageDialog ref="exportImageDialog" @export="startImageExport" />
    <ExportVideoDialog ref="exportVideoDialog" @export="startVideoExport" />
    <ExportVideoProgressDialog
      ref="exportVideoProgressDialog"
      :status="videoExportStatus"
      :progress="videoExportProgress"
      :error="videoExportError"
      @cancel="cancelVideoExport"
    />
  </div>
</template>

<script setup lang="ts">
import {
  mdiAnimationPlayOutline,
  mdiChevronDown,
  mdiFirework,
  mdiFireworkOff,
  mdiFullscreen,
  mdiFullscreenExit,
  mdiHomeOutline,
  mdiInformationOutline,
  mdiLightbulbOnOutline,
  mdiMovieOpenOutline,
  mdiPanoramaVariant,
  mdiPencil,
  mdiPencilOff,
  mdiRestoreAlert,
  mdiShareVariantOutline,
  mdiViewGridOutline,
  mdiVectorPolyline,
} from '@mdi/js'
import { useFullscreen } from '@vueuse/core'
import { RouterLink } from 'vue-router'

import AppTooltip from '@/components/AppTooltip.vue'
import BaseIcon from '@/components/icons/BaseIcon.vue'
import ExportImageDialog from '@/components/layout/ExportImageDialog.vue'
import ExportVideoDialog from '@/components/layout/ExportVideoDialog.vue'
import ExportVideoProgressDialog from '@/components/layout/ExportVideoProgressDialog.vue'
import PwaInstallControl from '@/components/layout/PwaInstallControl.vue'
import PwaResetDialog from '@/components/layout/PwaResetDialog.vue'
import QuickSlotSetsDialog from '@/components/layout/QuickSlotSetsDialog.vue'
import ShareDialog from '@/components/layout/ShareDialog.vue'
import BasePopupMenu from '@/components/ui/BasePopupMenu.vue'
import { useAppDisplayMode } from '@/composables/useAppDisplayMode'
import { hasVideoExportApi, probeVideoExportCodecs } from '@/services/videoExportSupport'
import { videoExportDurationMs } from '@/math/videoExportTiming'
import { useMainPaneStore } from '@/stores/useMainPaneStore'
import { useEditorAccessStore } from '@/features/editor/stores/useEditorAccessStore'
import { usePlayerStore } from '@/stores/usePlayerStore'
import type {
  ImageExportFeature,
  ImageExportFeatureAvailability,
  ImageExportSettings,
} from '@/types/ImageExportTypes'
import type { VideoExportSettings } from '@/types/VideoExportTypes'

interface MenuLink {
  icon: string
  label: string
  path: string
}

const navigationLinks: MenuLink[] = [
  { icon: mdiHomeOutline, label: 'Home', path: '/' },
  { icon: mdiInformationOutline, label: 'About', path: '/about' },
]

const isOpen = ref(false)
const shareDialog = ref<InstanceType<typeof ShareDialog>>()
const quickSlotSetsDialog = ref<InstanceType<typeof QuickSlotSetsDialog>>()
const resetDialog = ref<InstanceType<typeof PwaResetDialog>>()
const exportImageDialog = ref<InstanceType<typeof ExportImageDialog>>()
const exportVideoDialog = ref<InstanceType<typeof ExportVideoDialog>>()
const exportVideoProgressDialog = ref<InstanceType<typeof ExportVideoProgressDialog>>()
const {
  isFullscreen,
  isSupported: isFullscreenSupported,
  toggle: toggleFullscreen,
} = useFullscreen()
const { isIos } = useAppDisplayMode()

// 1.) iPhones do not reliably support element full screen.
// 2.) On iPadOS, dragging downward inside an element can exit full screen.
// 3.) That system gesture conflicts with draggable editor controls, especially the progress bar.
// Modern iPads identify as touch-enabled Macs; useAppDisplayMode handles that case.
const showFullscreen = computed(() => isFullscreenSupported.value && !isIos.value)
const fullscreenIcon = computed(() => (isFullscreen.value ? mdiFullscreenExit : mdiFullscreen))
const fullscreenLabel = computed(() =>
  isFullscreen.value ? 'Exit Full Screen' : 'Enter Full Screen',
)
const playerStore = usePlayerStore('main')
const { PLAYBACK_COMPILED } = playerStore.raw()
const {
  PLAYBACK_ASPECT,
  CANVAS_DIM,
  PLAYBACK_MAX,
  PLAYBACK_ROOT,
  TRACER,
  PROGRESSIVE_PATHS,
  ALL_HEAD_PATHS,
  imageExportRequest,
  videoExportRequest,
  videoExportCancel,
  videoExportStatus,
  videoExportProgress,
  videoExportError,
} = storeToRefs(playerStore)
const { viewVisible } = storeToRefs(useMainPaneStore())
const playerVisible = computed(
  () => viewVisible.value.player || viewVisible.value.timeline || viewVisible.value.builder,
)
const videoExportAvailable = ref(false)
const tracerIcon = computed(() => (TRACER.value ? mdiFirework : mdiFireworkOff))
const tracerLabel = computed(() => (TRACER.value ? 'Tracer: On' : 'Tracer: Off'))
const progressivePathsLabel = computed(() =>
  PROGRESSIVE_PATHS.value ? 'Path Tracing: On' : 'Path Tracing: Off',
)
const allHeadPathsLabel = computed(() =>
  ALL_HEAD_PATHS.value ? 'All Head Paths: On' : 'All Head Paths: Off',
)
const { editorEnabled } = storeToRefs(useEditorAccessStore())
const editorAccessIcon = computed(() => (editorEnabled.value ? mdiPencilOff : mdiPencil))
const editorAccessLabel = computed(() => (editorEnabled.value ? 'Disable Editor' : 'Enable Editor'))
const imageExportFeatures: ImageExportFeature[] = [
  'paths',
  'hands',
  'travel',
  'arms',
  'visible',
  'nodes',
  'anchors',
  'guides',
]
const imageExportFeatureAvailability = computed<ImageExportFeatureAvailability>(
  () =>
    Object.fromEntries(
      imageExportFeatures.map((feature) => [
        feature,
        PLAYBACK_COMPILED.value[feature] === true ||
          PLAYBACK_COMPILED.value.props?.some((prop) => prop[feature] === true) === true,
      ]),
    ) as ImageExportFeatureAvailability,
)

function closeMenu() {
  isOpen.value = false
}

function toggleFullscreenMode() {
  void toggleFullscreen()
  closeMenu()
}

function toggleTracerMode() {
  TRACER.value = !TRACER.value
  closeMenu()
}

function toggleProgressivePaths() {
  PROGRESSIVE_PATHS.value = !PROGRESSIVE_PATHS.value
  closeMenu()
}

function toggleAllHeadPaths() {
  ALL_HEAD_PATHS.value = !ALL_HEAD_PATHS.value
  closeMenu()
}

function toggleEditorAccess() {
  editorEnabled.value = !editorEnabled.value
  closeMenu()
}

function openExportImageDialog() {
  closeMenu()
  exportImageDialog.value?.open(
    CANVAS_DIM.value,
    PLAYBACK_ASPECT.value,
    imageExportFeatureAvailability.value,
  )
}

function startImageExport(settings: ImageExportSettings) {
  imageExportRequest.value = {
    id: Symbol(),
    settings,
  }
}

function openShareDialog() {
  closeMenu()
  void shareDialog.value?.open()
}

function openQuickSlotSetsDialog() {
  closeMenu()
  quickSlotSetsDialog.value?.open()
}

function openResetDialog() {
  closeMenu()
  resetDialog.value?.open()
}

function openExportVideoDialog() {
  closeMenu()
  void exportVideoDialog.value?.open(
    videoExportAvailable.value,
    CANVAS_DIM.value,
    PLAYBACK_ASPECT.value,
  )
}

function startVideoExport(settings: Omit<VideoExportSettings, 'durationMs' | 'playbackSpeed'>) {
  const playbackSpeed = PLAYBACK_ROOT.value.speed > 0 ? PLAYBACK_ROOT.value.speed : 1
  videoExportRequest.value = {
    id: Symbol(),
    settings: {
      ...settings,
      durationMs: videoExportDurationMs(PLAYBACK_MAX.value, playbackSpeed),
      playbackSpeed,
    },
  }
  void exportVideoProgressDialog.value?.open()
}

function cancelVideoExport() {
  if (videoExportStatus.value === 'rendering' || videoExportStatus.value === 'finalizing') {
    videoExportCancel.value = Symbol()
  }
}

onMounted(async () => {
  if (!hasVideoExportApi()) return
  const codecs = await probeVideoExportCodecs({
    width: 1920,
    height: 1080,
    framerate: 60,
    bitrate: 16_000_000,
  })
  videoExportAvailable.value = codecs.length > 0
})
</script>

<style scoped>
.app-navigation-menu {
  position: absolute;
  inset-block-start: var(--space-workspace-corner-control);
  inset-inline-start: var(--space-workspace-corner-control);
  z-index: 3000;
}

.app-navigation-menu__popup {
  --popup-menu-panel-width: min(18rem, calc(100vw - var(--space-8)));
  --popup-menu-panel-max-height: calc(
    100dvh - var(--size-editor-toolbar-height) - var(--space-4) - var(--safe-area-inset-bottom)
  );
}

.site-mark {
  display: block;
  width: 100%;
  height: 100%;
  background: url('/images/app-icons/pwa-source.svg') center / contain no-repeat;
  filter: drop-shadow(0 0 0.4rem color-mix(in srgb, var(--color-action-primary) 24%, transparent));
}

.menu-chevron {
  position: absolute;
  inset-inline-end: -0.2rem;
  inset-block-end: -0.15rem;
  display: grid;
  width: 1.15rem;
  height: 1.15rem;
  place-items: center;
  color: var(--color-action-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 50%;
  transition: transform var(--transition-fast);
}

.menu-chevron--open {
  transform: rotate(180deg);
}

.menu-group h2 {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  color: var(--color-text-muted);
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.menu-footer {
  margin-block-start: var(--space-2);
  padding-block-start: var(--space-2);
  border-block-start: 1px solid var(--color-border);
}

.menu-link {
  display: grid;
  grid-template-columns: 1.5rem 1fr;
  gap: var(--space-3);
}

.menu-action {
  width: 100%;
  font: inherit;
  text-align: start;
  background: transparent;
  border: 0;
}

.menu-action--unavailable {
  color: var(--color-text-muted);
  cursor: not-allowed;
  opacity: 0.55;
}

.menu-action--unavailable:hover,
.menu-action--unavailable:focus-visible {
  color: var(--color-text-muted);
  background: color-mix(in srgb, var(--color-surface) 70%, transparent);
}

.menu-link--active {
  color: var(--color-action-primary);
  background: color-mix(in srgb, var(--color-action-primary) 10%, transparent);
}

.reset-menu-item {
  color: var(--color-status-warning);
}

.reset-menu-item:hover,
.reset-menu-item:focus-visible {
  color: var(--color-status-warning);
  background: color-mix(in srgb, var(--color-status-warning) 10%, transparent);
}

@media (max-width: 32rem) {
  .app-navigation-menu__popup {
    --popup-menu-panel-width: min(18rem, calc(100vw - var(--space-6)));
  }
}

@media (prefers-reduced-motion: reduce) {
  .menu-chevron {
    transition: none;
  }
}
</style>
