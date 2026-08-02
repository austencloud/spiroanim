<template>
  <BaseDialog
    v-model="isOpen"
    class="export-image-dialog"
    title="Export Image"
    close-label="Close export image dialog"
  >
    <form class="export-form" @submit.prevent="submit">
      <p class="export-note">
        Export the player's current frame using the selected image settings.
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
          <span>File type</span>
          <select v-model="fileType">
            <option value="image/png">PNG</option>
            <option value="image/webp">WebP</option>
            <option value="image/jpeg">JPEG</option>
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

        <label v-if="fileType !== 'image/png'">
          <span>Quality</span>
          <select v-model.number="quality">
            <option :value="0.8">Standard</option>
            <option :value="0.92">High</option>
            <option :value="1">Very high</option>
          </select>
        </label>

        <label class="background-field">
          <span>Background color</span>
          <span class="color-control">
            <input v-model="backgroundColor" type="color" :disabled="transparent" />
            <input
              v-model="backgroundColor"
              type="text"
              pattern="#[0-9a-fA-F]{6}"
              :disabled="transparent"
            />
          </span>
        </label>

        <label v-if="supportsTransparency" class="alpha-field">
          <span class="checkbox-control">
            <input v-model="transparent" type="checkbox" />
            Transparent background
          </span>
        </label>

        <fieldset v-if="availableFeatureOptions.length" class="feature-options">
          <legend>Hide from image</legend>
          <label v-for="option in availableFeatureOptions" :key="option.value">
            <span class="checkbox-control">
              <input v-model="disabledFeatures[option.value]" type="checkbox" />
              {{ option.label }}
            </span>
          </label>
        </fieldset>
      </div>

      <button class="export-button" type="submit" :disabled="!transparent && !validBackground">
        Export Image
      </button>
    </form>
  </BaseDialog>
</template>

<script setup lang="ts">
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { useExportResolutionSettings } from '@/composables/useExportResolutionSettings'
import {
  MAX_VIDEO_EXPORT_DIMENSION,
  MIN_VIDEO_EXPORT_DIMENSION,
  type VideoExportDimensions,
} from '@/math/videoExportResolution'
import { useExportSettingsStore } from '@/stores/useExportSettingsStore'
import type {
  ImageExportFeature,
  ImageExportFeatureAvailability,
  ImageExportSettings,
} from '@/types/ImageExportTypes'
import {
  MAX_EXPORT_FILE_NAME_LENGTH,
  resolveExportFileName,
  sanitizeExportFileName,
} from '@/utils/exportFileName'

const emit = defineEmits<{ export: [settings: ImageExportSettings] }>()
const isOpen = ref(false)
const exportSettingsStore = useExportSettingsStore()
const fileName = ref('')
const {
  fileName: savedFileName,
  imageResolution: resolution,
  imageAspectRatio: exportAspectRatio,
  imageCustomWidth: customWidth,
  imageCustomHeight: customHeight,
  imageFileType: fileType,
  imageQuality: quality,
  imageBackgroundColor: backgroundColor,
  imageTransparent: transparent,
  imageHiddenFeatures: disabledFeatures,
} = storeToRefs(exportSettingsStore)
const featureOptions: { value: ImageExportFeature; label: string }[] = [
  { value: 'paths', label: 'Paths' },
  { value: 'hands', label: 'Hands' },
  { value: 'arms', label: 'Arms' },
  { value: 'visible', label: 'Visible props' },
  { value: 'nodes', label: 'Nodes' },
  { value: 'anchors', label: 'Anchors' },
  { value: 'guides', label: 'Guides' },
]
const availableFeatures = ref<ImageExportFeatureAvailability>({
  paths: false,
  hands: false,
  arms: false,
  visible: false,
  nodes: false,
  anchors: false,
  guides: false,
})
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
const supportsTransparency = computed(() => fileType.value !== 'image/jpeg')
const validBackground = computed(() => /^#[\da-f]{6}$/i.test(backgroundColor.value))
const availableFeatureOptions = computed(() =>
  featureOptions.filter((option) => availableFeatures.value[option.value]),
)

function submit() {
  if (!transparent.value && !validBackground.value) return
  const resolvedFileName = resolveExportFileName(fileName.value)
  savedFileName.value = resolvedFileName
  emit('export', {
    fileName: resolvedFileName,
    ...selectedResolution.value,
    backgroundColor: backgroundColor.value,
    transparent: transparent.value,
    fileType: fileType.value,
    quality: quality.value,
    hiddenFeatures: availableFeatureOptions.value
      .filter((option) => disabledFeatures.value[option.value])
      .map((option) => option.value),
  })
  isOpen.value = false
}

function open(
  canvas: VideoExportDimensions,
  aspect: readonly [number, number],
  features: ImageExportFeatureAvailability = {
    paths: false,
    hands: false,
    arms: false,
    visible: false,
    nodes: false,
    anchors: false,
    guides: false,
  },
) {
  configureResolution(canvas, aspect)
  availableFeatures.value = features
  fileName.value = savedFileName.value
  isOpen.value = true
}

function updateFileName(event: Event) {
  fileName.value = sanitizeExportFileName((event.target as HTMLInputElement).value)
}

watch(supportsTransparency, (supported) => {
  if (!supported) transparent.value = false
})

defineExpose({ open })
</script>

<style scoped>
:global(.export-image-dialog) {
  width: min(30rem, calc(100vw - (2 * var(--space-4))));
  max-height: calc(100dvh - (2 * var(--space-4)));
}

:deep(.base-dialog__body) {
  max-height: calc(100dvh - 8rem);
  padding: var(--space-4);
  overflow-y: auto;
}

.export-form,
label {
  display: grid;
}

.export-form {
  gap: var(--space-3);
}

.export-note {
  margin: 0;
  padding: var(--space-3);
  color: var(--color-text-muted);
  font-size: 0.875rem;
  background: color-mix(in srgb, var(--color-action-primary) 6%, transparent);
  border-inline-start: 3px solid var(--color-action-primary);
  border-radius: var(--radius-sm);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

label {
  gap: var(--space-1);
  min-width: 0;
  font-size: 0.875rem;
  font-weight: 700;
}

.file-name-field,
.background-field,
.alpha-field,
.custom-resolution,
.feature-options {
  grid-column: 1 / -1;
}

.feature-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2) var(--space-3);
  min-width: 0;
  margin: 0;
  padding: var(--space-3);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.feature-options legend {
  padding-inline: var(--space-1);
  font-size: 0.875rem;
  font-weight: 700;
}

.feature-options label {
  font-weight: 600;
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

select:focus-visible,
input:focus-visible,
button:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.export-button {
  min-height: 2.5rem;
  color: var(--color-on-action-primary);
  font: inherit;
  font-weight: 700;
  background: var(--color-action-primary);
  border: 2px solid var(--color-action-primary);
  border-radius: var(--radius-sm);
}

.export-button:disabled {
  color: var(--color-text-muted);
  background: var(--color-surface);
  border-color: var(--color-border);
  opacity: 0.65;
}

@media (max-width: 32rem) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .file-name-field,
  .background-field,
  .alpha-field,
  .custom-resolution,
  .feature-options {
    grid-column: auto;
  }

  .feature-options {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
