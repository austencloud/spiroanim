import { applyVtgFoldSettings } from '@/features/vtg/applyVtgFoldSettings'
import { applyVtgTwistSettings } from '@/features/vtg/applyVtgTwistSettings'
import type { RootDataFinal } from '@/types/AnimTypes'

/** Removes generator-owned property tracks before identifying the underlying VTG/QTR pattern. */
export const stripVtgPropertySettings = (animation: RootDataFinal): RootDataFinal =>
  applyVtgFoldSettings(applyVtgTwistSettings(animation, 'advanced', [{}, {}]), [{}, {}])
