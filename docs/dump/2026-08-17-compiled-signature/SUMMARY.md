# VTG 45 Trans Exhaustive Audit Comparison

Generated: 2026-08-17T21:42:37.087Z

## Audit result

- Exhaustive extraction and exact-regeneration audit: Passed
- Rotation-option audit across every ratio: Passed
- Incorrect extractions: 0
- Incorrect resolved Quick Slots: 0

## Compared with optimized eight-frame audit

- Exact slot-set improvements: 15,948 previously unmatched slots now match.
- Exact slot-set regressions: 0 previously matched slots are now unmatched.
- Failing configurations: 22,160 -> 12,296 (-9,864)
- Unmatched Quick Slots: 44,404 -> 28,456 (-15,948)

## Compared with baseline whole-beat audit

- Failing configurations: 14,012 -> 10,824 (-3,188)
- Unmatched Quick Slots: 32,592 -> 26,664 (-5,928)
- This is an aggregate comparison. The baseline workbook predates the explicit Shape column, so an exact row-level improvement/regression split cannot be reconstructed reliably from that artifact alone.

See the five per-ratio Markdown reports and Excel workbook for details.
