import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_BUILDER_COLUMNS,
  MAX_BUILDER_COLUMNS,
  MIN_BUILDER_COLUMNS,
  useBuilderSettingsStore,
} from '@/features/builder/stores/useBuilderSettingsStore'

describe('useBuilderSettingsStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('defaults to four columns and clamps adjustments from one through six', () => {
    const store = useBuilderSettingsStore()
    expect(store.columns).toBe(DEFAULT_BUILDER_COLUMNS)

    for (let index = 0; index < 10; index += 1) store.increaseColumns()
    expect(store.columns).toBe(MAX_BUILDER_COLUMNS)

    for (let index = 0; index < 10; index += 1) store.decreaseColumns()
    expect(store.columns).toBe(MIN_BUILDER_COLUMNS)
  })
})
