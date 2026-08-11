<template>
  <div class="qst-position-tile" :aria-label="ariaLabel" data-role="qst-position-tile">
    <span
      v-for="position in visiblePositions"
      :key="position"
      class="qst-position-tile__cell"
      :class="`qst-position-tile__cell--${cellPosition(position)}`"
    />

    <span
      v-if="description.sharedFill"
      class="qst-position-tile__marker qst-position-tile__marker--shared"
      :class="[
        `qst-position-tile__marker--${cellPosition(description.current[0])}`,
        `qst-position-tile__marker--fill-${description.sharedFill}`,
        { 'qst-position-tile__marker--back': description.current[0] === 'back' },
      ]"
    >
      <span class="qst-position-tile__shared-fill qst-position-tile__shared-fill--prop-1" />
      <span class="qst-position-tile__shared-fill qst-position-tile__shared-fill--prop-2" />
    </span>
    <template v-else>
      <span
        v-for="(position, index) in description.current"
        :key="`${position}-${index}`"
        class="qst-position-tile__marker"
        :class="[
          `qst-position-tile__marker--${cellPosition(position)}`,
          `qst-position-tile__marker--prop-${index + 1}`,
          {
            'qst-position-tile__marker--back': position === 'back',
            'qst-position-tile__marker--overlap':
              cellPosition(description.current[0]) === cellPosition(description.current[1]),
          },
        ]"
      />
    </template>

    <span class="qst-position-tile__transition" aria-hidden="true">{{ tile.transition }}</span>
  </div>
</template>

<script setup lang="ts">
import { describeQstTile } from '@/features/quarter-space-tech/math/describeQstTile'
import type { QstPosition, QstSequenceTile } from '@/features/quarter-space-tech/types'

const props = defineProps<{
  tile: QstSequenceTile
}>()

const visiblePositions = ['top', 'left', 'front', 'right', 'bottom'] as const
const description = computed(() =>
  describeQstTile(props.tile.current, props.tile.next, props.tile.transition),
)
const cellPosition = (position: QstPosition) => (position === 'back' ? 'front' : position)
const ariaLabel = computed(
  () =>
    `${props.tile.current[0]} and ${props.tile.current[1]}, transition ${props.tile.transition}`,
)
</script>

<style scoped>
.qst-position-tile {
  position: relative;
  display: grid;
  width: var(--qst-tile-size, 4.25rem);
  aspect-ratio: 1;
  padding: 0.125rem;
  flex: 0 0 auto;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(3, minmax(0, 1fr));
  gap: 0.125rem;
}

.qst-position-tile__cell,
.qst-position-tile__marker {
  position: relative;
  min-width: 0;
  min-height: 0;
}

.qst-position-tile__cell {
  background: color-mix(in srgb, var(--color-surface) 84%, transparent);
  border: 1px solid var(--color-border);
}

.qst-position-tile__cell--top,
.qst-position-tile__marker--top {
  grid-area: 1 / 2;
}

.qst-position-tile__cell--left,
.qst-position-tile__marker--left {
  grid-area: 2 / 1;
}

.qst-position-tile__cell--front,
.qst-position-tile__marker--front {
  grid-area: 2 / 2;
}

.qst-position-tile__cell--right,
.qst-position-tile__marker--right {
  grid-area: 2 / 3;
}

.qst-position-tile__cell--bottom,
.qst-position-tile__marker--bottom {
  grid-area: 3 / 2;
}

.qst-position-tile__marker {
  z-index: 1;
  border: 1px solid var(--color-border);
  border-radius: 0;
  box-shadow: 0 0.08rem 0.18rem color-mix(in srgb, var(--color-text) 22%, transparent);
}

.qst-position-tile__marker--prop-1 {
  background: var(--qst-prop-first);
}

.qst-position-tile__marker--prop-2 {
  background: var(--qst-prop-second);
}

.qst-position-tile__marker--overlap.qst-position-tile__marker--prop-1 {
  transform: scale(0.78);
}

.qst-position-tile__marker--overlap.qst-position-tile__marker--prop-2 {
  transform: scale(0.52);
}

.qst-position-tile__marker--back::after {
  position: absolute;
  z-index: 2;
  inset: 27%;
  content: '';
  background: var(--color-surface);
  border: 1px solid color-mix(in srgb, var(--color-text) 35%, transparent);
  border-radius: 20%;
}

.qst-position-tile__marker--shared {
  --qst-shared-first-clip: polygon(0 0, 50% 0, 50% 100%, 0 100%);
  --qst-shared-second-clip: polygon(50% 0, 100% 0, 100% 100%, 50% 100%);

  overflow: hidden;
  background: var(--color-border);
}

.qst-position-tile__shared-fill {
  position: absolute;
  inset: 0;
}

.qst-position-tile__shared-fill--prop-1 {
  background: var(--qst-prop-first);
  clip-path: var(--qst-shared-first-clip);
}

.qst-position-tile__shared-fill--prop-2 {
  background: var(--qst-prop-second);
  clip-path: var(--qst-shared-second-clip);
}

.qst-position-tile__marker--fill-second-left {
  --qst-shared-first-clip: polygon(50% 0, 100% 0, 100% 100%, 50% 100%);
  --qst-shared-second-clip: polygon(0 0, 50% 0, 50% 100%, 0 100%);
}

.qst-position-tile__marker--fill-first-top {
  --qst-shared-first-clip: polygon(0 0, 100% 0, 100% 50%, 0 50%);
  --qst-shared-second-clip: polygon(0 50%, 100% 50%, 100% 100%, 0 100%);
}

.qst-position-tile__marker--fill-second-top {
  --qst-shared-first-clip: polygon(0 50%, 100% 50%, 100% 100%, 0 100%);
  --qst-shared-second-clip: polygon(0 0, 100% 0, 100% 50%, 0 50%);
}

.qst-position-tile__marker--fill-first-top-left {
  --qst-shared-first-clip: polygon(0 0, 100% 0, 0 100%);
  --qst-shared-second-clip: polygon(100% 0, 100% 100%, 0 100%);
}

.qst-position-tile__marker--fill-first-bottom-left {
  --qst-shared-first-clip: polygon(0 0, 100% 100%, 0 100%);
  --qst-shared-second-clip: polygon(0 0, 100% 0, 100% 100%);
}

.qst-position-tile__marker--fill-second-top-left {
  --qst-shared-first-clip: polygon(100% 0, 100% 100%, 0 100%);
  --qst-shared-second-clip: polygon(0 0, 100% 0, 0 100%);
}

.qst-position-tile__marker--fill-second-bottom-left {
  --qst-shared-first-clip: polygon(0 0, 100% 0, 100% 100%);
  --qst-shared-second-clip: polygon(0 0, 100% 100%, 0 100%);
}

.qst-position-tile__transition {
  position: absolute;
  z-index: 2;
  inset-inline-end: 0;
  inset-block-end: 0;
  min-inline-size: 1.35rem;
  padding: 0.05rem 0.18rem;
  color: var(--color-text);
  font-size: 0.58rem;
  font-weight: 800;
  line-height: 1.2;
  text-align: center;
  background: color-mix(in srgb, var(--color-surface) 94%, transparent);
  border: 1px solid var(--color-border);
  border-radius: 999px;
}
</style>
