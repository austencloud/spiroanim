import { describe, expect, it, vi } from 'vitest'

import { applyAnimatorPathModes } from '@/workers/animation/applyAnimatorPathModes'

const createAnimator = () => ({
  setProgressivePaths: vi.fn<(enabled: boolean) => void>(),
  setAllHeadPaths: vi.fn<(enabled: boolean) => void>(),
})

describe('applyAnimatorPathModes', () => {
  it('reapplies disabled All Head Paths to newly created animators', () => {
    const animator = createAnimator()

    applyAnimatorPathModes([animator], {
      progressivePaths: true,
      allHeadPaths: false,
      timeline: false,
      thumbnail: false,
      selection: false,
    })

    expect(animator.setProgressivePaths).toHaveBeenCalledWith(true)
    expect(animator.setAllHeadPaths).toHaveBeenCalledWith(false)
  })

  it('disables All Head Paths for Timeline and thumbnail renderers', () => {
    for (const state of [
      { timeline: true, thumbnail: false },
      { timeline: false, thumbnail: true },
    ]) {
      const animator = createAnimator()

      applyAnimatorPathModes([animator], {
        progressivePaths: true,
        allHeadPaths: true,
        selection: false,
        ...state,
      })

      expect(animator.setAllHeadPaths).toHaveBeenCalledWith(false)
    }
  })
})
