<template>
  <main class="temp-page">
    <header class="temp-nav">
      <RouterLink to="/">SpiroAnim Home</RouterLink>
      <span>Temporary PWA Test Page</span>
    </header>

    <article class="temp-content" aria-labelledby="temp-title">
      <p class="kicker">Temporary route</p>
      <h1 id="temp-title">The update reached this device.</h1>
      <p class="intro">
        This page exists temporarily to verify that a newly deployed route and its bundled content
        arrive through the SpiroAnim PWA update process.
      </p>

      <section aria-labelledby="filler-title">
        <h2 id="filler-title">Filler content</h2>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere, justo quis
          tincidunt faucibus, neque justo tincidunt nibh, vitae facilisis neque velit at sapien.
        </p>
        <p>
          Sed posuere interdum sem, non consequat erat tincidunt vitae. Donec malesuada, mauris at
          volutpat luctus, lacus tortor aliquet magna, sed ullamcorper nibh erat vitae lectus.
        </p>
        <p>
          Curabitur interdum, velit sed consequat posuere, sem augue fermentum lorem, vitae
          tincidunt nisl neque at arcu. Suspendisse potenti. Praesent feugiat tempus libero.
        </p>
      </section>

      <RouterLink class="app-link" to="/app">Open SpiroAnim</RouterLink>
    </article>
  </main>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.temp-page {
  position: fixed;
  inset: 0;
  min-width: 0;
  min-height: 0;
  padding-block-start: max(var(--space-6), var(--safe-area-inset-top));
  padding-inline-end: max(var(--space-6), var(--safe-area-inset-right));
  padding-block-end: max(var(--space-6), var(--safe-area-inset-bottom));
  padding-inline-start: max(var(--space-6), var(--safe-area-inset-left));
  overflow-y: auto;
  color: var(--color-text);
  background:
    radial-gradient(
      circle at 82% 12%,
      color-mix(in srgb, var(--color-action-primary) 16%, transparent),
      transparent 28rem
    ),
    var(--color-canvas);
}

.temp-nav,
.temp-content {
  width: min(100%, 58rem);
  margin-inline: auto;
}

.temp-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  color: var(--color-text-muted);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.temp-nav a {
  color: var(--color-action-primary);
  text-decoration: none;
}

.temp-content {
  padding-block: clamp(4rem, 12vh, 8rem);
}

.kicker {
  margin: 0 0 var(--space-3);
  color: var(--color-action-primary);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

h1 {
  max-width: 15ch;
  margin: 0;
  font-size: clamp(2.5rem, 8vw, 5.5rem);
  line-height: 0.98;
  letter-spacing: -0.055em;
}

.intro {
  max-width: 46rem;
  margin: var(--space-6) 0 0;
  color: var(--color-text-muted);
  font-size: clamp(1.05rem, 2vw, 1.25rem);
  line-height: 1.65;
}

section {
  max-width: 46rem;
  margin-block-start: var(--space-8);
  padding: var(--space-6);
  background: color-mix(in srgb, var(--color-surface) 92%, transparent);
  border: 1px solid var(--color-border);
  border-radius: calc(var(--radius-md) * 2);
}

h2 {
  margin: 0 0 var(--space-4);
  color: var(--color-action-primary);
}

section p {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.7;
}

section p + p {
  margin-block-start: var(--space-4);
}

.app-link {
  display: inline-flex;
  min-height: 3rem;
  margin-block-start: var(--space-8);
  align-items: center;
  padding-inline: var(--space-5);
  color: var(--color-on-action-primary);
  font-weight: 750;
  text-decoration: none;
  background: var(--color-action-primary);
  border: 1px solid var(--color-action-primary);
  border-radius: var(--radius-md);
}

.temp-nav a:focus-visible,
.app-link:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--color-action-primary) 48%, var(--color-text));
  outline-offset: 4px;
}

@media (max-width: 34rem) {
  .temp-nav {
    align-items: flex-start;
    flex-direction: column;
  }

  section {
    padding: var(--space-5);
  }
}
</style>
