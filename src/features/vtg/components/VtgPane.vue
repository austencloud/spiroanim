<template>
  <section class="vtg-pane" aria-labelledby="vtg-pane-title">
    <div class="vtg-pane__content">
      <p class="vtg-pane__eyebrow">Generator</p>
      <h1 id="vtg-pane-title">VTG</h1>
      <p>VTG tools will live here.</p>
    </div>
  </section>
</template>

<style scoped>
.vtg-pane {
  display: grid;
  width: 100%;
  height: 100%;
  min-inline-size: 0;
  min-block-size: 0;
  padding: var(--space-6);
  color: var(--color-text);
  background: var(--color-canvas);
  place-items: center;
}

.vtg-pane__content {
  max-width: 28rem;
  text-align: center;
}

.vtg-pane__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--color-action-primary);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(2.5rem, 8vw, 5rem);
  line-height: 1;
}

.vtg-pane__content > p:last-child {
  margin: var(--space-3) 0 0;
  color: var(--color-text-muted);
}
</style>
