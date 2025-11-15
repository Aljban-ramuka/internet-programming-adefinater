# Hugo Books vs Doctor Who - Test Differences

## Overview

Alternative 1 (Doctor Who) and Alternative 2 (Hugo Books) have **different Tier 2 and Tier 3 tests** because they work with different data structures and requirements.

---

## Tier 1: Basic Functionality (60 points)

**SAME FOR BOTH ALTERNATIVES**

- Data loads successfully (10 pts)
- Loading indicator shown (3 pts)
- Error handling for data fetch (2 pts)
- All required columns present (15 pts)
- Data properly formatted (6 pts)
- Semantic HTML structure (4 pts)
- Clicking headers sorts table (8 pts)
- Toggle ascending/descending (4 pts)
- Visual sort indicator (3 pts)
- Filter input present (5 pts)
- Filter reduces rows (5 pts)

**Total: 60 points (same for both)**

---

## Tier 2: Edge Case Handling (25 points)

### Alternative 1 (Doctor Who) - Tier 2 Tests

| Test | Points | What it checks |
|------|--------|----------------|
| No "undefined" or "null" text | 5 | No raw null/undefined in UI |
| **Empty arrays (cast) handled** | 3 | Empty cast array shows "0" or similar |
| Special characters render | 4 | Quotes, apostrophes, hyphens display correctly |
| Error messages user-friendly | 3 | Clear error messages, not technical |
| Missing data handled | 3 | Null companion, missing fields handled |
| **Multiple writers formatted** | 4 | "Writer A & Writer B" displays properly |
| **Multiple date formats sorted** | 3 | ISO, DD/MM/YYYY, "Month DD, YYYY" all work |

**Doctor Who specific:**
- Multiple writers: "A & B" or "A and B" strings
- Multiple date formats: ISO, DD/MM/YYYY, etc.
- Cast array can be empty

---

### Alternative 2 (Hugo Books) - Tier 2 Tests

| Test | Points | What it checks |
|------|--------|----------------|
| No "undefined" or "null" text | 5 | No raw null/undefined in UI |
| **Award extraction & formatting** | 5 | Nested `award.year` + `award.is_winner` → "2024 Winner" |
| **Series format handling** | 4 | Three formats: `false`, `"String"`, `{name, order}` |
| **Empty/multiple genres** | 3 | Empty genres array, multiple genres comma-separated |
| Special characters & long titles | 4 | Special chars + long title wrapping |
| Error messages user-friendly | 3 | Clear error messages |
| Missing data handled | 3 | Missing fields handled gracefully |

**Hugo Books specific:**
- Award object: nested extraction + boolean handling + formatting (5 pts - harder!)
- Series polymorphism: boolean OR string OR object (4 pts - complex!)
- Genres array: can be empty, multiple values (3 pts)
- NO date format test (Hugo doesn't have mixed date formats)

---

## Tier 3: Advanced Features (15+ points)

### Core Features (SAME FOR BOTH)

These 4 features are in the spec for both alternatives:

| Feature | Points | Test Method |
|---------|--------|-------------|
| Performance Optimization | 5 | Code has debounce/pagination/virtual + comments |
| Keyboard Navigation | 5 | Code has keydown/keyup listeners |
| Smart Relevance Sort | 5 | Filter affects sort order (exact match first) |
| Data Validation | 5 | Console warnings + UI warning count |

**Students choose 2 of these 4 for full Tier 3 credit (15 pts)**

---

### Bonus Features (DIFFERENT FOR EACH)

Students can implement bonus features for extra credit (5 pts each):

#### Alternative 1 (Doctor Who) Bonuses

| Bonus | Points | Test Method |
|-------|--------|-------------|
| Multi-column Sort | 5 | Code has `shiftKey` detection |
| **Enhanced Filters (Era/Doctor/Companion)** | 5 | Has Era, Doctor, or Companion dropdowns (Doctor Who specific) |
| Export to CSV | 5 | Has export button + Blob/download code |
| **Decade Grouping** | 5 | Groups episodes by decade with collapse (Doctor Who specific) |

---

#### Alternative 2 (Hugo Books) Bonuses

| Bonus | Points | Test Method |
|-------|--------|-------------|
| Multi-column Sort | 5 | Code has `shiftKey` detection |
| **Enhanced Filters (Winner/Nominee/Decade/Author)** | 5 | Has Winner, Decade, or Author filters (Hugo specific) |
| Export to CSV | 5 | Has export button + Blob/download code |
| **Genre Grouping** | 5 | Groups books by genre with collapse (Hugo specific) |

---

## Key Differences Summary

### Tier 2 Differences

**Doctor Who** focuses on:
- Multiple writers in a single string ("A & B")
- Multiple date formats (ISO, DD/MM/YYYY, etc.)
- Empty cast arrays

**Hugo Books** focuses on:
- Nested award object extraction (`award.year`, `award.is_winner`)
- Polymorphic series field (3 different data types!)
- Empty/multiple genres arrays
- Award extraction is worth MORE (5 pts vs 4 pts) because it's more complex

### Tier 3 Bonus Differences

**Doctor Who:**
- Enhanced Filters: Era/Doctor/Companion dropdowns
- Grouping: Decade grouping for episodes

**Hugo Books:**
- Enhanced Filters: Winner-Nominee/Decade/Author dropdowns
- Grouping: Genre grouping for books

---

## Implementation in Test Code

### Test Files

- `automated-browser-test.js` - Base tests (used for Doctor Who)
- `hugo-book-tests.js` - Hugo-specific overrides
- `test-prs-directly.js` - Detects alternative and applies correct tests

### How It Works

```javascript
// In test-prs-directly.js
if (prNumber <= 44) {
  alternative = 'alternative-one';  // Doctor Who
  tests = TESTS;  // Use base tests
} else {
  alternative = 'alternative-two';  // Hugo Books
  tests = getHugoTests(TESTS);  // Replace with Hugo tests
}
```

### What getHugoTests() Does

```javascript
function getHugoTests(baseTests) {
  // Remove Doctor Who Tier 2 tests
  delete baseTests.EMPTY_ARRAYS_HANDLED;
  delete baseTests.NESTED_DATA_FORMATTED;
  delete baseTests.DATE_FORMATS_HANDLED;
  
  // Remove generic Tier 3 tests
  delete baseTests.ADDITIONAL_FILTERS;
  delete baseTests.GROUPING_FEATURE;
  
  // Add Hugo Tier 2 tests
  AWARD_EXTRACTION (5 pts)
  SERIES_FORMATS (4 pts)
  GENRES_HANDLING (3 pts)
  
  // Add Hugo Tier 3 bonus tests
  ENHANCED_FILTERS_HUGO (5 pts)
  GENRE_GROUPING (5 pts)
  
  return hugoTests;
}
```

---

## Grading Impact

### Before Hugo-Specific Tests

PRs 45-64 were tested with Doctor Who tests:
- WRONG: "Nested Data" test (4 pts) - doesn't test award extraction
- WRONG: "Multiple Date Formats" test (3 pts) - not applicable to Hugo
- MISSING: Award extraction, series formats, genre handling

### After Hugo-Specific Tests

PRs 45-64 now tested correctly:
- ✅ Award Extraction & Formatting (5 pts) - proper test
- ✅ Series Format Handling (4 pts) - proper test
- ✅ Empty/Multiple Genres (3 pts) - proper test
- ✅ Tier 2 max = 25 pts (not exceeding)

### Score Changes

Example (PR #45):
- **Before**: 84% (wrong tests, wrong point values)
- **After**: 85% (correct Hugo tests, correct points)

Most students will see **minor score adjustments** (+/- 1-2%) because:
- Award test worth more (5 vs 4 pts)
- Series test worth more (4 vs 3 pts)
- Date test removed (was giving free 0 or 3 pts)

---

## Next Steps

1. ✅ Created Hugo-specific tests
2. ✅ Updated test-prs-directly.js to use correct tests
3. ⏳ Re-test all PRs 45-64 with Hugo tests
4. ⏳ Regenerate breakdown files with correct scores
5. ⏳ Update master grades CSV

