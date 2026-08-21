import { Mesh, MeshStandardMaterial, MeshToonMaterial } from 'three'
import { describe, expect, it } from 'vitest'

import { POI, STAFF } from '@/domain/animation/AnimModels'

describe('AnimModels prop lighting', () => {
  it.each([
    ['POI', POI],
    ['Staff', STAFF],
  ] as const)('uses opaque light-reactive materials for every %s part', (_name, createModel) => {
    const model = createModel(1, 4, 1)

    expect(model.children).toHaveLength(3)
    const tether = model.children[0]
    if (!(tether instanceof Mesh) || !(tether.material instanceof MeshStandardMaterial))
      throw new Error('Expected the tether to use MeshStandardMaterial')
    expect(tether.material.transparent).toBe(false)
    expect(tether.material.opacity).toBe(1)
    expect(tether.material.emissiveIntensity).toBe(0.01)
    expect(tether.material.metalness).toBe(0.035)
    expect(tether.material.roughness).toBe(0.5)
    expect(tether.material.customProgramCacheKey()).toContain('propRim')

    for (const child of model.children.slice(1)) {
      expect(child).toBeInstanceOf(Mesh)
      if (!(child instanceof Mesh)) continue
      expect(child.material).toBeInstanceOf(MeshToonMaterial)
      if (!(child.material instanceof MeshToonMaterial)) continue
      expect(child.material.transparent).toBe(false)
      expect(child.material.opacity).toBe(1)
      expect(child.material.emissiveIntensity).toBe(0.015)
      expect(child.geometry.index).toBeNull()
      expect(child.material.customProgramCacheKey()).toContain('propRim')
    }
  })
})
