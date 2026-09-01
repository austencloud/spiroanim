import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'

import { pwaUpdateControllerKey, type PwaUpdateController } from '@/composables/usePwaUpdate'
import NotFound from '@/views/NotFound.vue'

describe('NotFound view', () => {
  async function mountNotFound(controller: PwaUpdateController) {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/app', component: { template: '<div>Application</div>' } },
        { path: '/:pathMatch(.*)*', component: NotFound },
      ],
    })
    await router.push('/missing-page')
    await router.isReady()

    return mount(NotFound, {
      global: {
        plugins: [router],
        provide: { [pwaUpdateControllerKey as symbol]: controller },
        stubs: {
          BaseIcon: true,
        },
      },
    })
  }

  function createPwaController() {
    const needRefresh = ref(false)
    const offlineReady = ref(false)
    const updateFailed = ref(false)
    const updateInstalling = ref(false)
    const applyUpdate = vi.fn<() => void>()
    const controller: PwaUpdateController = {
      applyUpdate,
      checkForUpdate: vi.fn<() => Promise<boolean>>(async () => false),
      dismiss: vi.fn<() => void>(),
      needRefresh,
      offlineReady,
      updateFailed,
      updateInstalling,
    }

    return {
      applyUpdate,
      controller,
      needRefresh,
      updateFailed,
      updateInstalling,
    }
  }

  it('offers accessible routes back to the site and editor', async () => {
    const { controller } = createPwaController()
    const wrapper = await mountNotFound(controller)

    expect(wrapper.get('h1').text()).toBe('This path drifted out of frame.')
    expect(wrapper.get('.error-code').text()).toBe('Error 404')
    expect(wrapper.get('.update-hint').text()).toContain(
      "If you opened someone's link and have previously visited spiroanim.com",
    )
    expect(wrapper.get('.update-hint').text()).toContain('Update Now')
    expect(wrapper.get('.update-hint').attributes('aria-label')).toBe('Possible app update')
    expect(wrapper.get('nav').attributes('aria-label')).toBe('Page recovery')
    expect(wrapper.get('.action-link--primary').attributes('href')).toBe('/')
    expect(wrapper.get('.action-link--secondary').attributes('href')).toBe('/app')
    expect(wrapper.get('.brand-link').attributes('aria-label')).toBe('SpiroAnim home')
  })

  it('replaces every 404 indication while an update is downloading', async () => {
    const { controller, updateInstalling } = createPwaController()
    updateInstalling.value = true
    const wrapper = await mountNotFound(controller)

    expect(wrapper.get('h1').text()).toBe('Please wait.')
    expect(wrapper.text()).toContain('Downloading the update.')
    expect(wrapper.text()).not.toContain('Error 404')
    expect(wrapper.text()).not.toContain('drifted out of frame')
    expect(wrapper.find('.visual-code').exists()).toBe(false)
    expect(wrapper.find('.not-found-actions').exists()).toBe(false)
    expect(wrapper.find('.update-visual-icon').exists()).toBe(true)
    expect(wrapper.get('.update-progress').attributes('role')).toBe('progressbar')
    expect(wrapper.get('.update-progress').attributes('aria-valuenow')).toBeUndefined()
  })

  it('automatically applies an update when it becomes ready', async () => {
    const { applyUpdate, controller, needRefresh, updateInstalling } = createPwaController()
    updateInstalling.value = true
    const wrapper = await mountNotFound(controller)

    updateInstalling.value = false
    needRefresh.value = true
    await nextTick()

    expect(applyUpdate).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('Applying the update.')
    expect(wrapper.find('.update-progress').exists()).toBe(true)
  })

  it('stops the activity indicator and offers a reload when the update fails', async () => {
    const { controller, updateFailed } = createPwaController()
    updateFailed.value = true
    const wrapper = await mountNotFound(controller)

    expect(wrapper.get('h1').text()).toBe('Please wait.')
    expect(wrapper.text()).toContain('The update did not finish.')
    expect(wrapper.get('.update-failure').attributes('role')).toBe('alert')
    expect(wrapper.get('.update-failure').text()).toContain('Update failed to load.')
    expect(wrapper.get('.update-failure').text()).toContain('Reload the page to try again.')
    expect(wrapper.get('.reload-button').text()).toBe('Reload Page')
    expect(wrapper.find('.update-progress').exists()).toBe(false)
  })
})
