# Grading Breakdown - PR #10

**Student:** David Stojchev
**Student ID:** 5945
**GitHub:** @DavidSt123
**Alternative:** Doctor Who

---

## Score Summary

| Category | Score | Percentage |
|----------|-------|------------|
| **Tier 1** (Basic Functionality) | 32 / 60 | 53% |
| **Tier 2** (Edge Case Handling) | 15 / 25 | 60% |
| **Tier 3** (Advanced Features) | 5 / 15 | 33% |
| **Subtotal** | 52 / 100 | |
| **Bonus Points** | +0 | |
| **Deductions** | -0 | |
| **Total Points** | 52 / 100 | |
| **FINAL GRADE** | **52%** | |

---

## Complete Points Breakdown

| Status | Test | Tier | Max Pts | Earned |
|--------|------|------|---------|--------|
| ❌ | Data Loads Successfully | 1 | 10 | 0 |
| ✅ | Loading Indicator Shown | 1 | 3 | 3 |
| ✅ | All Required Columns Present | 1 | 15 | 15 |
| ✅ | Semantic HTML Structure | 1 | 4 | 4 |
| ❌ | Clicking Headers Sorts Table | 1 | 8 | 0 |
| ❌ | Toggle Ascending/Descending | 1 | 4 | 0 |
| ❌ | Sort Direction Indicator | 1 | 3 | 0 |
| ✅ | Filter Input Field Exists | 1 | 5 | 5 |
| ✅ | Filter Actually Works | 1 | 5 | 5 |
|  | **─── TIER 1 SUBTOTAL ───** |  | 60 | 32 |
| ✅ | No "undefined" or "null" Text | 2 | 5 | 5 |
| ✅ | Empty Arrays Handled Gracefully | 2 | 3 | 3 |
| ✅ | Special Characters Render Correctly | 2 | 4 | 4 |
| ❌ | Error Messages User-Friendly | 2 | 3 | 0 |
| ✅ | Missing Data Fields Handled | 2 | 3 | 3 |
| ❌ | Nested Data Properly Formatted | 2 | 4 | 0 |
| ❌ | Multiple Date Formats Sorted | 2 | 3 | 0 |
|  | **─── TIER 2 SUBTOTAL ───** |  | 25 | 15 |
| ❌ | Performance Optimization | 3 | 5 | 0 |
| ❌ | Keyboard Navigation | 3 | 5 | 0 |
| ❌ | Smart Relevance Sorting | 3 | 5 | 0 |
| ❌ | Data Validation & Warnings | 3 | 5 | 0 |
| ❌ | Additional Filters | 3 | 5 | 0 |
| ❌ | Multi-Column Sorting | 3 | 5 | 0 |
| ❌ | Export to CSV | 3 | 5 | 0 |
| ❌ | Grouping/Decade Display | 3 | 5 | 5 |
|  | **─── TIER 3 SUBTOTAL ───** |  | 15 | 5 |
| | | | | |
|  | **BASE SCORE** |  | 100 | 52 |
| | | | | |
|  | **FINAL TOTAL** | ═══ | 100 | 52 |

---

## Error Log

- ⚠️ Data loads successfully: page.waitForSelector: Timeout 20000ms exceeded. Call log: - waiting for locator('table tbody tr') to be visible
- ⚠️ Clicking headers sorts table: Test timeout
- ⚠️ Toggle ascending/descending: Test timeout
- ⚠️ Smart relevance sorting implemented: Test timeout

---

## Instructor Notes

Manual Review: 47% | T1=32/60 (53%) | T2=15/25 (60%) | T3=5/15 (33%)

**Modified Tests:**
- Sort Direction Indicator: Changed to UNCHECKED (0 pts)
- Filter Actually Works: Changed to CHECKED (5 pts)
- Error Messages User-Friendly: Changed to UNCHECKED (0 pts)
- Nested Data Properly Formatted: Changed to UNCHECKED (0 pts)

