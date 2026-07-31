import type { VtgPatternLabel, VtgRelationshipCode, VtgRuleNumber } from '@/features/vtg/types'

export const vtgPatternLabelsByRow = {
  1: ['TS/TS', 'SO/SO', 'TS/TS', 'SO/SO', 'TS/SO', 'SO/TS'],
  2: ['TO/TO', 'SS/SS', 'TO/TO', 'SS/SS', 'TO/SS', 'SS/TO'],
  3: ['TS/TS', 'SO/SO', 'TS/TS', 'SO/SO', 'TS/SO', 'SO/TS'],
  4: ['TO/TO', 'SS/SS', 'TO/TO', 'SS/SS', 'TO/SS', 'SS/TO'],
  5: ['TS/TO', 'SO/SS', 'TS/TO', 'SO/SS', 'TS/SS', 'SO/TO'],
  6: ['TO/TS', 'SS/SO', 'TO/TS', 'SS/SO', 'TO/SO', 'SS/TS'],
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
