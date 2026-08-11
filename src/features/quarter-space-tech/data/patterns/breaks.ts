import type { QstCatalogPage } from '@/features/quarter-space-tech/types'

/**
 * Converted from the active QuarterSpace.tech library. Each definition stores native readable
 * animation frames; the UI derives its six-position diagrams from the compiled endpoints.
 */
export const qstBreaksPages = [
  {
    patterns: [
      {
        reference: 'breaks-1',
        caption: 'Part 1: Left Wheel Clock (Bottom Shuffle)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-2',
        caption: 'Part 1: Left Wheel Counter (Bottom Shuffle)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:   90, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-3',
        caption: 'Part 1: Left Wheel Clock (Top Shuffle)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-4',
        caption: 'Part 1: Left Wheel Counter (Top Shuffle)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:   90, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-5',
        caption: 'Part 1: Right Wheel Clock (Bottom Shuffle)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:   90, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-6',
        caption: 'Part 1: Right Wheel Counter (Bottom Shuffle)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane: -180, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane: -180, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-7',
        caption: 'Part 1: Right Wheel Clock (Top Shuffle)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:   90, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-8',
        caption: 'Part 1: Right Wheel Counter (Top Shuffle)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane: -180, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane: -180, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
        ],
      },
    ],
  },
  {
    patterns: [
      {
        reference: 'breaks-9',
        caption: 'Part 2: Left Wheel Opposite #1',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-10',
        caption: 'Part 2: Left Wheel Opposite #1 (Reversed)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-11',
        caption: 'Part 2: Left Wheel Opposite #2',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:   90, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-12',
        caption: 'Part 2: Left Wheel Opposite #2 (Reversed)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:   90, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-13',
        caption: 'Part 2: Right Wheel Opposite #1',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:   90, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane: -180, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-14',
        caption: 'Part 2: Right Wheel Opposite #1 (Reversed)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane: -180, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:   90, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-15',
        caption: 'Part 2: Right Wheel Opposite #2',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane: -180, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-16',
        caption: 'Part 2: Right Wheel Opposite #2 (Reversed)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane: -180, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
    ],
  },
  {
    patterns: [
      {
        reference: 'breaks-17',
        caption: 'Part 3: Bottom Horizontal Clock (Bottom Shuffle)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-18',
        caption: 'Part 3: Bottom Horizontal Counter (Bottom Shuffle)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane: -180, scale: 8, turns:    0 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane: -180, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-19',
        caption: 'Part 3: Bottom Horizontal Clock (*FRONT* Shuffle)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-20',
        caption: 'Part 3: Bottom Horizontal Counter (*FRONT* Shuffle)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane: -180, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane: -180, scale: 8, turns:    0 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-21',
        caption: 'Part 3: Top Horizontal Clock (Top Shuffle)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc: -180, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-22',
        caption: 'Part 3: Top Horizontal Counter (Top Shuffle)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane: -180, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc: -180, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane: -180, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-23',
        caption: 'Part 3: Top Horizontal Clock (*FRONT* Shuffle)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc: -180, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-24',
        caption: 'Part 3: Top Horizontal Counter (*FRONT* Shuffle)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc: -180, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane: -180, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane: -180, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
    ],
  },
  {
    patterns: [
      {
        reference: 'breaks-25',
        caption: 'Part 4: Bottom Horizontal Opposite #1 (Left)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane: -180, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-26',
        caption: 'Part 4: Bottom Horizontal Opposite #1 (Right)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane: -180, scale: 8, turns:    0 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-27',
        caption: 'Part 4: Bottom Horizontal Opposite #2** (Left)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane: -180, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-28',
        caption: 'Part 4: Bottom Horizontal Opposite #2** (Right)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane: -180, scale: 8, turns:    0 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-29',
        caption: 'Part 4: Top Horizontal Opposite #1 (Left)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc: -180, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-30',
        caption: 'Part 4: Top Horizontal Opposite #1 (Right)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane: -180, scale: 8, turns:    0 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc: -180, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane: -180, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-31',
        caption: 'Part 4: Top Horizontal Opposite #2** (Left)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc: -180, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-32',
        caption: 'Part 4: Top Horizontal Opposite #2** (Right)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc: -180, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane: -180, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane: -180, scale: 8, turns:    0 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
    ],
  },
  {
    patterns: [
      {
        reference: 'breaks-33',
        caption: 'Part 5: Wheel Mirror #1 (Right Leading)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-34',
        caption: 'Part 5: Wheel Mirror #1 (Left Leading)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane: -180, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane: -180, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-35',
        caption: 'Part 5: Wheel Mirror #2 (Right Leading)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:   90, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-36',
        caption: 'Part 5: Wheel Mirror #2 (Left Leading)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:   90, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-37',
        caption: 'Part 5: Horizontal Mirror #1 (Right Leading)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-38',
        caption: 'Part 5: Horizontal Mirror #1 (Left Leading)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane: -180, scale: 8, turns:    0 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane: -180, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-39',
        caption: 'Part 5: Horizontal Mirror #2** (Left Leading)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-40',
        caption: 'Part 5: Horizontal Mirror #2** (Right Leading)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane: -180, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane: -180, scale: 8, turns:    0 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
    ],
  },
  {
    patterns: [
      {
        reference: 'breaks-41',
        caption: 'Part 6: Opposite Wheel Mirror #1',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-42',
        caption: 'Part 6: Opposite Wheel Mirror #1 (Reversed)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-43',
        caption: 'Part 6: Opposite Wheel Mirror #2',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:   90, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-44',
        caption: 'Part 6: Opposite Wheel Mirror #2 (Reversed)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:   90, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-45',
        caption: 'Part 6: Opposite Horizontal Mirror #2 (Right)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane: -180, scale: 8, turns:    0 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-46',
        caption: 'Part 6: Opposite Horizontal Mirror #1 (Left)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane: -180, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-47',
        caption: 'Part 6: Opposite Horizontal Mirror #1 (Right)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane: -180, scale: 8, turns:    0 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-48',
        caption: 'Part 6: Opposite Horizontal Mirror #2 (Left)',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane: -180, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
        ],
      },
    ],
  },
  {
    patterns: [
      {
        reference: 'breaks-49',
        caption: 'Part 7: Followfly - Right Native',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane: -180, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane: -180, scale: 8, turns:    0 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-50',
        caption: 'Part 7: Followfly - Right Non-Native',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-51',
        caption: 'Part 7: Followfly - Right Front Native',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:   90, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-52',
        caption: 'Part 7: Followfly - Right Front Non-native',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:   90, scale: 8, turns:    0 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-53',
        caption: 'Part 7: Followfly - Left Native',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:    0, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-54',
        caption: 'Part 7: Followfly - Left Non-Native',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane: -180, scale: 8, turns:    0 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane: -180, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-55',
        caption: 'Part 7: Followfly - Left Front Native',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:   90, scale: 8, turns:    0 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
            ],
          },
        ],
      },
      {
        reference: 'breaks-56',
        caption: 'Part 7: Followfly - Left Front Non-Native',
        props: [
          {
            // prettier-ignore
            anim: [
              { arc:   90, plane:   90, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
          {
            // prettier-ignore
            anim: [
              { arc:    0, plane:    0, scale: 8, turns:    0 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
              { arc:   90, plane:   90, turns: -360 },
              { arc:   90, plane:  -90, turns: -360 },
            ],
          },
        ],
      },
    ],
  },
] as const satisfies readonly QstCatalogPage[]
