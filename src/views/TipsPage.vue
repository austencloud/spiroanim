<template>
  <main class="tips-page">
    <header class="tips-nav">
      <RouterLink class="back-link" to="/app">
        <BaseIcon :path="mdiArrowLeft" :size="20" />
        Back to SpiroAnim
      </RouterLink>
      <span class="wordmark">SpiroAnim / Tips</span>
    </header>

    <article class="tips-shell">
      <header class="hero">
        <p class="kicker">Quick reference</p>
        <h1>Move faster.<br /><span>Stay in flow.</span></h1>
        <p class="hero-copy">
          Keyboard shortcuts and timeline gestures for navigating, playing, and selecting animation
          frames.
        </p>
      </header>

      <div class="tip-grid">
        <section class="tip-card shortcut-card" aria-labelledby="playback-title">
          <div class="card-number" aria-hidden="true">01</div>
          <div>
            <p class="card-kicker">Playback</p>
            <h2 id="playback-title">Control the animation</h2>
            <dl class="shortcut-list">
              <div>
                <dt><kbd>Space</kbd></dt>
                <dd>Play or pause the animation.</dd>
              </div>
              <div>
                <dt><kbd>←</kbd></dt>
                <dd>
                  Move to the previous frame. At a selection's start, grow the selection left.
                </dd>
              </div>
              <div>
                <dt><kbd>→</kbd></dt>
                <dd>Move to the next frame. At a selection's end, grow the selection right.</dd>
              </div>
            </dl>
            <p class="fine-print">
              App shortcuts pause while you are typing in a field or using another interactive
              control.
            </p>
          </div>
        </section>

        <section class="tip-card timeline-card" aria-labelledby="timeline-title">
          <div class="card-number" aria-hidden="true">02</div>
          <div>
            <p class="card-kicker">Timeline</p>
            <h2 id="timeline-title">Shape a selection</h2>
            <div class="gesture-list">
              <div class="gesture">
                <span class="gesture-mark">Click</span>
                <p>Move to a thumbnail. In selection mode, this starts a fresh frame selection.</p>
              </div>
              <div class="gesture gesture--featured">
                <span class="gesture-mark"><kbd>Shift</kbd> + Click</span>
                <p>
                  Turn on selection mode when needed and select from the current frame to the
                  clicked frame. Shift-click later to grow or shrink the range; the ending frame
                  remains fully included.
                </p>
              </div>
              <div class="gesture">
                <span class="gesture-mark">Double-click</span>
                <p>
                  Toggle selection mode on or off. When enabled, the clicked frame and the following
                  frame become the initial selection.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <aside class="remember-note">
        <span aria-hidden="true">✦</span>
        <p>
          <strong>Remember:</strong> Shift is the fast path from browsing frames to shaping a range.
        </p>
      </aside>
    </article>

    <footer>Render the Flow.</footer>
  </main>
</template>

<script setup lang="ts">
import { mdiArrowLeft } from '@mdi/js'
import { RouterLink } from 'vue-router'

import BaseIcon from '@/components/icons/BaseIcon.vue'
</script>

<style scoped>
.tips-page {
  position: fixed;
  inset: 0;
  min-height: 100%;
  padding-block-start: max(var(--space-6), var(--safe-area-inset-top));
  padding-inline-end: max(var(--space-6), var(--safe-area-inset-right));
  padding-block-end: max(var(--space-6), var(--safe-area-inset-bottom));
  padding-inline-start: max(var(--space-6), var(--safe-area-inset-left));
  overflow-y: auto;
  color: var(--color-text);
  background:
    radial-gradient(
      circle at 78% 12%,
      color-mix(in srgb, var(--color-action-primary) 18%, transparent),
      transparent 26rem
    ),
    linear-gradient(
      115deg,
      transparent 0 64%,
      color-mix(in srgb, var(--color-workspace-boundary) 12%, transparent) 64% 64.2%,
      transparent 64.2%
    ),
    var(--color-canvas);
  scrollbar-gutter: stable;
}

.tips-nav,
.tips-shell,
footer {
  width: min(100%, 76rem);
  margin-inline: auto;
}

.tips-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  color: var(--color-text);
  font-weight: 750;
  text-decoration: none;
  border: 1px solid var(--color-border);
  border-radius: calc(var(--radius-md) * 4);
}

.back-link:hover,
.back-link:focus-visible {
  color: var(--color-action-primary);
  border-color: var(--color-action-primary);
}

.back-link:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--color-action-primary) 45%, var(--color-text));
  outline-offset: 3px;
}

.wordmark,
.card-kicker,
.kicker,
footer {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.wordmark {
  color: var(--color-text-muted);
}

.tips-shell {
  padding-block: clamp(3.5rem, 9vh, 7rem);
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(17rem, 0.55fr);
  column-gap: clamp(var(--space-8), 8vw, 7rem);
  align-items: end;
  margin-block-end: clamp(3rem, 7vw, 6rem);
}

.kicker {
  grid-column: 1 / -1;
  margin: 0 0 var(--space-4);
  color: var(--color-action-primary);
}

h1 {
  margin: 0;
  font-size: clamp(3.25rem, 7vw, 6.5rem);
  line-height: 0.86;
  letter-spacing: -0.07em;
}

h1 span {
  color: var(--color-action-primary);
}

.hero-copy {
  margin: 0;
  color: var(--color-text-muted);
  font-size: clamp(1.05rem, 2vw, 1.3rem);
  line-height: 1.7;
}

.tip-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-6);
}

.tip-card {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-6);
  padding: clamp(var(--space-6), 4vw, 2.5rem);
  overflow: hidden;
  background: color-mix(in srgb, var(--color-surface) 91%, transparent);
  border: 1px solid var(--color-border);
  border-radius: calc(var(--radius-md) * 1.5);
  box-shadow: 0.8rem 0.8rem 0 color-mix(in srgb, var(--color-workspace-boundary) 13%, transparent);
  backdrop-filter: blur(0.75rem);
}

.card-number {
  color: var(--color-action-primary);
  font-size: 0.72rem;
  font-weight: 900;
}

.card-kicker {
  margin: 0 0 var(--space-2);
  color: var(--color-text-muted);
}

h2 {
  margin: 0 0 var(--space-6);
  font-size: clamp(1.35rem, 2.5vw, 2rem);
  letter-spacing: -0.035em;
}

.shortcut-list {
  display: grid;
  gap: var(--space-3);
  margin: 0;
}

.shortcut-list > div {
  display: grid;
  grid-template-columns: minmax(7rem, 0.4fr) 1fr;
  gap: var(--space-4);
  align-items: center;
  padding-block: var(--space-3);
  border-block-end: 1px solid color-mix(in srgb, var(--color-border) 55%, transparent);
}

dt,
dd {
  margin: 0;
}

dd,
.gesture p,
.fine-print {
  color: var(--color-text-muted);
  line-height: 1.55;
}

kbd,
.gesture-mark {
  display: inline-flex;
  min-width: 2rem;
  min-height: 2rem;
  align-items: center;
  justify-content: center;
  padding-inline: var(--space-2);
  color: var(--color-text);
  font: 800 0.82rem/1 var(--font-family-sans);
  white-space: nowrap;
  background: var(--color-canvas);
  border: 1px solid var(--color-border);
  border-block-end-width: 3px;
  border-radius: var(--radius-sm);
}

.fine-print {
  margin: var(--space-4) 0 0;
  font-size: 0.85rem;
}

.gesture-list {
  display: grid;
  gap: var(--space-4);
}

.gesture {
  padding: var(--space-4);
  border-inline-start: 2px solid var(--color-border);
}

.gesture--featured {
  background: color-mix(in srgb, var(--color-action-primary) 9%, transparent);
  border-inline-start-color: var(--color-action-primary);
}

.gesture-mark {
  margin-block-end: var(--space-3);
}

.gesture-mark kbd {
  min-width: auto;
  min-height: auto;
  padding: 0;
  background: transparent;
  border: 0;
}

.gesture p {
  margin: 0;
}

.remember-note {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  margin-block-start: var(--space-8);
  padding: var(--space-4) var(--space-6);
  color: var(--color-on-action-primary);
  background: var(--color-action-primary);
  border-radius: var(--radius-sm);
}

.remember-note span {
  font-size: 1.5rem;
}

.remember-note p {
  margin: 0;
  line-height: 1.5;
}

footer {
  color: var(--color-text-muted);
}

@media (max-width: 52rem) {
  .hero {
    grid-template-columns: 1fr;
    gap: var(--space-6);
  }

  .tip-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 34rem) {
  .tips-page {
    padding-inline-end: max(var(--space-4), var(--safe-area-inset-right));
    padding-inline-start: max(var(--space-4), var(--safe-area-inset-left));
  }

  .wordmark {
    display: none;
  }

  .tip-card {
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }

  .shortcut-list > div {
    grid-template-columns: 1fr;
    gap: var(--space-2);
  }
}
</style>
