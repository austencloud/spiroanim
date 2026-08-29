import { describe, expect, it } from 'vitest'

import { useCollapsibleVerticalPanes } from '@/composables/useCollapsibleVerticalPanes'

describe('useCollapsibleVerticalPanes', () => {
  it('preserves the split and expands the primary pane while disabled', async () => {
    const topPercentage = ref(40)
    const splitEnabled = ref(true)
    const primaryPane = ref<'top' | 'bottom'>('bottom')
    const paneVisible = ref({ top: true, bottom: true })
    const { topFlex, bottomFlex } = useCollapsibleVerticalPanes({
      topPercentage,
      splitEnabled,
      primaryPane,
      paneVisible,
    })

    expect(topFlex.value).toBe('0 0 40%')
    expect(bottomFlex.value).toBe('0 0 60%')

    splitEnabled.value = false
    await nextTick()

    expect(paneVisible.value).toEqual({ top: false, bottom: true })
    expect(topPercentage.value).toBe(40)

    primaryPane.value = 'top'
    await nextTick()

    expect(topFlex.value).toBe('0 0 100%')
    expect(bottomFlex.value).toBe('0 0 0%')
    expect(paneVisible.value).toEqual({ top: true, bottom: false })

    splitEnabled.value = true
    await nextTick()
    expect(paneVisible.value).toEqual({ top: true, bottom: true })
  })

  it('applies reusable splitter snap points', () => {
    const topPercentage = ref(50)
    const { setTopPercentage } = useCollapsibleVerticalPanes({
      topPercentage,
      splitEnabled: ref(true),
      primaryPane: ref('top'),
      paneVisible: ref({ top: true, bottom: true }),
    })

    setTopPercentage(4)
    expect(topPercentage.value).toBe(0)
    setTopPercentage(10)
    expect(topPercentage.value).toBe(20)
    setTopPercentage(90)
    expect(topPercentage.value).toBe(80)
    setTopPercentage(96)
    expect(topPercentage.value).toBe(100)
  })
})
