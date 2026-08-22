interface PathModeAnimator {
  setProgressivePaths: (enabled: boolean) => void
  setDoublePaths: (enabled: boolean) => void
}

export interface AnimatorPathModeState {
  progressivePaths: boolean
  doublePaths: boolean
  timeline: boolean
  thumbnail: boolean
  selection: boolean
}

export const applyAnimatorPathModes = (
  animators: readonly PathModeAnimator[],
  state: AnimatorPathModeState,
): void => {
  const progressivePaths = state.progressivePaths && !state.timeline && !state.selection
  const doublePaths = state.doublePaths && !state.timeline && !state.thumbnail

  for (const animator of animators) {
    animator.setProgressivePaths(progressivePaths)
    animator.setDoublePaths(doublePaths)
  }
}
