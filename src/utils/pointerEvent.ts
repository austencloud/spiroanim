export function getPointerClientPosition(event: MouseEvent | TouchEvent) {
  if ('touches' in event) {
    const touch = event.changedTouches[0] ?? event.touches[0]
    return touch ? { clientX: touch.clientX, clientY: touch.clientY } : undefined
  }

  return { clientX: event.clientX, clientY: event.clientY }
}
