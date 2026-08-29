<template>
  <AppTooltip text="Free Camera">
    <template #activator="{ props: tooltipProps }">
      <button
        v-bind="tooltipProps"
        class="free-camera-control"
        :class="{
          'free-camera-control--active': freeCamera,
          'free-camera-control--compact': compact,
        }"
        type="button"
        :aria-pressed="freeCamera"
        aria-label="Free camera"
        @click="freeCamera = !freeCamera"
      >
        <BaseIcon :path="mdiImageFilterCenterFocusWeak" :size="30" />
      </button>
    </template>
  </AppTooltip>
</template>

<script setup lang="ts">
import { mdiImageFilterCenterFocusWeak } from '@mdi/js'

import AppTooltip from '@/components/AppTooltip.vue'
import BaseIcon from '@/components/icons/BaseIcon.vue'
import { usePlayerStore } from '@/stores/usePlayerStore'

const props = defineProps<{
  store: string
  compact?: boolean
}>()

const { freeCamera } = storeToRefs(usePlayerStore(props.store))
</script>

<style scoped>
.free-camera-control {
  display: inline-flex;
  padding: 2px;
  color: var(--color-text-muted);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  align-items: center;
  justify-content: center;
}

.free-camera-control--compact {
  background: color-mix(in srgb, var(--color-surface) 75%, transparent);
  border: 1px solid var(--color-border);
  border-radius: 50%;
}

.free-camera-control--active,
.free-camera-control:hover {
  color: var(--color-action-primary);
}

.free-camera-control--compact:hover {
  color: var(--color-text);
}

.free-camera-control:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}
</style>
