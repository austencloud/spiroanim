# VTG 45 Trans Exhaustive Audit Comparison

Generated: 2026-08-17T20:50:16.103Z

The prior report audited four whole-beat starts. This run audits all eight doubled frames. Direct improvement/regression comparisons therefore use only beats 1, 2, 3, and 4 from the new run; half-beat starts are reported separately.

## Audit result

- Exhaustive extraction and exact-regeneration audit: Passed
- Rotation-option audit across every ratio: Passed
- Incorrect extractions: 0
- Incorrect resolved Quick Slots: 0

## Comparable four-beat results

- Exact failure-set comparison: 0 previously unmatched slots became matched; 2,954 previously matched slots became unmatched.
- The baseline unmatched set is therefore a strict subset of the current unmatched set.
- Failing configurations: 14,012 -> 15,410 (+1,398)
- Unmatched Quick Slots: 32,592 -> 35,546 (+2,954)
- Q2: 0 -> 0 (+0)
- Q3: 13,000 -> 13,850 (+850)
- Q4: 6,592 -> 7,868 (+1,276)
- Q5: 13,000 -> 13,828 (+828)

## Added half-beat coverage

- Failing configurations: 6,750
- Unmatched Quick Slots: 8,858
- Q2: 0
- Q3: 3,210
- Q4: 2,634
- Q5: 3,014

## Full eight-frame result

- Failing configurations: 22,160
- Unmatched Quick Slots: 44,404
- Q2: 0
- Q3: 17,060
- Q4: 10,502
- Q5: 16,842

See the five per-ratio Markdown reports and Excel workbook for details.
