import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import KineticAlphabetPane from '@/features/kinetic-alphabet/components/KineticAlphabetPane.vue'
import type { ComposerCell } from '@/features/kinetic-alphabet/composerBridge'

const guideUrl = 'https://tkaflowarts.com/guide'

describe('KineticAlphabetPane', () => {
  it('introduces the notation and always offers the guide', () => {
    const wrapper = mount(KineticAlphabetPane)
    const guideLink = wrapper.get('[data-role="tka-guide-link"]')

    expect(wrapper.get('#kinetic-alphabet-title').text()).toBe('The Kinetic Alphabet')
    expect(wrapper.get('[data-role="tka-pane"]').text()).toContain(
      'TKA writes prop motion as letters',
    )
    expect(guideLink.text()).toBe('About TKA')
    expect(guideLink.attributes('href')).toBe(guideUrl)
    expect(guideLink.attributes('target')).toBe('_blank')
    expect(guideLink.attributes('rel')).toBe('noopener')
    expect(wrapper.find('[data-role="tka-composer-link"]').exists()).toBe(false)
    expect(wrapper.emitted('patternSelect')).toBeUndefined()
  })

  it('opens the matched cell in the Composer', () => {
    const composerCell: ComposerCell = {
      concept: 'qtr',
      reference: '5-6',
      speedRatio: '1:5',
      shape: 'diamond',
      isAnti: true,
      orientation: 45,
    }

    const wrapper = mount(KineticAlphabetPane, { props: { composerCell } })
    const composerLink = wrapper.get('[data-role="tka-composer-link"]')

    expect(composerLink.text()).toBe('Open QTR 5-6 in Flow Arts Composer')
    expect(composerLink.attributes('href')).toBe(
      'https://tkaflowarts.com/from/spiroanim/qtr.5-6.1x5.diamond.anti.o45',
    )
    expect(composerLink.attributes('target')).toBe('_blank')
    expect(composerLink.attributes('rel')).toBe('noopener')
    expect(wrapper.get('[data-role="tka-guide-link"]').attributes('href')).toBe(guideUrl)
  })

  it('names an Eight Step cell by its catalog reference', () => {
    const composerCell: ComposerCell = { concept: '8stp', reference: '4-II', shape: 'box' }

    const wrapper = mount(KineticAlphabetPane, { props: { composerCell } })
    const composerLink = wrapper.get('[data-role="tka-composer-link"]')

    expect(composerLink.text()).toBe('Open Eight Step 4-II in Flow Arts Composer')
    expect(composerLink.attributes('href')).toBe(
      'https://tkaflowarts.com/from/spiroanim/8stp.4-ii.1x1.box.base',
    )
  })
})
