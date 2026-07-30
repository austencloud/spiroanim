import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'

import TipsPage from '@/views/TipsPage.vue'

describe('Tips view', () => {
  it('documents app shortcuts and timeline selection gestures', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/app', component: { template: '<div>App</div>' } },
        { path: '/tips', component: TipsPage },
      ],
    })
    await router.push('/tips')
    await router.isReady()

    const wrapper = mount(TipsPage, { global: { plugins: [router] } })

    expect(wrapper.get('h1').text()).toContain('Move faster')
    expect(wrapper.text()).toContain('Play or pause the animation')
    expect(wrapper.text()).toContain('Move to the previous frame')
    expect(wrapper.text()).toContain('grow the selection left')
    expect(wrapper.text()).toContain('grow the selection right')
    expect(wrapper.text()).toContain('Shift')
    expect(wrapper.text()).toContain('Turn on selection mode')
    expect(wrapper.text()).toContain('Double-click')
    expect(wrapper.text()).toContain('Toggle selection mode on or off')
    expect(wrapper.text()).not.toContain('Timeline keyboard')
    expect(wrapper.text()).not.toContain('Main menu')
    expect(wrapper.get('a.back-link').attributes('href')).toBe('/app')
  })
})
