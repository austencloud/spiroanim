<template>
  <section
    class="kinetic-alphabet-pane"
    aria-labelledby="kinetic-alphabet-title"
    data-role="tka-pane"
  >
    <div class="kinetic-alphabet-pane__card">
      <div class="kinetic-alphabet-pane__mark" aria-hidden="true">
        <span>T</span>
        <span>K</span>
        <span>A</span>
      </div>

      <div class="kinetic-alphabet-pane__copy">
        <span class="kinetic-alphabet-pane__eyebrow">Notation bridge</span>
        <h1 id="kinetic-alphabet-title">The Kinetic Alphabet</h1>
        <p class="kinetic-alphabet-pane__lede">
          TKA writes prop motion as letters. Every pattern in this app's concept catalogs
          corresponds to a TKA letter sequence.
        </p>
        <p class="kinetic-alphabet-pane__body">
          VTG patterns land in letters A–L, quarter patterns in M–V. Hands at opposite points is
          alpha, hands at the same point is beta, and a right angle between them is gamma.
        </p>
        <div class="kinetic-alphabet-pane__actions">
          <a
            v-if="composerUrl"
            class="kinetic-alphabet-pane__action kinetic-alphabet-pane__action--primary"
            :href="composerUrl"
            target="_blank"
            rel="noopener"
            data-role="tka-composer-link"
          >
            Open {{ cellLabel }} in Flow Arts Composer
          </a>
          <a
            class="kinetic-alphabet-pane__action"
            href="https://tkaflowarts.com/guide"
            target="_blank"
            rel="noopener"
            data-role="tka-guide-link"
          >
            About TKA
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  buildComposerUrl,
  type ComposerCell,
  type ComposerConcept,
} from '@/features/kinetic-alphabet/composerBridge'

const props = withDefaults(
  defineProps<{
    /** The catalog cell the concept panes recognized, or null when the animation matches none. */
    composerCell?: ComposerCell | null
  }>(),
  { composerCell: null },
)

/** The names the concept selector and the QTR control already use for these catalogs. */
const conceptLabels = {
  vtg: 'VTG',
  qtr: 'QTR',
  '8stp': 'Eight Step',
} as const satisfies Record<ComposerConcept, string>

const composerUrl = computed(() =>
  props.composerCell ? buildComposerUrl(props.composerCell) : undefined,
)

const cellLabel = computed(() => {
  const cell = props.composerCell
  return cell ? `${conceptLabels[cell.concept]} ${cell.reference}` : ''
})
</script>

<style scoped>
.kinetic-alphabet-pane {
  container-type: inline-size;
  display: grid;
  min-block-size: 12rem;
  padding: var(--space-4);
  color: var(--color-text);
  place-content: center;
}

.kinetic-alphabet-pane__card {
  box-sizing: border-box;
  display: grid;
  width: min(100%, 34rem);
  padding: clamp(var(--space-4), 5cqi, var(--space-8));
  background:
    radial-gradient(
      circle at 12% 18%,
      color-mix(in srgb, var(--color-action-primary) 16%, transparent),
      transparent 42%
    ),
    color-mix(in srgb, var(--color-action-primary) 6%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 32%, var(--color-border));
  border-radius: var(--radius-md);
  box-shadow: 0 0.75rem 1.75rem color-mix(in srgb, var(--color-action-primary) 12%, transparent);
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-4);
  align-items: center;
}

.kinetic-alphabet-pane__mark {
  display: grid;
  width: clamp(3.75rem, 16cqi, 5rem);
  aspect-ratio: 1;
  color: var(--color-on-action-primary);
  font-size: clamp(0.75rem, 3cqi, 1rem);
  font-weight: 800;
  background: var(--color-action-primary);
  border: 1px solid color-mix(in srgb, var(--color-on-action-primary) 32%, transparent);
  border-radius: 50%;
  box-shadow:
    0 0 0 0.3rem color-mix(in srgb, var(--color-action-primary) 12%, transparent),
    0 0.65rem 1.25rem color-mix(in srgb, var(--color-action-primary) 22%, transparent);
  grid-template-columns: repeat(3, 1fr);
  place-items: center;
}

.kinetic-alphabet-pane__copy {
  min-width: 0;
}

.kinetic-alphabet-pane h1,
.kinetic-alphabet-pane p {
  margin: 0;
}

.kinetic-alphabet-pane__eyebrow {
  display: block;
  margin-block-end: var(--space-1);
  color: var(--color-action-primary);
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.kinetic-alphabet-pane h1 {
  font-size: clamp(1.25rem, 5cqi, 1.75rem);
  line-height: 1.1;
  text-wrap: balance;
}

.kinetic-alphabet-pane__lede {
  margin-block-start: var(--space-2);
  color: var(--color-text-muted);
}

p.kinetic-alphabet-pane__body {
  margin-block-start: var(--space-3);
  color: var(--color-text);
  font-size: 0.8125rem;
}

.kinetic-alphabet-pane__actions {
  display: flex;
  margin-block-start: var(--space-4);
  gap: var(--space-2);
  flex-wrap: wrap;
}

.kinetic-alphabet-pane__action {
  padding: var(--space-2) var(--space-3);
  color: var(--color-text);
  font-size: 0.8125rem;
  font-weight: 700;
  text-decoration: none;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.kinetic-alphabet-pane__action--primary {
  color: var(--color-on-action-primary);
  background: var(--color-pattern-mode-active);
  border-color: var(--color-pattern-mode-active-border);
}

.kinetic-alphabet-pane__action:hover,
.kinetic-alphabet-pane__action:focus-visible {
  border-color: var(--color-action-primary);
}

.kinetic-alphabet-pane__action--primary:hover,
.kinetic-alphabet-pane__action--primary:focus-visible {
  background: var(--color-action-primary);
}

@container (width < 24rem) {
  .kinetic-alphabet-pane__card {
    grid-template-columns: 1fr;
    text-align: center;
    justify-items: center;
  }

  .kinetic-alphabet-pane__actions {
    justify-content: center;
  }
}
</style>
