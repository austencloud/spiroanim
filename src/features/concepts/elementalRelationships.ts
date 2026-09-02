import type { PatternTimingCode } from '@/features/concepts/math/describePatternRelationships'
import type { VtgDirectionCode } from '@/features/vtg/types'

export type ElementName = 'Earth' | 'Water' | 'Air' | 'Fire'
export interface ElementalRelationship {
  timing: PatternTimingCode
  direction: VtgDirectionCode
}

export const relationshipElement = (
  relationship: ElementalRelationship | undefined,
): ElementName | undefined => {
  if (!relationship || relationship.timing === 'Q' || relationship.timing === 'X') return
  if (relationship.timing === 'T') return relationship.direction === 'S' ? 'Earth' : 'Air'
  return relationship.direction === 'S' ? 'Water' : 'Fire'
}
