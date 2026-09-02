import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { usePatternPropertyControls } from '@/features/concepts/composables/usePatternPropertyControls'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import type { RootDataFinal } from '@/types/AnimTypes'

describe('usePatternPropertyControls', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shares advanced modes and fold scheduling while emitting complete animations', () => {
    const source = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:1' })
    const animation = shallowRef<RootDataFinal | undefined>(source)
    const updates: RootDataFinal[] = []
    const controls = usePatternPropertyControls({
      animation,
      onAnimationUpdate: (updated) => updates.push(updated),
    })

    controls.updateTwistMode('advanced')
    expect(controls.vtgTwistMode.value).toBe('advanced')

    controls.updateFoldMirror(false)
    controls.updateFoldSetting(0, 2, 'rotate', 4)

    expect(controls.vtgFoldMirror.value).toBe(false)
    expect(updates.at(-1)?.props[0]?.anim.some((frame) => frame.rotate !== undefined)).toBe(true)
    expect(updates.at(-1)?.props[1]?.anim.some((frame) => frame.rotate !== undefined)).toBe(false)
  })
})
