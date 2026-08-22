import { Box3, Mesh, MeshStandardMaterial, MeshToonMaterial } from 'three'
import { describe, expect, it } from 'vitest'

import { CLUBS, FANS, POI, STAFF } from '@/domain/animation/AnimModels'

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

  it.each([1, 2])('builds opaque Juggling Clubs with the Poi length at girth %s', (girth) => {
    const clubs = CLUBS(1, 4, girth)
    const poi = POI(1, 4, girth)

    expect(clubs.children).toHaveLength(4)
    expect(clubs.size).toBe(poi.size)
    for (const child of clubs.children) {
      if (!(child instanceof Mesh)) throw new Error('Expected every Club part to be a Mesh')
      expect(child.material).toBeInstanceOf(
        child === clubs.children[1] ? MeshStandardMaterial : MeshToonMaterial,
      )
      expect(child.material.transparent).toBe(false)
      expect(child.material.opacity).toBe(1)
    }

    const clubBounds = new Box3().setFromObject(clubs)
    const poiBounds = new Box3().setFromObject(poi)
    expect(clubBounds.min.y).toBeCloseTo(poiBounds.min.y)
    expect(clubBounds.max.y).toBeCloseTo(poiBounds.max.y)
  })

  it('identifies the Staff second head as an additional path endpoint', () => {
    expect(STAFF(1, 0, 1).additionalPathEndOffsets).toEqual([-1])
    expect(POI(1, 0, 1).additionalPathEndOffsets).toBeUndefined()
    expect(CLUBS(1, 0, 1).additionalPathEndOffsets).toBeUndefined()
    expect(FANS(1, 0, 1).additionalPathEndOffsets).toBeUndefined()
  })

  it('builds Fans with one ring, five spokes, five wicks, and two braces', () => {
    const fans = FANS(1, 4, 1)
    const bounds = new Box3().setFromObject(fans)

    expect(fans.children).toHaveLength(13)
    expect(fans.size).toBe(2.5)
    expect(bounds.min.y).toBeLessThan(0)
    expect(bounds.max.y).toBeCloseTo(2.5, 1)
  })
})
