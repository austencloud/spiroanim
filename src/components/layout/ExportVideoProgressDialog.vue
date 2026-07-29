<template>
  <BaseDialog
    v-model="isOpen"
    class="export-video-progress-dialog"
    title="Exporting Video"
    close-label="Cancel video export"
  >
    <div class="progress-content" role="status" aria-live="polite">
      <p>{{ message }}</p>
      <progress :value="progress.completedFrames" :max="Math.max(progress.totalFrames, 1)" />
      <span v-if="status === 'rendering'">
        Frame {{ progress.completedFrames }} of {{ progress.totalFrames }} ({{ percentage }}%)
      </span>
      <p v-if="status === 'error'" class="error-message" role="alert">{{ error }}</p>
      <button v-if="active" type="button" @click="cancel">Cancel Export</button>
      <button v-else type="button" @click="isOpen = false">Close</button>
    </div>
  </BaseDialog>
</template>

<script setup lang="ts">
import BaseDialog from '@/components/ui/BaseDialog.vue'
import type { VideoExportProgress, VideoExportStatus } from '@/types/VideoExportTypes'

const props = defineProps<{
  status: VideoExportStatus
  progress: VideoExportProgress
  error: string
}>()
const emit = defineEmits<{ cancel: [] }>()
const isOpen = ref(false)
const active = computed(() => props.status === 'rendering' || props.status === 'finalizing')
const percentage = computed(() =>
  props.progress.totalFrames > 0
    ? Math.round((props.progress.completedFrames / props.progress.totalFrames) * 100)
    : 0,
)
const message = computed(() => {
  if (props.status === 'finalizing') return 'Finishing the video file...'
  if (props.status === 'complete') return 'Video export complete.'
  if (props.status === 'canceled') return 'Video export canceled. The player has been restored.'
  if (props.status === 'error') return 'The video could not be exported.'
  return 'Rendering the animation frame by frame...'
})

function open() {
  isOpen.value = true
}

function cancel() {
  emit('cancel')
}

watch(isOpen, (open, wasOpen) => {
  if (wasOpen && !open && active.value) emit('cancel')
})

defineExpose({ open })
</script>

<style scoped>
:global(.export-video-progress-dialog) {
  width: min(28rem, calc(100vw - (2 * var(--space-4))));
}

.progress-content {
  display: grid;
  gap: var(--space-3);
}

p {
  margin: 0;
}

progress {
  width: 100%;
  height: 1rem;
  accent-color: var(--color-action-primary);
}

span {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.error-message {
  color: var(--color-aspect-unmatched);
}

button {
  min-height: 2.5rem;
  padding-inline: var(--space-4);
  color: var(--color-text);
  font: inherit;
  font-weight: 700;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
}

button:hover,
button:focus-visible {
  color: var(--color-action-primary);
  border-color: var(--color-action-primary);
}

button:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}
</style>
