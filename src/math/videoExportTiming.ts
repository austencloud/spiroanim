export function videoExportDurationMs(animationDurationMs: number, playbackSpeed: number): number {
  return playbackSpeed > 0 ? animationDurationMs / playbackSpeed : animationDurationMs
}

export function videoExportFrameCount(durationMs: number, framerate: number): number {
  if (durationMs <= 0) return 1
  return Math.ceil((durationMs / 1000) * framerate) + 1
}

export function videoExportAnimationTimeMs(outputTimeMs: number, playbackSpeed: number): number {
  return playbackSpeed > 0 ? outputTimeMs * playbackSpeed : outputTimeMs
}

export function videoExportFrameTimeMs(
  frame: number,
  totalFrames: number,
  durationMs: number,
  framerate: number,
): number {
  if (frame === totalFrames - 1) return durationMs
  return (frame / framerate) * 1000
}
