/**
 * Cell-identity bridge into the Flow Arts Composer.
 *
 * The Composer resolves a catalog cell from a five-field key:
 * `<concept>.<reference>.<ratio>.<shape>.<variant>`, all lowercase. `x` replaces the `:` in a
 * speed ratio because a colon is not safe in a path segment. Eight Step has no speed-ratio axis,
 * so its key always carries `1x1`. The Composer ignores dot-separated fields beyond the fifth,
 * which keeps older SpiroAnim builds working if the grammar ever grows.
 */

export type ComposerConcept = 'vtg' | 'qtr' | '8stp'

/** Speed ratios the Composer's transcription covers. Other ratios have no bridge entry. */
export type ComposerSpeedRatio = '1:1' | '1:3' | '1:5'

export interface ComposerCell {
  concept: ComposerConcept
  /** Catalog reference such as `1-1` or `1-AA`. Lowercased into the key. */
  reference: string
  /** Absent for Eight Step, which has no speed-ratio axis. */
  speedRatio?: ComposerSpeedRatio
  shape?: 'diamond' | 'box'
  isAnti?: boolean
}

const COMPOSER_ORIGIN = 'https://tkaflowarts.com'

export const composerSpeedRatios = [
  '1:1',
  '1:3',
  '1:5',
] as const satisfies readonly ComposerSpeedRatio[]

export const isComposerSpeedRatio = (value: string): value is ComposerSpeedRatio =>
  (composerSpeedRatios as readonly string[]).includes(value)

export const buildComposerUrl = (cell: ComposerCell): string => {
  const ratio = cell.concept === '8stp' ? '1x1' : (cell.speedRatio ?? '1:1').replace(':', 'x')
  const key = [
    cell.concept,
    cell.reference.toLowerCase(),
    ratio,
    cell.shape ?? 'diamond',
    cell.isAnti ? 'anti' : 'base',
  ].join('.')
  return `${COMPOSER_ORIGIN}/from/spiroanim/${key}`
}
