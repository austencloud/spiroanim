import { describe, expect, it } from 'vitest'

import { resolveExportFileName, sanitizeExportFileName } from '@/utils/exportFileName'

describe('export file names', () => {
  it('allows common portable file-name characters and removes unsafe characters', () => {
    expect(sanitizeExportFileName('My Pattern_2 (Final)-é:<bad>?.mp4')).toBe(
      'My Pattern_2 (Final)-ébad.mp4',
    )
  })

  it('uses the default name when no legal characters remain', () => {
    expect(resolveExportFileName(':/?*')).toBe('SpiroAnim')
    expect(resolveExportFileName('CON')).toBe('SpiroAnim')
  })
})
