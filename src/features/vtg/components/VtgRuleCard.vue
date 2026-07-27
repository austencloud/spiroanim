<template>
  <article
    class="vtg-rule-card"
    :class="[
      `vtg-rule-card--${props.orientation}`,
      `vtg-rule-card--${props.pattern}`,
      { 'vtg-rule-card--accent': props.accent },
    ]"
    :aria-label="`${props.labels.join(' ')} rule ${props.number}`"
    data-role="vtg-rule-card"
  >
    <span class="vtg-rule-card__title">
      <span v-for="label in props.labels" :key="label">{{ label }}</span>
    </span>

    <span class="vtg-rule-card__diagram" aria-hidden="true">
      <span class="vtg-rule-card__axis vtg-rule-card__axis--first" />
      <span class="vtg-rule-card__axis vtg-rule-card__axis--second" />
    </span>

    <strong class="vtg-rule-card__number">{{ props.number }}</strong>
  </article>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    labels: readonly [string, string]
    number: number
    orientation: 'vertical' | 'horizontal'
    pattern: 'split' | 'toggle'
    accent?: boolean
  }>(),
  {
    accent: false,
  },
)
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
  z-index: 2;
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
  z-index: 2;
  inset-inline-end: 0.55cqi;
  inset-block-end: 0.25cqi;
  font-size: max(1.3rem, 4cqi);
  font-weight: 900;
  line-height: 0.85;
}

.vtg-rule-card__diagram {
  position: absolute;
  inset: 7%;
  color: currentColor;
  opacity: 0.78;
}

.vtg-rule-card__diagram::before {
  position: absolute;
  content: '';
  background: currentColor;
  opacity: 0.65;
}

.vtg-rule-card__diagram::after,
.vtg-rule-card__axis::before,
.vtg-rule-card__axis::after {
  position: absolute;
  z-index: 1;
  width: max(0.42rem, 0.9cqi);
  aspect-ratio: 1;
  content: '';
  background: var(--vtg-color-line);
  border: max(1px, 0.12cqi) solid color-mix(in srgb, currentColor 58%, transparent);
  border-radius: 50%;
  box-shadow: 0 0 0 max(1px, 0.08cqi) color-mix(in srgb, currentColor 24%, transparent);
}

.vtg-rule-card--accent .vtg-rule-card__diagram::after,
.vtg-rule-card--accent .vtg-rule-card__axis::before,
.vtg-rule-card--accent .vtg-rule-card__axis::after {
  background: var(--vtg-color-ink);
  border-color: var(--vtg-color-secondary);
}

.vtg-rule-card__axis {
  position: absolute;
  display: block;
  background: currentColor;
}

.vtg-rule-card--vertical .vtg-rule-card__diagram::before {
  inset-inline: 0;
  inset-block-start: 50%;
  height: max(1px, 0.1cqi);
}

.vtg-rule-card--vertical .vtg-rule-card__axis {
  inset-block: 0;
  width: max(1px, 0.12cqi);
}

.vtg-rule-card--vertical .vtg-rule-card__axis::before,
.vtg-rule-card--vertical .vtg-rule-card__axis::after {
  inset-inline-start: 50%;
  transform: translateX(-50%);
}

.vtg-rule-card--vertical .vtg-rule-card__axis::before {
  inset-block-start: 0;
  transform: translate(-50%, -50%);
}

.vtg-rule-card--vertical .vtg-rule-card__axis::after {
  inset-block-end: 0;
  transform: translate(-50%, 50%);
}

.vtg-rule-card--vertical .vtg-rule-card__axis--first {
  inset-inline-start: 50%;
}

.vtg-rule-card--vertical.vtg-rule-card--toggle .vtg-rule-card__axis--first {
  inset-inline-start: 40%;
}

.vtg-rule-card--vertical .vtg-rule-card__axis--second {
  display: none;
  inset-inline-start: 60%;
}

.vtg-rule-card--vertical.vtg-rule-card--toggle .vtg-rule-card__axis--second {
  display: block;
}

.vtg-rule-card--horizontal .vtg-rule-card__diagram::before {
  inset-block: 0;
  inset-inline-start: 50%;
  width: max(1px, 0.1cqi);
}

.vtg-rule-card--horizontal .vtg-rule-card__axis {
  inset-inline: 0;
  height: max(1px, 0.12cqi);
}

.vtg-rule-card--horizontal .vtg-rule-card__axis::before,
.vtg-rule-card--horizontal .vtg-rule-card__axis::after {
  inset-block-start: 50%;
  transform: translateY(-50%);
}

.vtg-rule-card--horizontal .vtg-rule-card__axis::before {
  inset-inline-start: 0;
  transform: translate(-50%, -50%);
}

.vtg-rule-card--horizontal .vtg-rule-card__axis::after {
  inset-inline-end: 0;
  transform: translate(50%, -50%);
}

.vtg-rule-card--horizontal .vtg-rule-card__axis--first {
  inset-block-start: 50%;
}

.vtg-rule-card--horizontal.vtg-rule-card--toggle .vtg-rule-card__axis--first {
  inset-block-start: 40%;
}

.vtg-rule-card--horizontal .vtg-rule-card__axis--second {
  display: none;
  inset-block-start: 60%;
}

.vtg-rule-card--horizontal.vtg-rule-card--toggle .vtg-rule-card__axis--second {
  display: block;
}

.vtg-rule-card--split .vtg-rule-card__diagram::after {
  inset-block-start: 50%;
  inset-inline-start: 50%;
  transform: translate(-50%, -50%);
}

.vtg-rule-card--toggle .vtg-rule-card__diagram::after {
  display: none;
}
</style>
