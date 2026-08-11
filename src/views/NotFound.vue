<template>
  <main class="not-found-page">
    <div class="ambient-orbit ambient-orbit--one" aria-hidden="true" />
    <div class="ambient-orbit ambient-orbit--two" aria-hidden="true" />

    <section class="not-found-card" aria-labelledby="not-found-title">
      <div class="not-found-copy">
        <RouterLink class="brand-link" to="/" aria-label="SpiroAnim home">
          <img :src="brandIconUrl" alt="" aria-hidden="true" />
          <span>SpiroAnim</span>
        </RouterLink>

        <p class="error-code">Error 404</p>
        <h1 id="not-found-title">This path drifted out of frame.</h1>
        <p class="error-message">
          The page you requested does not exist, or it may have moved somewhere else in the
          animation.
        </p>

        <aside class="update-hint" aria-label="Possible app update">
          <BaseIcon class="update-hint__icon" :path="mdiUpdate" :size="24" />
          <div>
            <strong>Wait!</strong>
            <p>
              If you opened someone's link and have previously visited spiroanim.com, the app may
              still be updating. If an <b>Update Now</b> prompt appears, clicking it may resolve
              this page.
            </p>
          </div>
        </aside>

        <nav class="not-found-actions" aria-label="Page recovery">
          <RouterLink class="action-link action-link--primary" to="/">
            <BaseIcon :path="mdiHomeOutline" :size="21" />
            Return Home
          </RouterLink>
          <RouterLink class="action-link action-link--secondary" to="/app">
            <BaseIcon :path="mdiCreationOutline" :size="21" />
            Open SpiroAnim
          </RouterLink>
        </nav>
      </div>

      <div class="orbit-visual" aria-hidden="true">
        <div class="orbit-stage">
          <span class="orbit orbit--one" />
          <span class="orbit orbit--two" />
          <span class="orbit orbit--three" />
          <span class="orbit-dot orbit-dot--one" />
          <span class="orbit-dot orbit-dot--two" />
          <img :src="brandIconUrl" alt="" />
          <span class="visual-code">404</span>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { mdiCreationOutline, mdiHomeOutline, mdiUpdate } from '@mdi/js'
import { RouterLink } from 'vue-router'

import BaseIcon from '@/components/icons/BaseIcon.vue'

const brandIconUrl = '/images/app-icons/pwa-source.svg'
</script>

<style scoped>
.not-found-page {
  position: fixed;
  inset: 0;
  display: grid;
  min-width: 0;
  min-height: 0;
  padding-block-start: max(var(--space-6), var(--safe-area-inset-top));
  padding-inline-end: max(var(--space-6), var(--safe-area-inset-right));
  padding-block-end: max(var(--space-6), var(--safe-area-inset-bottom));
  padding-inline-start: max(var(--space-6), var(--safe-area-inset-left));
  overflow: hidden auto;
  align-items: start;
  justify-items: center;
  color: var(--color-text);
  background:
    radial-gradient(
      circle at 12% 18%,
      color-mix(in srgb, var(--color-action-primary) 18%, transparent),
      transparent 28rem
    ),
    radial-gradient(
      circle at 88% 82%,
      color-mix(in srgb, var(--color-workspace-separator) 17%, transparent),
      transparent 30rem
    ),
    var(--color-canvas);
}

.ambient-orbit {
  position: fixed;
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 18%, transparent);
  border-radius: 50%;
  pointer-events: none;
}

.ambient-orbit--one {
  inset-block-start: -18rem;
  inset-inline-end: -10rem;
  width: 34rem;
  height: 34rem;
}

.ambient-orbit--two {
  inset-block-end: -22rem;
  inset-inline-start: -14rem;
  width: 40rem;
  height: 40rem;
  border-color: color-mix(in srgb, var(--color-workspace-separator) 18%, transparent);
}

.not-found-card {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(16rem, 0.95fr);
  width: min(100%, 62rem);
  margin-block: auto;
  overflow: hidden;
  background: color-mix(in srgb, var(--color-surface) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-workspace-boundary) 55%, var(--color-border));
  border-radius: calc(var(--radius-md) * 2);
  box-shadow: 0 1.75rem 5rem color-mix(in srgb, var(--color-text) 17%, transparent);
  backdrop-filter: blur(1rem);
}

.not-found-copy {
  display: flex;
  padding: clamp(var(--space-8), 7vw, 4.5rem);
  flex-direction: column;
  justify-content: center;
}

.brand-link {
  display: inline-flex;
  width: max-content;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text);
  font-weight: 700;
  text-decoration: none;
}

.brand-link img {
  width: 2.5rem;
  height: 2.5rem;
  filter: drop-shadow(0 0 0.65rem color-mix(in srgb, var(--color-action-primary) 30%, transparent));
}

.error-code {
  margin: clamp(var(--space-8), 8vh, 4.5rem) 0 var(--space-3);
  color: var(--color-action-primary);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

h1 {
  max-width: 12ch;
  margin: 0;
  font-size: clamp(2.25rem, 6vw, 4.5rem);
  line-height: 0.98;
  letter-spacing: -0.055em;
}

.error-message {
  max-width: 34rem;
  margin: var(--space-6) 0 0;
  color: var(--color-text-muted);
  font-size: clamp(1rem, 2vw, 1.15rem);
  line-height: 1.65;
}

.update-hint {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-3);
  margin-block-start: var(--space-6);
  padding: var(--space-4);
  background: color-mix(in srgb, var(--color-action-primary) 9%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 45%, var(--color-border));
  border-radius: var(--radius-md);
  box-shadow: inset 0 1px color-mix(in srgb, var(--color-on-action-primary) 12%, transparent);
}

.update-hint__icon {
  margin-block-start: 0.1rem;
  color: var(--color-action-primary);
}

.update-hint strong {
  color: var(--color-action-primary);
  font-size: 0.8rem;
  font-weight: 850;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.update-hint p {
  margin: var(--space-1) 0 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

.update-hint b {
  color: var(--color-text);
}

.not-found-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-block-start: var(--space-8);
}

.action-link {
  display: inline-flex;
  min-height: 3rem;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding-inline: var(--space-4);
  font-weight: 750;
  text-decoration: none;
  border: 1px solid var(--color-action-primary);
  border-radius: var(--radius-md);
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    transform var(--transition-fast);
}

.action-link--primary {
  color: var(--color-on-action-primary);
  background: var(--color-action-primary);
}

.action-link--secondary {
  color: var(--color-action-primary);
  background: transparent;
}

.action-link:hover {
  transform: translateY(-2px);
}

.action-link--secondary:hover {
  color: var(--color-on-action-primary);
  background: var(--color-action-primary);
}

.brand-link:focus-visible,
.action-link:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--color-action-primary) 48%, var(--color-text));
  outline-offset: 4px;
}

.orbit-visual {
  position: relative;
  display: grid;
  min-height: 34rem;
  overflow: hidden;
  place-items: center;
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--color-action-primary) 8%, transparent),
      transparent 55%
    ),
    color-mix(in srgb, var(--color-canvas) 82%, var(--color-surface));
  border-inline-start: 1px solid
    color-mix(in srgb, var(--color-workspace-boundary) 45%, var(--color-border));
}

.orbit-stage {
  position: relative;
  display: grid;
  width: min(23rem, 78%);
  aspect-ratio: 1;
  place-items: center;
}

.orbit-stage::before {
  position: absolute;
  width: 56%;
  aspect-ratio: 1;
  content: '';
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--color-action-primary) 13%, transparent),
    transparent 68%
  );
  border-radius: 50%;
  filter: blur(0.25rem);
}

.orbit-stage img {
  z-index: 2;
  width: 38%;
  opacity: 0.34;
  filter: saturate(0.85)
    drop-shadow(0 0 1.5rem color-mix(in srgb, var(--color-action-primary) 42%, transparent));
}

.orbit {
  position: absolute;
  width: 82%;
  height: 35%;
  border: 2px solid color-mix(in srgb, var(--color-action-primary) 62%, transparent);
  border-radius: 50%;
  box-shadow: 0 0 1rem color-mix(in srgb, var(--color-action-primary) 12%, transparent);
}

.orbit--one {
  transform: rotate(18deg);
}

.orbit--two {
  border-color: color-mix(in srgb, var(--color-workspace-separator) 72%, transparent);
  transform: rotate(78deg);
}

.orbit--three {
  border-color: color-mix(in srgb, var(--color-workspace-boundary) 76%, transparent);
  transform: rotate(138deg);
}

.orbit-dot {
  position: absolute;
  z-index: 3;
  width: 0.7rem;
  height: 0.7rem;
  background: var(--color-action-primary);
  border: 3px solid var(--color-surface);
  border-radius: 50%;
  box-shadow: 0 0 1rem color-mix(in srgb, var(--color-action-primary) 70%, transparent);
}

.orbit-dot--one {
  inset-block-start: 30%;
  inset-inline-end: 8%;
}

.orbit-dot--two {
  inset-block-end: 16%;
  inset-inline-start: 28%;
  background: var(--color-workspace-separator);
}

.visual-code {
  position: absolute;
  z-index: 4;
  color: var(--color-text);
  font-size: clamp(3rem, 8vw, 5.5rem);
  font-weight: 850;
  letter-spacing: -0.08em;
  text-shadow: 0 0 2rem var(--color-canvas);
}

@media (max-width: 48rem) {
  .not-found-page {
    padding-block-start: max(var(--space-4), var(--safe-area-inset-top));
    padding-inline-end: max(var(--space-4), var(--safe-area-inset-right));
    padding-block-end: max(var(--space-4), var(--safe-area-inset-bottom));
    padding-inline-start: max(var(--space-4), var(--safe-area-inset-left));
  }

  .not-found-card {
    grid-template-columns: 1fr;
  }

  .not-found-copy {
    padding: var(--space-8);
  }

  .error-code {
    margin-block-start: var(--space-8);
  }

  .orbit-visual {
    min-height: 18rem;
    border-block-start: 1px solid
      color-mix(in srgb, var(--color-workspace-boundary) 45%, var(--color-border));
    border-inline-start: 0;
  }

  .orbit-stage {
    width: min(18rem, 72%);
  }
}

@media (max-width: 28rem) {
  .not-found-copy {
    padding: var(--space-6);
  }

  .not-found-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .action-link {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .action-link {
    transition: none;
  }
}
</style>
