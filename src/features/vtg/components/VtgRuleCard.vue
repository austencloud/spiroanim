<template>
  <article
    class="vtg-rule-card"
    :class="[`vtg-rule-card--${props.orientation}`, { 'vtg-rule-card--accent': props.accent }]"
    :aria-label="`${props.labels.join(' ')} rule ${props.number}`"
    data-role="vtg-rule-card"
  >
    <span class="vtg-rule-card__title">
      <span v-for="label in props.labels" :key="label">{{ label }}</span>
    </span>

    <span class="vtg-rule-card__diagram" aria-hidden="true">
      <span class="vtg-rule-card__divider" data-role="vtg-divider">
        <span class="vtg-rule-card__divider-line" />
        <span class="vtg-rule-card__divider-end vtg-rule-card__divider-end--start" />
        <span class="vtg-rule-card__divider-end vtg-rule-card__divider-end--end" />
      </span>

      <span
        v-for="(propPlacement, index) in props.diagram.props"
        :key="`prop-${index}`"
        class="vtg-rule-card__prop"
        :style="propStyle(propPlacement)"
        data-role="vtg-prop"
      >
        <span class="vtg-rule-card__prop-line" />
        <span
          class="vtg-rule-card__prop-handle"
          :class="
            propPlacement.largeEnd === 'start'
              ? 'vtg-rule-card__prop-handle--large'
              : 'vtg-rule-card__prop-handle--small'
          "
          data-role="vtg-prop-start"
        />
        <span
          class="vtg-rule-card__prop-handle vtg-rule-card__prop-handle--end"
          :class="
            propPlacement.largeEnd === 'end'
              ? 'vtg-rule-card__prop-handle--large'
              : 'vtg-rule-card__prop-handle--small'
          "
          data-role="vtg-prop-end"
        />
      </span>
    </span>

    <strong class="vtg-rule-card__number">{{ props.number }}</strong>
  </article>
</template>

<script setup lang="ts">
import type { VtgPropPlacement, VtgRuleDiagram } from '@/features/vtg/types'

const props = withDefaults(
  defineProps<{
    labels: readonly [string, string]
    number: number
    orientation: 'vertical' | 'horizontal'
    diagram: VtgRuleDiagram
    accent?: boolean
  }>(),
  {
    accent: false,
  },
)

const propStyle = (propPlacement: VtgPropPlacement): CSSProperties =>
  props.orientation === 'vertical'
    ? {
        insetBlockStart: `${propPlacement.start}%`,
        insetInlineStart: `${propPlacement.lane}%`,
        blockSize: `${propPlacement.end - propPlacement.start}%`,
      }
    : {
        insetBlockStart: `${propPlacement.lane}%`,
        insetInlineStart: `${propPlacement.start}%`,
        inlineSize: `${propPlacement.end - propPlacement.start}%`,
      }
</script>

<style scoped>
.vtg-rule-card {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  color: var(--vtg-color-rule-text);
  background: var(--vtg-color-rule);
  border: max(1px, 0.16cqi) dashed var(--vtg-color-line);
  border-radius: 0.7cqi;
  font-family: 'Arial Narrow', var(--font-family-sans);
}

.vtg-rule-card--accent {
  color: var(--vtg-color-ink);
  background: var(--vtg-color-secondary);
  border-color: var(--vtg-color-ink);
}

.vtg-rule-card__title {
  position: absolute;
  z-index: 3;
  inset-block-start: 0.45cqi;
  inset-inline-start: 0.55cqi;
  display: flex;
  flex-direction: column;
  font-size: max(0.62rem, 1.65cqi);
  font-weight: 900;
  letter-spacing: 0.025em;
  line-height: 0.95;
}

.vtg-rule-card__number {
  position: absolute;
  z-index: 3;
  inset-inline-end: 0.55cqi;
  inset-block-end: 0.25cqi;
  font-size: max(1.3rem, 4cqi);
  font-weight: 900;
  line-height: 0.85;
}

.vtg-rule-card__diagram {
  --vtg-diagram-line-width: max(1px, 0.12cqi);

  position: absolute;
  inset: 7%;
  color: currentColor;
}

.vtg-rule-card__divider,
.vtg-rule-card__prop {
  position: absolute;
}

.vtg-rule-card__divider {
  z-index: 0;
}

.vtg-rule-card__divider-line {
  position: absolute;
  display: block;
  opacity: 0.72;
}

.vtg-rule-card--vertical .vtg-rule-card__divider {
  inset-block-start: 50%;
  inset-inline: 0;
  block-size: var(--vtg-diagram-line-width);
  transform: translateY(-50%);
}

.vtg-rule-card--vertical .vtg-rule-card__divider-line {
  inset-block-start: 50%;
  inset-inline: 0;
  border-block-start: var(--vtg-diagram-line-width) dashed currentColor;
  transform: translateY(-50%);
}

.vtg-rule-card--horizontal .vtg-rule-card__divider {
  inset-block: 0;
  inset-inline-start: 50%;
  inline-size: var(--vtg-diagram-line-width);
  transform: translateX(-50%);
}

.vtg-rule-card--horizontal .vtg-rule-card__divider-line {
  inset-block: 0;
  inset-inline-start: 50%;
  border-inline-start: var(--vtg-diagram-line-width) dashed currentColor;
  transform: translateX(-50%);
}

.vtg-rule-card__divider-end {
  position: absolute;
  z-index: 1;
  width: max(2px, 0.3cqi);
  aspect-ratio: 1;
  background: currentColor;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.vtg-rule-card--vertical .vtg-rule-card__divider-end {
  inset-block-start: 50%;
}

.vtg-rule-card--vertical .vtg-rule-card__divider-end--start {
  inset-inline-start: 0;
}

.vtg-rule-card--vertical .vtg-rule-card__divider-end--end {
  inset-inline-start: 100%;
}

.vtg-rule-card--horizontal .vtg-rule-card__divider-end {
  inset-inline-start: 50%;
}

.vtg-rule-card--horizontal .vtg-rule-card__divider-end--start {
  inset-block-start: 0;
}

.vtg-rule-card--horizontal .vtg-rule-card__divider-end--end {
  inset-block-start: 100%;
}

.vtg-rule-card__prop {
  z-index: 1;
}

.vtg-rule-card__prop-line {
  position: absolute;
  inset: 0;
  display: block;
  background: currentColor;
  opacity: 0.9;
}

.vtg-rule-card--vertical .vtg-rule-card__prop {
  inline-size: var(--vtg-diagram-line-width);
  transform: translateX(-50%);
}

.vtg-rule-card--horizontal .vtg-rule-card__prop {
  block-size: var(--vtg-diagram-line-width);
  transform: translateY(-50%);
}

.vtg-rule-card__prop-handle {
  position: absolute;
  z-index: 1;
  aspect-ratio: 1;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.vtg-rule-card--vertical .vtg-rule-card__prop-handle {
  inset-block-start: 0;
  inset-inline-start: 50%;
}

.vtg-rule-card--vertical .vtg-rule-card__prop-handle--end {
  inset-block-start: 100%;
}

.vtg-rule-card--horizontal .vtg-rule-card__prop-handle {
  inset-block-start: 50%;
  inset-inline-start: 0;
}

.vtg-rule-card--horizontal .vtg-rule-card__prop-handle--end {
  inset-inline-start: 100%;
}

.vtg-rule-card__prop-handle--large {
  z-index: 2;
  width: max(0.42rem, 1cqi);
  background: var(--vtg-color-line);
  border: max(1px, 0.12cqi) solid color-mix(in srgb, currentColor 64%, transparent);
  box-shadow: 0 0 0 max(1px, 0.06cqi) color-mix(in srgb, currentColor 20%, transparent);
}

.vtg-rule-card__prop-handle--small {
  width: max(2px, 0.32cqi);
  background: currentColor;
}

.vtg-rule-card--accent .vtg-rule-card__prop-handle--large {
  background: var(--vtg-color-ink);
  border-color: var(--vtg-color-secondary);
}

.vtg-rule-card--accent .vtg-rule-card__prop-handle--small {
  background: var(--vtg-color-ink);
}
</style>
