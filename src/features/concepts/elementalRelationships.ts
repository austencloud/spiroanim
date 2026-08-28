import type { VtgDirectionCode, VtgTimingCode } from '@/features/vtg/types'

export type ElementName = 'Earth' | 'Water' | 'Air' | 'Fire'
export interface ElementalRelationship {
  timing: VtgTimingCode
  direction: VtgDirectionCode
}

/**
 * These folk-community labels are applied to VTG relationships but are not original VTG
 * terminology. See ATTRIBUTION.md for lineage and attribution.
 */
export const relationshipElement = (
  relationship: ElementalRelationship | undefined,
): ElementName | undefined => {
  if (!relationship || relationship.timing === 'Q') return
  if (relationship.timing === 'T') return relationship.direction === 'S' ? 'Earth' : 'Air'
  return relationship.direction === 'S' ? 'Water' : 'Fire'
}
