<template>
  <div ref="rootElement" class="base-popup-menu">
    <button
      :id="triggerId"
      ref="triggerElement"
      v-bind="triggerAttrs"
      class="base-popup-menu__trigger"
      :class="triggerClass"
      type="button"
      :aria-label="triggerAriaLabel"
      aria-haspopup="menu"
      :aria-controls="menuId"
      :aria-expanded="open"
      @click="toggleMenu"
      @keydown.arrow-down.prevent="openAndFocusFirst"
      @keydown.esc.stop.prevent="closeAndFocusTrigger"
    >
      <slot name="trigger" :is-open="open" />
    </button>

    <div
      v-if="open"
      :id="menuId"
      ref="menuElement"
      class="base-popup-menu__panel"
      :class="panelClass"
      role="menu"
      :aria-labelledby="triggerId"
      @keydown="onMenuKeydown"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { useId, type ButtonHTMLAttributes } from 'vue'

defineProps<{
  panelClass?: string
  triggerAttrs?: ButtonHTMLAttributes
  triggerAriaLabel?: string
  triggerClass?: string
}>()

const open = defineModel<boolean>('open', { default: false })
const rootElement = ref<HTMLElement>()
const triggerElement = ref<HTMLButtonElement>()
const menuElement = ref<HTMLElement>()
const triggerId = useId()
const menuId = useId()

const closeMenu = () => {
  open.value = false
}

const toggleMenu = () => {
  open.value = !open.value
}

const menuItems = (): HTMLElement[] =>
  Array.from(menuElement.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])

const openAndFocusFirst = async () => {
  open.value = true
  await nextTick()
  menuItems()[0]?.focus()
}

const closeAndFocusTrigger = () => {
  closeMenu()
  triggerElement.value?.focus()
}

const focusRelativeItem = (direction: 1 | -1) => {
  const items = menuItems()
  if (items.length === 0) return

  const currentIndex = items.indexOf(document.activeElement as HTMLElement)
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + direction + items.length) % items.length
  items[nextIndex]?.focus()
}

const onMenuKeydown = (event: KeyboardEvent) => {
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
</script>

<style scoped>
.base-popup-menu {
  position: relative;
  width: var(--popup-menu-trigger-width, var(--size-editor-toolbar-height));
}

.base-popup-menu__trigger {
  position: relative;
  display: grid;
  width: 100%;
  height: calc(var(--size-editor-toolbar-height) - 1px);
  padding: var(--popup-menu-trigger-padding, var(--space-1));
  place-items: center;
  color: var(--color-action-primary);
  font: inherit;
  background: color-mix(in srgb, var(--color-surface) 58%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-border) 65%, transparent);
  border-radius: var(--radius-sm);
  backdrop-filter: blur(0.45rem);
}

.base-popup-menu__trigger[aria-expanded='true'] {
  background: color-mix(in srgb, var(--color-action-primary) 14%, var(--color-surface));
  border-color: var(--color-action-primary);
}

.base-popup-menu__trigger:hover {
  background: color-mix(in srgb, var(--color-action-primary) 10%, var(--color-surface));
  border-color: var(--color-action-primary);
}

.base-popup-menu__trigger:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: -2px;
}

.base-popup-menu__panel {
  position: absolute;
  inset-block-start: calc(var(--size-editor-toolbar-height) + var(--space-2));
  inset-inline-start: 0;
  width: var(--popup-menu-panel-width, max-content);
  min-width: var(--popup-menu-panel-min-width, 0);
  max-width: var(--popup-menu-panel-max-width, calc(100vw - var(--space-8)));
  max-height: var(--popup-menu-panel-max-height, none);
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

.base-popup-menu__panel :deep([role='menuitem']) {
  min-height: 2.75rem;
  align-items: center;
  padding-inline: var(--space-3);
  color: var(--color-text);
  font-weight: 700;
  text-decoration: none;
  border-radius: var(--radius-sm);
}

.base-popup-menu__panel :deep([role='menuitem']:hover),
.base-popup-menu__panel :deep([role='menuitem']:focus-visible) {
  color: var(--color-action-primary);
  background: color-mix(in srgb, var(--color-action-primary) 10%, transparent);
}

.base-popup-menu__panel :deep([role='menuitem']:focus-visible) {
  outline: 2px solid var(--color-action-primary);
  outline-offset: -2px;
}
</style>
