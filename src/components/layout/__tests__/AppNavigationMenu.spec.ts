import { flushPromises, mount } from '@vue/test-utils'
import { mdiFirework, mdiFireworkOff, mdiFullscreen, mdiFullscreenExit } from '@mdi/js'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AppNavigationMenu from '@/components/layout/AppNavigationMenu.vue'
import { initializePwaInstallPromptCapture } from '@/composables/usePwaInstall'
import { useMainPaneStore } from '@/stores/useMainPaneStore'
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
const displayState = vi.hoisted(() => ({
  isInstalledDisplay: { value: false },
  isIos: { value: false },
}))
const videoExportState = vi.hoisted(() => ({
  hasApi: false,
  codecs: [] as Array<{ codec: string; container: 'mp4' | 'webm'; label: string }>,
}))

vi.mock('@vueuse/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@vueuse/core')>()),
  useFullscreen: () => fullscreenState,
}))
vi.mock('@/composables/useAppDisplayMode', () => ({
  useAppDisplayMode: () => displayState,
}))
vi.mock('@/services/videoExportSupport', () => ({
  hasVideoExportApi: () => videoExportState.hasApi,
  probeVideoExportCodecs: () => Promise.resolve(videoExportState.codecs),
}))

async function mountMenu() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>Home</div>' } },
      { path: '/about', component: { template: '<div>About</div>' } },
      { path: '/tips', component: { template: '<div>Tips</div>' } },
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
    displayState.isInstalledDisplay.value = false
    displayState.isIos.value = false
    videoExportState.hasApi = false
    videoExportState.codecs = []
    Reflect.deleteProperty(navigator, 'clipboard')
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
      'Share This',
      'Tips',
      'Export Image',
      'Export Video',
      'Tracer: Off',
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
    expect(document.activeElement?.textContent).toContain('Share This')

    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement?.textContent).toContain('Tips')

    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement?.textContent).toContain('Export Image')

    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement?.textContent).toContain('Export Video')

    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement?.textContent).toContain('Tracer: Off')

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

  it('places the tracer item beneath both export actions', async () => {
    const playerStore = usePlayerStore('main')
    playerStore.CANVAS_DIM = { width: 1280, height: 720 }
    const { wrapper } = await mountMenu()

    await wrapper.get('.menu-trigger').trigger('click')
    const menuItems = wrapper.findAll('[role="menuitem"]')
    const tracerIndex = menuItems.findIndex((item) => item.classes().includes('tracer-menu-item'))
    const exportImageIndex = menuItems.findIndex((item) =>
      item.classes().includes('export-image-menu-item'),
    )
    const exportVideoIndex = menuItems.findIndex((item) =>
      item.classes().includes('export-video-menu-item'),
    )

    expect(exportVideoIndex).toBe(exportImageIndex + 1)
    expect(tracerIndex).toBe(exportVideoIndex + 1)
    await wrapper.get('.export-image-menu-item').trigger('click')

    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(wrapper.get('.export-image-dialog').attributes()).toHaveProperty('open')
    expect(wrapper.get<HTMLSelectElement>('.export-image-dialog select').element.value).toBe(
      '1280x720',
    )

    wrapper.unmount()
  })

  it('shows player actions only while the player view is visible', async () => {
    const paneStore = useMainPaneStore()
    paneStore.setViewInPane('editor', 'left')
    const { wrapper } = await mountMenu()

    await wrapper.get('.menu-trigger').trigger('click')

    expect(wrapper.find('.tracer-menu-item').exists()).toBe(false)
    expect(wrapper.find('.export-image-menu-item').exists()).toBe(false)
    expect(wrapper.find('.export-video-menu-item').exists()).toBe(false)

    wrapper.unmount()
  })

  it('explains when video export is unavailable', async () => {
    const { wrapper } = await mountMenu()

    await wrapper.get('.menu-trigger').trigger('click')
    const exportItem = wrapper.get('.export-video-menu-item')

    expect(exportItem.attributes('aria-disabled')).toBe('true')
    expect(exportItem.classes()).toContain('menu-action--unavailable')

    await exportItem.trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(wrapper.get('.export-video-dialog').attributes()).toHaveProperty('open')
    expect(wrapper.get('[role="alert"]').text()).toContain(
      'not supported on this device or browser',
    )

    wrapper.unmount()
  })

  it('opens export settings populated with supported codecs', async () => {
    videoExportState.hasApi = true
    videoExportState.codecs = [
      { codec: 'avc1.42001f', container: 'mp4', label: 'H.264 (MP4)' },
      { codec: 'vp09.00.10.08', container: 'webm', label: 'VP9 (WebM)' },
    ]
    const playerStore = usePlayerStore('main')
    playerStore.CANVAS_DIM = { width: 973, height: 550 }
    const { wrapper } = await mountMenu()
    await flushPromises()

    await wrapper.get('.menu-trigger').trigger('click')
    const exportItem = wrapper.get('.export-video-menu-item')
    expect(exportItem.attributes('aria-disabled')).toBe('false')

    await exportItem.trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(
      wrapper
        .get('.codec-field select')
        .findAll('option')
        .map((option) => option.text()),
    ).toEqual(['H.264 (MP4)', 'VP9 (WebM)'])
    expect(wrapper.get('.availability-status').text()).toBe('2 compatible codecs available.')
    expect(wrapper.get('input[type="color"]').element).toHaveProperty('value', '#090b0f')
    expect(
      wrapper
        .get('.export-video-dialog select')
        .findAll('option')
        .map((option) => option.text()),
    ).toEqual([
      'Current - 974 x 548 (adjusted from 973 x 550)',
      '1280 x 720 (16:9)',
      '1920 x 1080 (16:9)',
      '2560 x 1440 (16:9)',
      '3840 x 2160 (16:9)',
      'Custom',
    ])

    wrapper.unmount()
  })

  it('opens a share dialog containing the complete current URL', async () => {
    const { wrapper } = await mountMenu()

    await wrapper.get('.menu-trigger').trigger('click')
    const spiroAnimItems = wrapper
      .get('[aria-labelledby="spiroanim-heading"]')
      .findAll('[role="menuitem"]')

    expect(spiroAnimItems.map((item) => item.text())).toEqual([
      'Share This',
      'Tips',
      'Export Image',
      'Export Video',
      'Tracer: Off',
    ])

    await wrapper.get('.share-menu-item').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(wrapper.get('.share-dialog').attributes()).toHaveProperty('open')
    expect(wrapper.get('.share-dialog input').element).toHaveProperty('value', window.location.href)
    expect(wrapper.get('.share-note').text()).toContain('any portion of this app can be shared')
    expect(wrapper.find('.copy-button').exists()).toBe(false)

    wrapper.unmount()
  })

  it('offers clipboard copying only when the Clipboard API is available', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>(async () => undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    const { wrapper } = await mountMenu()

    await wrapper.get('.menu-trigger').trigger('click')
    await wrapper.get('.share-menu-item').trigger('click')
    await wrapper.get('.copy-button').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith(window.location.href)
    expect(wrapper.get('.copy-button').text()).toBe('Copied')
    expect(wrapper.get('[role="status"]').text()).toBe('Copied.')

    wrapper.unmount()
    Reflect.deleteProperty(navigator, 'clipboard')
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
      'Share This',
      'Tips',
      'Export Image',
      'Export Video',
      'Tracer: Off',
      'Home',
      'About',
    ])

    wrapper.unmount()
  })

  it('hides the fullscreen item on iOS and iPadOS', async () => {
    displayState.isIos.value = true
    const { wrapper } = await mountMenu()

    await wrapper.get('.menu-trigger').trigger('click')

    expect(wrapper.find('.fullscreen-menu-item').exists()).toBe(false)

    wrapper.unmount()
  })
})
