<template>
  <BaseTooltip :text="props.description" :disabled="props.tooltipDisabled">
    <template #activator="{ props: activatorProps }">
      <button
        v-bind="props.tooltipDisabled ? {} : activatorProps"
        type="button"
        class="vtg-rule-card"
        :class="[
          `vtg-rule-card--${props.orientation}`,
          {
            'vtg-rule-card--accent': props.accent,
            'vtg-rule-card--reversed': props.reversed,
          },
        ]"
        :aria-label="`${props.labels.join(' ')} rule ${props.number}`"
        :aria-pressed="props.accent"
        data-role="vtg-rule-card"
        @click="emit('select')"
      >
        <span class="vtg-rule-card__title">
          <span v-for="(label, index) in visibleLabels" :key="index">{{ label }}</span>
        </span>

        <span class="vtg-rule-card__diagram" aria-hidden="true">
          <span
            v-if="props.showDivider"
            class="vtg-rule-card__divider"
            :style="dividerStyle"
            data-role="vtg-divider"
          >
            <span class="vtg-rule-card__divider-line" />
            <span class="vtg-rule-card__divider-end vtg-rule-card__divider-end--start" />
            <span class="vtg-rule-card__divider-end vtg-rule-card__divider-end--end" />
          </span>

          <span
            v-for="(propPlacement, index) in visiblePropPlacements"
            :key="`prop-${index}`"
            class="vtg-rule-card__prop"
            :class="`vtg-rule-card__prop--${propOrientation(propPlacement)}`"
            :style="[propStyle(propPlacement), propColorStyle(index)]"
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
      </button>
    </template>
  </BaseTooltip>
</template>

<script setup lang="ts">
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import type { VtgPropPlacement, VtgRuleDiagram, VtgRuleNumber } from '@/features/vtg/types'

interface VtgPropPartColors {
  head: string
  handle: string
  tether: string
}

const props = withDefaults(
  defineProps<{
    labels: readonly [string, string]
    displayLabels?: readonly [string, string]
    number: VtgRuleNumber
    orientation: 'vertical' | 'horizontal'
    diagram: VtgRuleDiagram
    description: string
    accent?: boolean
    showDivider?: boolean
    showProps?: boolean
    propColors?: readonly VtgPropPartColors[]
    tooltipDisabled?: boolean
    reversed?: boolean
    mirrorProps?: boolean
  }>(),
  {
    accent: false,
    showDivider: true,
    showProps: true,
    tooltipDisabled: false,
    reversed: false,
    mirrorProps: true,
  },
)

const emit = defineEmits<{
  select: []
}>()

const visibleLabels = computed(() => props.displayLabels ?? props.labels)

const mirrorPlacement = (placement: VtgPropPlacement): VtgPropPlacement => {
  const placementOrientation = placement.orientation ?? props.orientation
  if (placementOrientation !== props.orientation) {
    return { ...placement, lane: 100 - placement.lane }
  }

  return {
    ...placement,
    start: 100 - placement.end,
    end: 100 - placement.start,
    largeEnd: placement.largeEnd === 'start' ? 'end' : 'start',
  }
}

const visiblePropPlacements = computed(() => {
  if (!props.showProps) return []
  if (!props.reversed || !props.mirrorProps) return props.diagram.props

  return props.diagram.props.map(mirrorPlacement)
})

const propOrientation = (propPlacement: VtgPropPlacement) =>
  propPlacement.orientation ?? props.orientation

const propStyle = (propPlacement: VtgPropPlacement): CSSProperties =>
  propOrientation(propPlacement) === 'vertical'
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

const propColorStyle = (index: number): CSSProperties => {
  const colors = props.propColors?.[index]
  if (!colors) return {}

  return {
    '--vtg-rule-prop-head-color': colors.head,
    '--vtg-rule-prop-handle-color': colors.handle,
    '--vtg-rule-prop-tether-color': colors.tether,
  }
}

const dividerStyle = computed<CSSProperties>(() => {
  const divider = props.diagram.divider ?? 50
  const position = props.reversed ? 100 - divider : divider

  return props.orientation === 'vertical'
    ? { insetBlockStart: `${position}%` }
    : { insetInlineStart: `${position}%` }
})
</script>

<style scoped>
.vtg-rule-card {
  appearance: none;
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  color: var(--vtg-color-rule-text);
  cursor: pointer;
  background: var(--vtg-color-rule);
  border: max(1px, 0.16cqi) dashed var(--vtg-color-line);
  border-radius: 0.7cqi;
  font-family: 'Arial Narrow', var(--font-family-sans);
  text-align: start;
}

.vtg-rule-card--accent {
  color: var(--vtg-color-ink);
  background: var(--vtg-color-secondary);
  border-color: var(--vtg-color-ink);
}

.vtg-rule-card__title {
  position: absolute;
  z-index: 3;
  inset-block-start: 0.5cqi;
  inset-inline-start: 0.6cqi;
  display: flex;
  flex-direction: column;
  font-size: max(0.62rem, 1.7cqi);
  font-weight: 800;
  letter-spacing: 0.045em;
  line-height: 0.98;
  text-rendering: geometricPrecision;
}

.vtg-rule-card__number {
  position: absolute;
  z-index: 3;
  inset-inline-end: 1.8cqi;
  inset-block-end: 1.5cqi;
  font-size: max(1.3rem, 4cqi);
  font-weight: 900;
  line-height: 0.88;
  text-rendering: geometricPrecision;
}

.vtg-rule-card--horizontal.vtg-rule-card--reversed .vtg-rule-card__title {
  inset-inline-start: auto;
  inset-inline-end: 0.6cqi;
  text-align: right;
}

.vtg-rule-card--vertical.vtg-rule-card--reversed .vtg-rule-card__title {
  inset-block-start: auto;
  inset-block-end: 0.5cqi;
  flex-direction: column-reverse;
  text-align: left;
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
  background: var(--vtg-rule-prop-tether-color, currentColor);
  opacity: 0.9;
}

.vtg-rule-card__prop--vertical {
  inline-size: var(--vtg-diagram-line-width);
  transform: translateX(-50%);
}

.vtg-rule-card__prop--horizontal {
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

.vtg-rule-card__prop--vertical .vtg-rule-card__prop-handle {
  inset-block-start: 0;
  inset-inline-start: 50%;
}

.vtg-rule-card__prop--vertical .vtg-rule-card__prop-handle--end {
  inset-block-start: 100%;
}

.vtg-rule-card__prop--horizontal .vtg-rule-card__prop-handle {
  inset-block-start: 50%;
  inset-inline-start: 0;
}

.vtg-rule-card__prop--horizontal .vtg-rule-card__prop-handle--end {
  inset-inline-start: 100%;
}

.vtg-rule-card__prop-handle--large {
  z-index: 2;
  width: max(0.42rem, 1cqi);
  background: var(--vtg-rule-prop-head-color, var(--vtg-color-line));
  border: max(1px, 0.12cqi) solid
    color-mix(in srgb, var(--vtg-rule-prop-head-color, currentColor) 64%, transparent);
  box-shadow: 0 0 0 max(1px, 0.06cqi)
    color-mix(in srgb, var(--vtg-rule-prop-head-color, currentColor) 20%, transparent);
}

.vtg-rule-card__prop-handle--small {
  width: max(2.5px, 0.36cqi);
  background: var(--vtg-rule-prop-handle-color, currentColor);
}

.vtg-rule-card--accent .vtg-rule-card__prop-handle--large {
  background: var(--vtg-rule-prop-head-color, var(--vtg-color-ink));
  border-color: var(--vtg-rule-prop-head-color, var(--vtg-color-secondary));
}

.vtg-rule-card--accent .vtg-rule-card__prop-handle--small {
  background: var(--vtg-rule-prop-handle-color, var(--vtg-color-ink));
}
</style>
