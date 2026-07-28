import type { PropReadable, RootDataFinal, RootReadable } from '@/types/AnimTypes'

export type VtgReadableAnimation = Partial<
  Omit<RootReadable, 'props'> & Pick<RootDataFinal, 'speed' | 'type' | 'turns' | 'depth'>
> & {
  props: PropReadable[]
}

/**
 * Decoded from the v1 query:
 * ?r=Ew09APi99&p0=N--.mD------u.bn-...&p1=S--.05ExM---u.bn-s8...bn-&v=1
 */
export const vtgAnimationPreset = {
  speed: 1,
  type: 0,
  turns: 0,
  depth: 0,
  bpm: 120,
  color: 'Green',
  prop: 'POI',
  guides: false,
  anchors: false,
  nodes: false,
  paths: true,
  hands: false,
  visible: true,
  aspectx: 1,
  aspecty: 1,
  distance: 22,
  thick: 4,
  props: [
    {
      color: 'Green',
      anim: [{ arc: 180, scale: 10 }, { arc: 90 }, {}, {}, {}],
    },
    {
      color: 'Orange',
      anim: [{ plane: 180, arc: 0, turns: 180, scale: 10 }, { arc: 90, turns: -180 }, {}, {}, {}],
    },
  ],
} satisfies VtgReadableAnimation

/*
Okay so the idea here, is that each of the XX/XX buttons is going to send a pattern to the player and render.
vtgAnimationPreset that you exported (I made some manual updates btw) is a template for us to base this off of.
We shouldn't duplicate things all over the place and it should be modular.
The first item in props.anim defines the starting position, and what is contained currently will always apply to the first row.
The second item in props.anim is going to define the rest of the animation for the first row.
I'm not sure how the remaining rows will look, but that will get ironed out as we progress.
The radio field you just created is going to modify how the second item of props.anim works, we'll iron that as we go as well.
The settings that we exported above apply to SO/TS, which is the first cell, or column 2 / row 1.

Go ahead and setup the code base, and we'll continue working through these.
*/
