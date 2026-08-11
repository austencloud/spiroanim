<template>
  <BaseDialog
    v-model="isOpen"
    class="export-video-dialog"
    title="Export Video"
    close-label="Close export video dialog"
  >
    <div v-if="!supported" class="unsupported-message" role="alert">
      <strong>Video export is not supported on this device or browser.</strong>
      <span>
        SpiroAnim requires WebCodecs video encoding and at least one compatible codec for the
        selected export settings.
      </span>
    </div>

    <form v-else class="export-form" @submit.prevent="submit">
      <p class="export-note">
        The player will render every frame at the selected size before the video is downloaded.
      </p>

      <div class="form-grid">
        <label class="file-name-field">
          <span>File name</span>
          <input
            :value="fileName"
            type="text"
            :maxlength="MAX_EXPORT_FILE_NAME_LENGTH"
            autocomplete="off"
            data-role="export-file-name"
            @input="updateFileName"
          />
        </label>

        <label>
          <span>Resolution</span>
          <select v-model="resolution">
            <option v-for="option in resolutionOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
            <option value="custom">Custom</option>
          </select>
        </label>

        <label>
          <span>Frame rate</span>
          <select v-model.number="framerate" data-role="export-video-framerate">
            <option v-for="rate in videoExportFramerates" :key="rate" :value="rate">
              {{ rate }} FPS
            </option>
          </select>
        </label>

        <div v-if="resolution === 'custom'" class="custom-resolution">
          <label>
            <span>Custom width</span>
            <input
              :value="customWidth"
              type="number"
              :min="MIN_VIDEO_EXPORT_DIMENSION"
              :max="MAX_VIDEO_EXPORT_DIMENSION"
              step="2"
              @input="updateCustomWidth"
            />
          </label>
          <span class="dimension-separator" aria-hidden="true">x</span>
          <label>
            <span>Custom height</span>
            <input
              :value="customHeight"
              type="number"
              :min="MIN_VIDEO_EXPORT_DIMENSION"
              :max="MAX_VIDEO_EXPORT_DIMENSION"
              step="2"
              @input="updateCustomHeight"
            />
          </label>
        </div>

        <label class="codec-field">
          <span>Codec and format</span>
          <select v-model="selectedCodec" :disabled="isChecking || codecs.length === 0">
            <option v-if="isChecking" value="">Checking available codecs...</option>
            <option v-else-if="codecs.length === 0" value="">No compatible codecs</option>
            <option v-for="codec in codecs" :key="codec.codec" :value="codec.codec">
              {{ codec.label }}
            </option>
          </select>
        </label>

        <label>
          <span>Quality</span>
          <select v-model.number="bitrate" data-role="export-video-quality">
            <option :value="8_000_000">Standard</option>
            <option :value="16_000_000">High</option>
            <option :value="30_000_000">Very high</option>
            <option :value="60_000_000">Ultra</option>
            <option :value="100_000_000">Maximum</option>
          </select>
        </label>

        <label class="background-field">
          <span>{{ transparent ? 'Transparency matte color' : 'Background color' }}</span>
          <span class="color-control">
            <input v-model="backgroundColor" type="color" />
            <input v-model="backgroundColor" type="text" pattern="#[0-9a-fA-F]{6}" />
          </span>
          <small v-if="transparent">
            For cleaner edges, choose a color similar to where the video will be used.
          </small>
        </label>

        <label v-if="alphaAvailable" class="alpha-field">
          <span class="checkbox-control">
            <input v-model="transparent" type="checkbox" />
            Transparent background (experimental)
          </span>
          <small>
            Available with VP9/WebM. Playback support varies by browser and video player.
          </small>
        </label>
      </div>

      <p class="availability-status" role="status">
        {{ availabilityStatus }}
      </p>

      <button
        class="export-button"
        type="submit"
        :disabled="isChecking || !selectedCodec || (!transparent && !validBackground)"
      >
        Export Video
      </button>
    </form>
  </BaseDialog>
</template>

<script setup lang="ts">
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { useExportResolutionSettings } from '@/composables/useExportResolutionSettings'
import {
  hasVideoExportApi,
  probeVideoExportCodecs,
  type VideoExportCodec,
} from '@/services/videoExportSupport'
import {
  MAX_VIDEO_EXPORT_DIMENSION,
  MIN_VIDEO_EXPORT_DIMENSION,
  type VideoExportDimensions,
} from '@/math/videoExportResolution'
import { useExportSettingsStore } from '@/stores/useExportSettingsStore'
import type { VideoExportSettings } from '@/types/VideoExportTypes'
import {
  MAX_EXPORT_FILE_NAME_LENGTH,
  resolveExportFileName,
  sanitizeExportFileName,
} from '@/utils/exportFileName'

const emit = defineEmits<{
  export: [settings: Omit<VideoExportSettings, 'durationMs' | 'playbackSpeed'>]
}>()

const isOpen = ref(false)
const supported = ref(false)
const isChecking = ref(false)
const codecs = ref<VideoExportCodec[]>([])
const exportSettingsStore = useExportSettingsStore()
const fileName = ref('')
const {
  fileName: savedFileName,
  videoResolution: resolution,
  videoAspectRatio: exportAspectRatio,
  videoCustomWidth: customWidth,
  videoCustomHeight: customHeight,
  videoFramerate: framerate,
  videoBitrate: bitrate,
  videoBackgroundColor: backgroundColor,
  videoTransparent: transparent,
  videoCodec: selectedCodec,
} = storeToRefs(exportSettingsStore)
const {
  resolutionOptions,
  selectedResolution,
  updateCustomWidth,
  updateCustomHeight,
  configureResolution,
} = useExportResolutionSettings({
  resolution,
  aspectRatio: exportAspectRatio,
  customWidth,
  customHeight,
})
let probeGeneration = 0
const videoExportFramerates = [30, 60, 120, 240] as const

const availabilityStatus = computed(() => {
  if (isChecking.value) return 'Checking this configuration...'
  if (codecs.value.length === 0) return 'No codec supports this configuration.'
  return `${codecs.value.length} compatible ${codecs.value.length === 1 ? 'codec' : 'codecs'} available.`
})
const validBackground = computed(() => /^#[\da-f]{6}$/i.test(backgroundColor.value))
const selectedCodecOption = computed(() =>
  codecs.value.find((candidate) => candidate.codec === selectedCodec.value),
)
const alphaAvailable = computed(() => selectedCodecOption.value?.supportsAlpha === true)

async function refreshCodecs() {
  const generation = ++probeGeneration
  isChecking.value = true
  const { width, height } = selectedResolution.value
  const available = await probeVideoExportCodecs({
    width,
    height,
    framerate: framerate.value,
    bitrate: bitrate.value,
  })
  if (generation !== probeGeneration) return

  codecs.value = available
  if (!available.some((codec) => codec.codec === selectedCodec.value)) {
    selectedCodec.value = available[0]?.codec ?? ''
  }
  isChecking.value = false
}

function submit() {
  const codec = selectedCodecOption.value
  if (!codec || (!transparent.value && !validBackground.value)) return

  const resolvedFileName = resolveExportFileName(fileName.value)
  savedFileName.value = resolvedFileName
  emit('export', {
    fileName: resolvedFileName,
    ...selectedResolution.value,
    framerate: framerate.value,
    bitrate: bitrate.value,
    backgroundColor: backgroundColor.value,
    transparent: transparent.value,
    codec: codec.codec,
    container: codec.container,
  })
  isOpen.value = false
}

async function open(
  isSupported: boolean,
  canvas: VideoExportDimensions,
  aspect: readonly [number, number],
) {
  supported.value = isSupported && hasVideoExportApi()
  configureResolution(canvas, aspect)
  fileName.value = savedFileName.value
  isOpen.value = true
  if (supported.value) await refreshCodecs()
}

function updateFileName(event: Event) {
  fileName.value = sanitizeExportFileName((event.target as HTMLInputElement).value)
}

watch([resolution, customWidth, customHeight, framerate, bitrate], () => {
  if (isOpen.value && supported.value) void refreshCodecs()
})

watch(alphaAvailable, (available) => {
  if (!available) transparent.value = false
})

defineExpose({ open })
</script>

<style scoped>
:global(.export-video-dialog) {
  --export-dialog-max-height: calc(100dvh - (2 * var(--space-4)));

  width: min(30rem, calc(100vw - (2 * var(--space-4))));
  max-height: var(--export-dialog-max-height);
}

:deep(.base-dialog__content) {
  grid-template-rows: auto minmax(0, 1fr);
  max-height: var(--export-dialog-max-height);
  overflow: hidden;
}

:deep(.base-dialog__header) {
  padding: var(--space-3) var(--space-4);
}

:deep(.base-dialog__header h2) {
  font-size: 1.1rem;
}

:deep(.base-dialog__body) {
  display: grid;
  gap: var(--space-3);
  min-height: 0;
  padding: var(--space-4);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.unsupported-message,
.export-note {
  padding: var(--space-3);
  background: color-mix(in srgb, var(--color-action-primary) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 25%, var(--color-border));
  border-inline-start: 3px solid var(--color-action-primary);
  border-radius: var(--radius-sm);
}

.unsupported-message {
  display: grid;
  gap: var(--space-2);
  line-height: 1.5;
}

.unsupported-message span,
.export-note,
.availability-status {
  color: var(--color-text-muted);
}

.export-form {
  display: grid;
  gap: var(--space-3);
}

.export-note,
.availability-status {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

label {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
  font-size: 0.875rem;
  font-weight: 700;
}

.file-name-field,
.codec-field,
.background-field,
.alpha-field {
  grid-column: 1 / -1;
}

.checkbox-control {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.checkbox-control input {
  width: 1rem;
  height: 1rem;
  margin: 0;
  accent-color: var(--color-action-primary);
}

.background-field small,
.alpha-field small {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.4;
}

select,
input[type='text'],
input[type='number'] {
  min-width: 0;
  min-height: 2.35rem;
  padding-inline: var(--space-2);
  color: var(--color-text);
  font: inherit;
  font-size: 0.875rem;
  background: color-mix(in srgb, var(--color-canvas) 60%, var(--color-surface));
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.custom-resolution {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: var(--space-2);
  align-items: end;
}

.dimension-separator {
  padding-block-end: 0.55rem;
  color: var(--color-text-muted);
  font-weight: 700;
}

.color-control {
  display: grid;
  grid-template-columns: 3.5rem minmax(0, 1fr);
  gap: var(--space-3);
}

input[type='color'] {
  width: 3.5rem;
  min-height: 2.35rem;
  padding: var(--space-1);
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
}

select:focus-visible,
input:focus-visible,
button:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.export-button {
  min-height: 2.5rem;
  padding-inline: var(--space-4);
  color: var(--color-on-action-primary);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  background: var(--color-action-primary);
  border: 2px solid var(--color-action-primary);
  border-radius: var(--radius-sm);
}

.export-button:disabled {
  color: var(--color-text-muted);
  background: color-mix(in srgb, var(--color-surface) 70%, var(--color-canvas));
  border-color: var(--color-border);
  cursor: not-allowed;
  opacity: 0.65;
}

@media (max-width: 32rem) {
  :global(.export-video-dialog) {
    --export-dialog-max-height: calc(
      100dvh - var(--space-4) - var(--safe-area-inset-top) - var(--safe-area-inset-bottom)
    );

    width: min(30rem, calc(100vw - (2 * var(--space-2))));
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .file-name-field,
  .codec-field,
  .background-field {
    grid-column: auto;
  }

  .custom-resolution {
    grid-column: auto;
  }
}
</style>
