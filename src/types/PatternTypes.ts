export const patternShapes = ['diamond', 'box'] as const
export type PatternShape = (typeof patternShapes)[number]
