<template>
  <div
    v-if="canPromptInstall || canShowIosInstructions"
    class="pwa-install"
    :class="`pwa-install--${variant}`"
    :role="variant === 'menu' ? 'none' : undefined"
  >
    <button
      class="install-button"
      type="button"
      :role="variant === 'menu' ? 'menuitem' : undefined"
      :aria-controls="canShowIosInstructions ? instructionsId : undefined"
      :aria-expanded="canShowIosInstructions ? showIosInstructions : undefined"
      @click="install"
    >
      <BaseIcon v-if="variant === 'menu'" :path="mdiDownloadOutline" :size="22" />
      <span>{{ canPromptInstall ? 'Install App' : 'Install from Safari' }}</span>
    </button>
    <div v-if="showIosInstructions" :id="instructionsId" class="install-instructions" role="status">
      <p class="instructions-title">Add SpiroAnim to your Home Screen:</p>
      <ol>
        <li>
          In Safari's toolbar, tap the
          <span class="share-control">
            <BaseIcon class="safari-share-icon" :path="mdiExport" :size="20" />
            Share
          </span>
          button - the square with an arrow pointing up.
        </li>
        <li>Tap <strong>More</strong> if shown, then tap <strong>Add to Home Screen</strong>.</li>
        <li>Turn on <strong>Open as Web App</strong> if shown, then tap <strong>Add</strong>.</li>
      </ol>
    </div>
  </div>
</template>

<script setup lang="ts">
import { mdiDownloadOutline, mdiExport } from '@mdi/js'
import { useId } from 'vue'

import BaseIcon from '@/components/icons/BaseIcon.vue'
import { usePwaInstall } from '@/composables/usePwaInstall'

interface Props {
  variant?: 'landing' | 'menu'
}

const { variant = 'landing' } = defineProps<Props>()
const emit = defineEmits<{
  prompted: []
}>()
const { canPromptInstall, canShowIosInstructions, promptInstall } = usePwaInstall()
const showIosInstructions = ref(false)
const instructionsId = useId()

async function install() {
  if (canPromptInstall.value) {
    await promptInstall()
    emit('prompted')
    return
  }

  showIosInstructions.value = !showIosInstructions.value
}
</script>

<style scoped>
.pwa-install {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  margin-block-start: var(--space-4);
}

.install-button {
  min-height: 2.75rem;
  padding-inline: var(--space-4);
  color: var(--color-action-primary);
  font-weight: 700;
  background: transparent;
  border: 1px solid var(--color-action-primary);
  border-radius: var(--radius-md);
}

.install-button:hover {
  color: var(--color-on-action-primary);
  background: var(--color-action-primary);
}

.install-button:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--color-action-primary) 45%, var(--color-text));
  outline-offset: 3px;
}

.pwa-install--menu {
  display: block;
  margin-block-start: 0;
}

.pwa-install--menu .install-button {
  display: grid;
  grid-template-columns: 1.5rem 1fr;
  gap: var(--space-3);
  width: 100%;
  min-height: 2.75rem;
  align-items: center;
  padding-inline: var(--space-3);
  color: var(--color-text);
  font: inherit;
  font-weight: 700;
  text-align: start;
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
}

.pwa-install--menu .install-button:hover,
.pwa-install--menu .install-button:focus-visible {
  color: var(--color-action-primary);
  background: color-mix(in srgb, var(--color-action-primary) 10%, transparent);
}

.pwa-install--menu .install-button:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: -2px;
}

.pwa-install--menu .install-instructions {
  padding: var(--space-2) var(--space-3) var(--space-3);
}

.install-instructions {
  max-width: 24rem;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  text-align: start;
  line-height: 1.5;
}

.instructions-title {
  margin: 0 0 var(--space-2);
  color: var(--color-text);
  font-weight: 700;
}

.install-instructions ol {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding-inline-start: var(--space-6);
}

.share-control {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  color: var(--color-text);
  font-weight: 700;
  white-space: nowrap;
  vertical-align: middle;
}

.share-control .base-icon {
  display: inline-block;
}

.safari-share-icon {
  transform: rotate(-90deg);
}
</style>
