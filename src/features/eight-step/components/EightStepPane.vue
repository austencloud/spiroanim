<template>
  <section class="eight-step-pane" aria-labelledby="eight-step-status" data-role="eight-step-pane">
    <div class="eight-step-pane__card">
      <div class="eight-step-pane__art" aria-hidden="true">
        <span class="eight-step-pane__orbit eight-step-pane__orbit--outer"></span>
        <span class="eight-step-pane__orbit eight-step-pane__orbit--inner"></span>
        <span class="eight-step-pane__mark">8</span>
      </div>
      <h2 id="eight-step-status" class="eight-step-pane__status">Coming soon!</h2>
    </div>
  </section>
</template>

<style scoped>
.eight-step-pane {
  display: grid;
  min-block-size: max(15rem, calc(100% - 3rem));
  padding: var(--space-4);
  place-items: center;
}

.eight-step-pane__card {
  position: relative;
  isolation: isolate;
  display: grid;
  width: min(100%, 28rem);
  min-block-size: 13rem;
  padding: var(--space-6);
  overflow: hidden;
  background:
    radial-gradient(
      circle at 50% 35%,
      color-mix(in srgb, var(--color-action-primary) 22%, transparent),
      transparent 46%
    ),
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--color-surface) 90%, var(--color-action-primary)),
      var(--color-surface)
    );
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 48%, var(--color-border));
  border-radius: calc(var(--radius-md) * 2);
  box-shadow:
    0 1rem 2.5rem color-mix(in srgb, var(--color-canvas) 72%, transparent),
    inset 0 1px color-mix(in srgb, var(--color-on-action-primary) 18%, transparent);
  place-items: center;
}

.eight-step-pane__card::before,
.eight-step-pane__card::after {
  position: absolute;
  z-index: -1;
  inline-size: 8rem;
  block-size: 8rem;
  content: '';
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 18%, transparent);
  border-radius: 50%;
}

.eight-step-pane__card::before {
  inset-block-start: -4.5rem;
  inset-inline-start: -3rem;
}

.eight-step-pane__card::after {
  inset-block-end: -5rem;
  inset-inline-end: -2.5rem;
}

.eight-step-pane__art {
  position: relative;
  display: grid;
  inline-size: 7.5rem;
  block-size: 7.5rem;
  place-items: center;
}

.eight-step-pane__mark {
  color: var(--color-action-primary);
  font-size: 6.5rem;
  font-weight: 800;
  line-height: 0.9;
  text-shadow: 0 0 1.5rem color-mix(in srgb, var(--color-action-primary) 38%, transparent);
  animation: eight-step-float 4s ease-in-out infinite;
}

.eight-step-pane__orbit {
  position: absolute;
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 55%, transparent);
  border-radius: 50%;
}

.eight-step-pane__orbit--outer {
  inline-size: 7.25rem;
  block-size: 3.25rem;
  transform: rotate(-28deg);
}

.eight-step-pane__orbit--inner {
  inline-size: 5.75rem;
  block-size: 2.25rem;
  border-style: dashed;
  transform: rotate(28deg);
}

.eight-step-pane__status {
  margin: var(--space-2) 0 0;
  color: var(--color-text);
  font-size: clamp(1.25rem, 4vw, 1.75rem);
  line-height: 1.2;
  letter-spacing: 0.02em;
  text-align: center;
}

@keyframes eight-step-float {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-0.25rem);
  }
}

@media (max-width: 30rem) {
  .eight-step-pane {
    padding: var(--space-2);
  }

  .eight-step-pane__card {
    min-block-size: 12rem;
    padding: var(--space-4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .eight-step-pane__mark {
    animation: none;
  }
}
</style>
