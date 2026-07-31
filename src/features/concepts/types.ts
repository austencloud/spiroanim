export const conceptKeys = ['vtg'] as const

export type ConceptKey = (typeof conceptKeys)[number]
