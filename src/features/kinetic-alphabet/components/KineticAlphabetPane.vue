<template>
  <section
    class="kinetic-alphabet-pane"
    aria-labelledby="kinetic-alphabet-title"
    data-role="tka-pane"
  >
    <h1 id="kinetic-alphabet-title">The Kinetic Alphabet</h1>
    <p>Possibly coming soon</p>
  </section>
</template>

<style scoped>
.kinetic-alphabet-pane {
  display: grid;
  min-block-size: 12rem;
  padding: var(--space-4);
  color: var(--color-text);
  text-align: center;
  place-content: center;
}

.kinetic-alphabet-pane h1,
.kinetic-alphabet-pane p {
  margin: 0;
}

.kinetic-alphabet-pane h1 {
  font-size: 1.25rem;
}

.kinetic-alphabet-pane p {
  margin-block-start: var(--space-2);
  color: var(--color-text-muted);
}
</style>
