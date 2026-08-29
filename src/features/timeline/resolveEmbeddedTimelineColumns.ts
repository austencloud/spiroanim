export const EMBEDDED_TIMELINE_COLUMNS = 4

/** Uses the compact Timeline grid while its surrounding split layout is active. */
export const resolveEmbeddedTimelineColumns = (splitLayoutActive: boolean): number | undefined =>
  splitLayoutActive ? EMBEDDED_TIMELINE_COLUMNS : undefined
