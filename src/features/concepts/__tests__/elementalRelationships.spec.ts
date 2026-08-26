import { describe, expect, it } from 'vitest'

import { relationshipElement } from '@/features/concepts/elementalRelationships'

describe('relationshipElement', () => {
  it.each([
    [{ timing: 'T', direction: 'S' }, 'Earth'],
    [{ timing: 'S', direction: 'S' }, 'Water'],
    [{ timing: 'T', direction: 'O' }, 'Air'],
    [{ timing: 'S', direction: 'O' }, 'Fire'],
  ] as const)('maps %o to %s', (relationship, expected) => {
    expect(relationshipElement(relationship)).toBe(expected)
  })

  it('does not map Quarter relationships or missing values to an element', () => {
    expect(relationshipElement({ timing: 'Q', direction: 'S' })).toBeUndefined()
    expect(relationshipElement(undefined)).toBeUndefined()
  })
})
