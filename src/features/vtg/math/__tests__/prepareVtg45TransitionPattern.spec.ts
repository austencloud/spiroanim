import { describe, expect, it } from 'vitest'

import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { prepareVtg45TransitionPattern } from '@/features/vtg/math/prepareVtg45TransitionPattern'

const createPattern = () => {
  const pattern = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
  if (!pattern) throw new Error('Expected a supported VTG pattern')
  return pattern
}

describe('prepareVtg45TransitionPattern', () => {
  it('duplicates an existing 45-degree pattern and reports it as supported', () => {
    const source = createPattern()
    const prepared = prepareVtg45TransitionPattern(source)

    expect(prepared.supported).toBe(true)
    expect(prepared.pattern).not.toBe(source)
    expect(prepared.pattern.props[0]).not.toBe(source.props[0])
    expect(prepared.pattern.props[0]?.anim[0]).not.toBe(source.props[0]?.anim[0])
  })

  it('accepts a continuation ARC inherited from the first frame', () => {
    const source = createPattern()
    source.props[1]!.anim[0]!.arc = 45
    delete source.props[1]!.anim[1]!.arc

    expect(prepareVtg45TransitionPattern(source).supported).toBe(true)
  })

  it('doubles an aligned 90-degree continuation before checking support', () => {
    const source = createPattern()
    source.bpm = 60
    source.props.forEach((prop) => {
      prop.anim = [{ ...prop.anim[0] }, { arc: 90, beats: 2 }, { arc: 90 }]
    })
    source.props[1]!.anim[0]!.arc = 90
    delete source.props[1]!.anim[1]!.arc

    const prepared = prepareVtg45TransitionPattern(source)

    expect(prepared.supported).toBe(true)
    expect(prepared.pattern.bpm).toBe(120)
    expect(prepared.pattern.props[0]?.anim).toHaveLength(5)
    expect(prepared.pattern.props[0]?.anim[1]?.arc).toBe(45)
    expect(source.props[0]?.anim).toHaveLength(3)
    expect(source.props[0]?.anim[1]?.arc).toBe(90)
  })

  it('rejects differing frame counts, beats, and continuation arcs', () => {
    const frameMismatch = createPattern()
    frameMismatch.props[1]?.anim.pop()
    expect(prepareVtg45TransitionPattern(frameMismatch).supported).toBe(false)

    const beatMismatch = createPattern()
    beatMismatch.props[1]!.anim[2]!.beats = 3
    expect(prepareVtg45TransitionPattern(beatMismatch).supported).toBe(false)

    const arcMismatch = createPattern()
    arcMismatch.props[1]!.anim[2]!.arc = 46
    expect(prepareVtg45TransitionPattern(arcMismatch).supported).toBe(false)
  })
})
