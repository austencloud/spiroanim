import { flushPromises, mount } from '@vue/test-utils'
import { mdiFirework, mdiFireworkOff, mdiFullscreen, mdiFullscreenExit } from '@mdi/js'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AppNavigationMenu from '@/components/layout/AppNavigationMenu.vue'
import { initializePwaInstallPromptCapture } from '@/composables/usePwaInstall'
import { usePlayerStore } from '@/stores/usePlayerStore'

class TestInstallPromptEvent extends Event {
  readonly platforms = ['web']
  readonly prompt = vi.fn<() => Promise<void>>(async () => undefined)
  readonly userChoice = Promise.resolve({ outcome: 'accepted' as const, platform: 'web' })
}

const fullscreenState = vi.hoisted(() => ({
  isFullscreen: { value: false },
  isSupported: { value: true },
  toggle: vi.fn<() => Promise<void>>(async () => undefined),
}))

vi.mock('@vueuse/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@vueuse/core')>()),
  useFullscreen: () => fullscreenState,
}))

async function mountMenu() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>Home</div>' } },
      { path: '/about', component: { template: '<div>About</div>' } },
      { path: '/player', component: { template: '<div>Player</div>' } },
      { path: '/editor', component: { template: '<div>Editor</div>' } },
      { path: '/timeline', component: { template: '<div>Timeline</div>' } },
    ],
  })
  await router.push('/player?r=animation-data')
  await router.isReady()

  const wrapper = mount(AppNavigationMenu, {
    attachTo: document.body,
    global: {
      plugins: [router],
      stubs: {
        AppTooltip: {
          template: '<div><slot name="activator" :props="{}" /></div>',
        },
        BaseIcon: {
          props: ['path'],
          template: '<svg :data-path="path" />',
        },
      },
    },
  })

  return { router, wrapper }
}

describe('AppNavigationMenu', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    fullscreenState.isFullscreen.value = false
    fullscreenState.isSupported.value = true
    fullscreenState.toggle.mockClear()
  })

  it('opens page navigation with mobile-sized menu items', async () => {
    const { wrapper } = await mountMenu()
    const trigger = wrapper.get('button')

    expect(trigger.attributes('aria-haspopup')).toBe('menu')
    expect(trigger.attributes('aria-expanded')).toBe('false')

    await trigger.trigger('click')

    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('[role="menu"]').attributes('aria-labelledby')).toBe(
      trigger.attributes('id'),
    )
    expect(wrapper.findAll('[role="menuitem"]').map((item) => item.text())).toEqual([
      'Enter Full Screen',
      'Tracer: Off',
      'Save Image',
      'Home',
      'About',
    ])
    expect(wrapper.findAll('.menu-group h2').map((heading) => heading.text())).toEqual([
      'SpiroAnim',
      'Navigation',
    ])

    wrapper.unmount()
  })

  it('offers installation directly beneath About when the app can be installed', async () => {
    const stopPromptCapture = initializePwaInstallPromptCapture()
    const event = new TestInstallPromptEvent('beforeinstallprompt', { cancelable: true })
    window.dispatchEvent(event)
    const { wrapper } = await mountMenu()

    await wrapper.get('.menu-trigger').trigger('click')

    const navigationItems = wrapper
      .get('[aria-labelledby="navigation-heading"]')
      .findAll('[role="menuitem"]')
    expect(navigationItems.map((item) => item.text())).toEqual(['Home', 'About', 'Install App'])

    await wrapper.get('.pwa-install--menu button').trigger('click')
    await flushPromises()

    expect(event.prompt).toHaveBeenCalledOnce()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)

    wrapper.unmount()
    stopPromptCapture()
  })

  it('supports keyboard opening, movement, and dismissal', async () => {
    const { wrapper } = await mountMenu()
    const trigger = wrapper.get('button')

    await trigger.trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement?.textContent).toContain('Enter Full Screen')

    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement?.textContent).toContain('Tracer: Off')

    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement?.textContent).toContain('Save Image')

    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement?.textContent).toContain('Home')

    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement?.textContent).toContain('About')

    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger.element)

    wrapper.unmount()
  })

  it('toggles tracer mode with state-specific text and icons', async () => {
    const playerStore = usePlayerStore('main')
    const { wrapper } = await mountMenu()

    await wrapper.get('.menu-trigger').trigger('click')
    const tracerItem = wrapper.get('.tracer-menu-item')

    expect(tracerItem.text()).toBe('Tracer: Off')
    expect(tracerItem.attributes('aria-pressed')).toBe('false')
    expect(tracerItem.get('svg').attributes('data-path')).toBe(mdiFireworkOff)

    await tracerItem.trigger('click')

    expect(playerStore.TRACER).toBe(true)
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)

    await wrapper.get('.menu-trigger').trigger('click')
    const activeTracerItem = wrapper.get('.tracer-menu-item')
    expect(activeTracerItem.text()).toBe('Tracer: On')
    expect(activeTracerItem.attributes('aria-pressed')).toBe('true')
    expect(activeTracerItem.get('svg').attributes('data-path')).toBe(mdiFirework)

    wrapper.unmount()
  })

  it('requests an image save from beneath the tracer item', async () => {
    const playerStore = usePlayerStore('main')
    const previousRequest = playerStore.saveImage
    const { wrapper } = await mountMenu()

    await wrapper.get('.menu-trigger').trigger('click')
    const menuItems = wrapper.findAll('[role="menuitem"]')
    const tracerIndex = menuItems.findIndex((item) => item.classes().includes('tracer-menu-item'))
    const saveImageIndex = menuItems.findIndex((item) =>
      item.classes().includes('save-image-menu-item'),
    )

    expect(saveImageIndex).toBe(tracerIndex + 1)
    await wrapper.get('.save-image-menu-item').trigger('click')

    expect(playerStore.saveImage).not.toBe(previousRequest)
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('toggles fullscreen from the uncategorized first menu item', async () => {
    const { wrapper } = await mountMenu()

    await wrapper.get('.menu-trigger').trigger('click')
    const fullscreenItem = wrapper.get('.fullscreen-menu-item')

    expect(fullscreenItem.text()).toBe('Enter Full Screen')
    expect(fullscreenItem.get('svg').attributes('data-path')).toBe(mdiFullscreen)

    await fullscreenItem.trigger('click')

    expect(fullscreenState.toggle).toHaveBeenCalledOnce()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('uses the exit label and icon while fullscreen is active', async () => {
    fullscreenState.isFullscreen.value = true
    const { wrapper } = await mountMenu()

    await wrapper.get('.menu-trigger').trigger('click')
    const fullscreenItem = wrapper.get('.fullscreen-menu-item')

    expect(fullscreenItem.text()).toBe('Exit Full Screen')
    expect(fullscreenItem.get('svg').attributes('data-path')).toBe(mdiFullscreenExit)

    wrapper.unmount()
  })

  it('hides the fullscreen item when the Fullscreen API is unavailable', async () => {
    fullscreenState.isSupported.value = false
    const { wrapper } = await mountMenu()

    await wrapper.get('.menu-trigger').trigger('click')

    expect(wrapper.find('.fullscreen-menu-item').exists()).toBe(false)
    expect(wrapper.findAll('[role="menuitem"]').map((item) => item.text())).toEqual([
      'Tracer: Off',
      'Save Image',
      'Home',
      'About',
    ])

    wrapper.unmount()
  })
})
