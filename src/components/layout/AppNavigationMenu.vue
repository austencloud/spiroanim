<template>
  <div ref="rootElement" class="app-navigation-menu">
    <AppTooltip text="Open SpiroAnim menu" placement="bottom" :disabled="isOpen">
      <template #activator="{ props: tooltipProps }">
        <button
          :id="triggerId"
          ref="triggerElement"
          v-bind="tooltipProps"
          class="menu-trigger"
          type="button"
          aria-label="Open SpiroAnim menu"
          aria-haspopup="menu"
          :aria-controls="menuId"
          :aria-expanded="isOpen"
          @click="toggleMenu"
          @keydown.arrow-down.prevent="openAndFocusFirst"
          @keydown.esc.stop.prevent="closeAndFocusTrigger"
        >
          <span class="site-mark" aria-hidden="true" />
          <span class="menu-chevron" aria-hidden="true">
            <BaseIcon :path="mdiChevronDown" :size="14" />
          </span>
        </button>
      </template>
    </AppTooltip>

    <div
      v-if="isOpen"
      :id="menuId"
      ref="menuElement"
      class="menu-panel"
      role="menu"
      :aria-labelledby="triggerId"
      @keydown="onMenuKeydown"
    >
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
          <button
            class="menu-link menu-action tracer-menu-item"
            type="button"
            role="menuitem"
            :aria-pressed="TRACER"
            @click="toggleTracerMode"
          >
            <BaseIcon :path="tracerIcon" :size="22" />
            <span>{{ tracerLabel }}</span>
          </button>
        </template>
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
    </div>
    <ShareDialog ref="shareDialog" />
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
  mdiShareVariantOutline,
} from '@mdi/js'
import { onClickOutside, useFullscreen } from '@vueuse/core'
import { useId } from 'vue'
import { RouterLink } from 'vue-router'

import AppTooltip from '@/components/AppTooltip.vue'
import BaseIcon from '@/components/icons/BaseIcon.vue'
import ExportImageDialog from '@/components/layout/ExportImageDialog.vue'
import ExportVideoDialog from '@/components/layout/ExportVideoDialog.vue'
import ExportVideoProgressDialog from '@/components/layout/ExportVideoProgressDialog.vue'
import PwaInstallControl from '@/components/layout/PwaInstallControl.vue'
import ShareDialog from '@/components/layout/ShareDialog.vue'
import { useAppDisplayMode } from '@/composables/useAppDisplayMode'
import { hasVideoExportApi, probeVideoExportCodecs } from '@/services/videoExportSupport'
import { useMainPaneStore } from '@/stores/useMainPaneStore'
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
const rootElement = ref<HTMLElement>()
const triggerElement = ref<HTMLButtonElement>()
const menuElement = ref<HTMLElement>()
const shareDialog = ref<InstanceType<typeof ShareDialog>>()
const exportImageDialog = ref<InstanceType<typeof ExportImageDialog>>()
const exportVideoDialog = ref<InstanceType<typeof ExportVideoDialog>>()
const exportVideoProgressDialog = ref<InstanceType<typeof ExportVideoProgressDialog>>()
const triggerId = useId()
const menuId = useId()
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
const { COMPILED } = playerStore.raw()
const {
  ASPECT,
  CANVAS_DIM,
  MAX,
  TRACER,
  imageExportRequest,
  videoExportRequest,
  videoExportCancel,
  videoExportStatus,
  videoExportProgress,
  videoExportError,
} = storeToRefs(playerStore)
const { viewVisible } = storeToRefs(useMainPaneStore())
const playerVisible = computed(() => viewVisible.value.player)
const videoExportAvailable = ref(false)
const tracerIcon = computed(() => (TRACER.value ? mdiFirework : mdiFireworkOff))
const tracerLabel = computed(() => (TRACER.value ? 'Tracer: On' : 'Tracer: Off'))
const imageExportFeatures: ImageExportFeature[] = [
  'paths',
  'hands',
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
        COMPILED.value[feature] === true ||
          COMPILED.value.props?.some((prop) => prop[feature] === true) === true,
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

function openExportImageDialog() {
  closeMenu()
  exportImageDialog.value?.open(
    CANVAS_DIM.value,
    ASPECT.value,
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

function openExportVideoDialog() {
  closeMenu()
  void exportVideoDialog.value?.open(videoExportAvailable.value, CANVAS_DIM.value, ASPECT.value)
}

function startVideoExport(settings: Omit<VideoExportSettings, 'durationMs'>) {
  videoExportRequest.value = {
    id: Symbol(),
    settings: {
      ...settings,
      durationMs: MAX.value,
    },
  }
  void exportVideoProgressDialog.value?.open()
}

function cancelVideoExport() {
  if (videoExportStatus.value === 'rendering' || videoExportStatus.value === 'finalizing') {
    videoExportCancel.value = Symbol()
  }
}

function toggleMenu() {
  isOpen.value = !isOpen.value
}

async function openAndFocusFirst() {
  isOpen.value = true
  await nextTick()
  menuItems()[0]?.focus()
}

function closeAndFocusTrigger() {
  closeMenu()
  triggerElement.value?.focus()
}

function menuItems(): HTMLElement[] {
  return Array.from(menuElement.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
}

function focusRelativeItem(direction: 1 | -1) {
  const items = menuItems()
  if (items.length === 0) return

  const currentIndex = items.indexOf(document.activeElement as HTMLElement)
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + direction + items.length) % items.length
  items[nextIndex]?.focus()
}

function onMenuKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'Escape':
      event.preventDefault()
      closeAndFocusTrigger()
      break
    case 'ArrowDown':
      event.preventDefault()
      focusRelativeItem(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      focusRelativeItem(-1)
      break
    case 'Home':
      event.preventDefault()
      menuItems()[0]?.focus()
      break
    case 'End':
      event.preventDefault()
      menuItems().at(-1)?.focus()
      break
  }
}

onClickOutside(rootElement, closeMenu)

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
  inset-block-start: 1px;
  inset-inline-start: 1px;
  z-index: 3000;
}

.menu-trigger {
  position: relative;
  display: grid;
  width: var(--size-editor-toolbar-height);
  height: calc(var(--size-editor-toolbar-height) - 1px);
  padding: var(--space-1);
  place-items: center;
  color: var(--color-action-primary);
  background: color-mix(in srgb, var(--color-surface) 58%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-border) 65%, transparent);
  border-radius: var(--radius-sm);
  backdrop-filter: blur(0.45rem);
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

.menu-trigger[aria-expanded='true'] {
  background: color-mix(in srgb, var(--color-action-primary) 14%, var(--color-surface));
  border-color: var(--color-action-primary);
}

.menu-trigger[aria-expanded='true'] .menu-chevron {
  transform: rotate(180deg);
}

.menu-trigger:hover {
  background: color-mix(in srgb, var(--color-action-primary) 10%, var(--color-surface));
  border-color: var(--color-action-primary);
}

.menu-trigger:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: -2px;
}

.menu-panel {
  position: absolute;
  inset-block-start: calc(var(--size-editor-toolbar-height) + var(--space-2));
  inset-inline-start: 0;
  width: min(18rem, calc(100vw - var(--space-8)));
  max-height: calc(
    100dvh - var(--size-editor-toolbar-height) - var(--space-4) - var(--safe-area-inset-bottom)
  );
  padding: var(--space-2);
  overflow-y: auto;
  overscroll-behavior: contain;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 1rem 3rem color-mix(in srgb, var(--color-text) 24%, transparent);
  backdrop-filter: blur(1rem);
}

.menu-group h2 {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  color: var(--color-text-muted);
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.menu-link {
  display: grid;
  grid-template-columns: 1.5rem 1fr;
  gap: var(--space-3);
  min-height: 2.75rem;
  align-items: center;
  padding-inline: var(--space-3);
  color: var(--color-text);
  font-weight: 700;
  text-decoration: none;
  border-radius: var(--radius-sm);
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

.menu-link:hover,
.menu-link:focus-visible,
.menu-link--active {
  color: var(--color-action-primary);
  background: color-mix(in srgb, var(--color-action-primary) 10%, transparent);
}

.menu-link:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: -2px;
}

@media (max-width: 32rem) {
  .menu-panel {
    width: min(18rem, calc(100vw - var(--space-6)));
  }
}

@media (prefers-reduced-motion: reduce) {
  .menu-chevron {
    transition: none;
  }
}
</style>
