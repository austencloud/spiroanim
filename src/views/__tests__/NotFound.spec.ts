import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'

import NotFound from '@/views/NotFound.vue'

describe('NotFound view', () => {
  it('offers accessible routes back to the site and editor', async () => {
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

    const wrapper = mount(NotFound, {
      global: {
        plugins: [router],
        stubs: {
          BaseIcon: true,
        },
      },
    })

    expect(wrapper.get('h1').text()).toBe('This path drifted out of frame.')
    expect(wrapper.get('.error-code').text()).toBe('Error 404')
    expect(wrapper.get('nav').attributes('aria-label')).toBe('Page recovery')
    expect(wrapper.get('.action-link--primary').attributes('href')).toBe('/')
    expect(wrapper.get('.action-link--secondary').attributes('href')).toBe('/app')
    expect(wrapper.get('.brand-link').attributes('aria-label')).toBe('SpiroAnim home')
  })
})
