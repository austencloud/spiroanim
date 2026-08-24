interface PathModeAnimator {
  setProgressivePaths: (enabled: boolean) => void
  setAllHeadPaths: (enabled: boolean) => void
}

export interface AnimatorPathModeState {
  progressivePaths: boolean
  allHeadPaths: boolean
  timeline: boolean
  thumbnail: boolean
  selection: boolean
}

export const applyAnimatorPathModes = (
  animators: readonly PathModeAnimator[],
  state: AnimatorPathModeState,
): void => {
  const progressivePaths = state.progressivePaths && !state.timeline && !state.selection
  const allHeadPaths = state.allHeadPaths && !state.timeline && !state.thumbnail

  for (const animator of animators) {
    animator.setProgressivePaths(progressivePaths)
    animator.setAllHeadPaths(allHeadPaths)
  }
}
