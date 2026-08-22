import type { RootDataFinal } from '@/types/AnimTypes'

/** Retains ROOT's first-frame Scale when an operation replaces the first Builder portion. */
export const preserveVtgBuilderScale = (
  current: RootDataFinal,
  updated: RootDataFinal,
): RootDataFinal => ({
  ...updated,
  props: updated.props.map((prop, index) => {
    const firstFrame = prop.anim[0]
    if (firstFrame === undefined) return prop

    const sourceScale = current.props[index]?.anim[0]?.scale
    const retainedFirstFrame = { ...firstFrame }
    if (sourceScale === undefined) delete retainedFirstFrame.scale
    else retainedFirstFrame.scale = sourceScale

    return { ...prop, anim: [retainedFirstFrame, ...prop.anim.slice(1)] }
  }),
})
