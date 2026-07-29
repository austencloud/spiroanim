import type { VtgPatternLabel, VtgRelationshipCode, VtgRuleNumber } from '@/features/vtg/types'

export const vtgPatternLabelsByRow = {
  6: ['SO/TS', 'SS/TO', 'SO/TS', 'SS/TO', 'SO/TO', 'SS/TS'],
  5: ['TS/SO', 'TO/SS', 'TS/SO', 'TO/SS', 'TS/SS', 'TO/SO'],
  4: ['SO/SO', 'SS/SS', 'SO/SO', 'SS/SS', 'SO/SS', 'SS/SO'],
  3: ['TS/TS', 'TO/TO', 'TS/TS', 'TO/TO', 'TS/TO', 'TO/TS'],
  2: ['SO/SO', 'SS/SS', 'SO/SO', 'SS/SS', 'SO/SS', 'SS/SO'],
  1: ['TS/TS', 'TO/TO', 'TS/TS', 'TO/TO', 'TS/TO', 'TO/TS'],
} as const satisfies Readonly<Record<VtgRuleNumber, readonly VtgPatternLabel[]>>

const relationshipDescriptions = {
  // The meaning of S depends on its position: Split first, Same second.
  SO: 'Split / Opposite',
  SS: 'Split / Same',
  TO: 'Together / Opposite',
  TS: 'Together / Same',
} as const satisfies Readonly<Record<VtgRelationshipCode, string>>

const describeRelationship = (value: string) => {
  if (value === 'SO' || value === 'SS' || value === 'TO' || value === 'TS') {
    return relationshipDescriptions[value]
  }

  throw new Error(`Invalid VTG relationship code: ${value}`)
}

export const describeVtgPatternLabel = (label: VtgPatternLabel) => {
  const [hands = '', props = ''] = label.split('/')
  return `Hands: ${describeRelationship(hands)}\nProps: ${describeRelationship(props)}`
}
