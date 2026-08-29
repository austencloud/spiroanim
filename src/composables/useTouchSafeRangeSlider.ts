interface TouchSafeRangeSliderOptions {
  begin: () => void
  end: () => void
}

/** Shares the iOS-safe pointer lifecycle used by application range sliders. */
export const useTouchSafeRangeSlider = ({ begin, end }: TouchSafeRangeSliderOptions) => {
  // Applying pan-y is harmless for mouse input, while pointerType keeps the value rollback scoped
  // to touch and pen gestures. This also covers hybrid devices without user-agent detection.
  const protectTouchScrolling = true
  let touchSliderStart:
    | {
        input: HTMLInputElement
        pointerId: number
        value: string
      }
    | undefined

  const beginPointerSlider = (event: PointerEvent) => {
    if (
      protectTouchScrolling &&
      event.pointerType !== 'mouse' &&
      event.currentTarget instanceof HTMLInputElement
    ) {
      touchSliderStart = {
        input: event.currentTarget,
        pointerId: event.pointerId,
        value: event.currentTarget.value,
      }
    }

    begin()
  }

  const endPointerSlider = () => {
    touchSliderStart = undefined
    end()
  }

  const cancelPointerSlider = (event: PointerEvent) => {
    const start = touchSliderStart
    touchSliderStart = undefined

    if (start?.pointerId === event.pointerId && start.input.value !== start.value) {
      start.input.value = start.value
      start.input.dispatchEvent(new Event('input', { bubbles: true }))
    }

    end()
  }

  return {
    protectTouchScrolling,
    beginPointerSlider,
    endPointerSlider,
    cancelPointerSlider,
  }
}
