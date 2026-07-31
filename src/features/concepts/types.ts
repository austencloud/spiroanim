export const conceptKeys = ['vtg', 'qst'] as const

export type ConceptKey = (typeof conceptKeys)[number]
