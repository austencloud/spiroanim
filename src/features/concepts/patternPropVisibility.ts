import type { PropDataFinal, PropReadable } from '@/types/AnimTypes'

export interface PatternPropVisibilitySelection {
  left?: false
  right?: false
}

const visibilityKeys = ['paths', 'hands', 'arms', 'visible'] as const

export const applyPatternPropVisibility = (
  props: readonly PropReadable[],
  selection: PatternPropVisibilitySelection,
): PropReadable[] =>
  props.map((prop, index) => {
    const enabled = (index === 0 ? selection.left : selection.right) !== false
    const result = { ...prop }

    for (const key of visibilityKeys) {
      if (enabled) delete result[key]
      else result[key] = false
    }

    return result
  })

export const isPatternPropVisible = (prop: PropDataFinal | undefined): boolean =>
  prop === undefined || !visibilityKeys.every((key) => prop[key] === false)
