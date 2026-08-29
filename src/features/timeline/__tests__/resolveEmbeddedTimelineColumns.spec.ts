import { describe, expect, it } from 'vitest'

import {
  EMBEDDED_TIMELINE_COLUMNS,
  resolveEmbeddedTimelineColumns,
} from '@/features/timeline/resolveEmbeddedTimelineColumns'

describe('resolveEmbeddedTimelineColumns', () => {
  it('uses the compact column count only while the internal split is active', () => {
    expect(resolveEmbeddedTimelineColumns(true)).toBe(EMBEDDED_TIMELINE_COLUMNS)
    expect(resolveEmbeddedTimelineColumns(false)).toBeUndefined()
  })
})
