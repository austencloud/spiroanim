import { describe, expect, it, vi } from 'vitest'

import { applyAnimatorPathModes } from '@/workers/animation/applyAnimatorPathModes'

const createAnimator = () => ({
  setProgressivePaths: vi.fn<(enabled: boolean) => void>(),
  setDoublePaths: vi.fn<(enabled: boolean) => void>(),
})

describe('applyAnimatorPathModes', () => {
  it('reapplies disabled Double Paths to newly created animators', () => {
    const animator = createAnimator()

    applyAnimatorPathModes([animator], {
      progressivePaths: true,
      doublePaths: false,
      timeline: false,
      thumbnail: false,
      selection: false,
    })

    expect(animator.setProgressivePaths).toHaveBeenCalledWith(true)
    expect(animator.setDoublePaths).toHaveBeenCalledWith(false)
  })

  it('disables Double Paths for Timeline and thumbnail renderers', () => {
    for (const state of [
      { timeline: true, thumbnail: false },
      { timeline: false, thumbnail: true },
    ]) {
      const animator = createAnimator()

      applyAnimatorPathModes([animator], {
        progressivePaths: true,
        doublePaths: true,
        selection: false,
        ...state,
      })

      expect(animator.setDoublePaths).toHaveBeenCalledWith(false)
    }
  })
})
