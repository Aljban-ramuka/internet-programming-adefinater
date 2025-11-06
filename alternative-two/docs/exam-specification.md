# Hugo Award Books Explorer - Exam Specification

## Overview

Build an interactive web application for exploring Hugo Award nominated and winning books with sorting, filtering, and data display capabilities. The application should handle edge cases gracefully and provide options for advanced features.

## Requirements

### Tier 1: Basic Functionality (60 points)

#### Book Display Table (35 points)

Display books in a table with the following columns:

- Title (text)
- Author (text)
- Type (text, extracted from `award.category` - typically "Best Novel" or "Best Novella")
- Award (format: "YYYY Winner" or "YYYY Nominee", extracted from nested `award` object)
- Publisher (text)
- Series (text or "None" for `series: false`)
- Genres (comma-separated list)

**Award Column Requirements:**
- Extract year from `award.year`
- Extract winner status from `award.is_winner`
- Format as: `"2025 Winner"` if `is_winner` is `true`
- Format as: `"2025 Nominee"` if `is_winner` is `false`
- Sort by year when clicking Award column header

#### Data Loading (15 points)

- Fetch book data from the provided JSON endpoint

  - Alternative 1: use the URL: https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/hugo-books-full.json
  - Alternative 2: **(bonus 5 points)** use this set of URLS to load all data:
      - https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/hugo_books.json
      - https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/hugo_edges.json
      - https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/hugo_novellas.json
  - Alternative 3: **(negative 10 points for using this option)** - use a local file named `hugo-books-full.json` placed in the same directory as your HTML file

- Show loading indicator while data is being fetched
- Handle network errors gracefully
- Display error message if fetch fails

#### Basic Interaction (10 points)

- Implement single-column sorting (toggle ascending/descending)
- Add case-insensitive name filter (partial match)
- Show/hide loading states appropriately

### Tier 2: Edge Case Handling (25 points)

#### Data Robustness (15 points)

- Extract and format award information from nested object (5 points)
- Handle all three series formats correctly (3 points):
  - `series: false` → display "None" or "—"
  - `series: "String"` → display the series name
  - `series: {name, order}` → display formatted with order (e.g., "Series Name (#1)")
- Process empty genres arrays correctly (3 points)
- Display multiple genres properly (2 points)
- Handle long book titles (2 points)

#### Display Formatting (10 points)

- Render special characters in titles correctly (4 points)
- Format error messages clearly (3 points)
- Handle missing/null values gracefully (3 points)

### Tier 3: Advanced Features (Choose 2, 15 points total)

#### 1. Performance Optimization (5 points)

- Implement strategies for handling 1000+ books
- Document optimization approach in comments
- Options: virtualization, pagination, debouncing

#### 2. Keyboard Navigation (5 points)

- Arrow keys: Navigate table rows
- Enter: Sort by focused column
- Tab/Shift+Tab: Move between filters
- Visual feedback for current focus

#### 3. Smart Relevance Sort (5 points)

When filtering, sort results by:

1. Exact title matches
2. Title contains search term
3. Any field contains search term
4. Default year order

#### 4. Data Validation (5 points)

- Log console warnings for:
  - Missing required fields
  - Future publication years
  - Duplicate IDs
  - Invalid winner status values
- Display warning count in UI

### Bonus Features (5 points each, optional)

1. **Multi-column Sort**

   - Shift+click to add sort levels
   - Visual indicators for sort order

2. **Enhanced Filters**

   - Winner/Nominee dropdown filter
   - Decade dropdown (1950s, 1960s, etc.)
   - Author filter (populated from data)

3. **Export Functionality**

   - Export filtered results as CSV
   - Include all visible columns
   - Proper string escaping

4. **Genre Grouping**
   - Group books by primary genre
   - Collapsible genre sections
   - Book count per genre

## Technical Requirements

### Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)

### Code Quality

- Use modern JavaScript (ES6+)
- Clear variable/function names
- Comments for complex logic
- Consistent code formatting
- Error handling with try-catch

### Development Constraints

- Vanilla JavaScript (no frameworks)
- No build process required
- CDN resources allowed
- Local browser testing
- No external dependencies beyond CDN

## Test Data Handling

### Edge Cases to Handle

1. Books with `series: false` (standalone books)
2. Books with `series: "String"` (series name only, no order)
3. Books with `series: {name, order}` (series name with order number)
4. Empty genres arrays
5. Multiple genres per book
6. Special characters in titles
7. Long titles
8. Mixed ID types (string and number)
9. Invalid/suspicious data entries
10. Nested award object extraction

### Error Scenarios

1. Network fetch failures
2. Invalid JSON data
3. Missing required fields
4. Malformed data values

## Data Structure

Each book object in the JSON contains:

```json
{
  "id": "12345",
  "title": "Book Title",
  "author": "Author Name",
  "award": {
    "year": 2025,
    "category": "Best Novel",
    "is_winner": true
  },
  "publisher": "Publisher Name",
  "series": false |"Series Name" | {"name": "Series Name", "order": 1},
  "genres": ["Genre1", "Genre2"] | []
}
```

**Important Notes:**
- `id` can be either a string or number (handle type coercion)
- `award` is a nested object with three properties
- `award.year` is a number representing the Hugo Award year
- `award.is_winner` is a boolean (true for winners, false for nominees)
- `award.category` is typically "Best Novel" but may vary
- Must extract and format: `"{year} Winner"` or `"{year} Nominee"`
- `series` has **three possible formats**:
  - `false`: standalone book (not part of a series) - display "None" or "—"
  - `"Series Name"`: part of a series with unclear order - display the series name
  - `{"name": "Series Name", "order": 1}`: part of a series with known order - display as "Series Name (#1)" or similar
- `genres` is an array that can be empty `[]` or contain multiple genre strings

**Edge Cases to Handle:**
- Books with `series: false` (display "None" or "—")
- Books with series as string (no order information available)
- Books with series as object (extract name and order for display)
- Empty genres arrays (display "None" or appropriate message)
- Multiple genres per book (display comma-separated or in a meaningful way)
- Special characters in titles (quotes, apostrophes, ampersands)
- Long book titles (ensure proper text wrapping/truncation)
- Mixed ID types (some numeric, some string - ensure consistent comparison)

## Submission Requirements

### Required Files

1. index.html
2. script.js
3. styles.css

### File Organization

- Clean directory structure
- Logical file organization
- No extraneous files

### Code Documentation

- Clear code comments
- Function documentation
- Edge case handling notes

## Grading Focus

### Critical Aspects

1. Core functionality works
2. Edge cases handled gracefully
3. No console errors on load
4. Responsive user interface
5. Code readability

### Automatic Deductions

- Console errors (-5 points)
- Crashes on interaction (-10 points)
- Incomplete implementation (-15 points)

## Testing Guidelines

### Functional Testing

1. Data loads and displays
2. Sorting works correctly
3. Filtering is accurate
4. Edge cases render properly

### Performance Testing

1. Large dataset handling
2. Filter response time
3. Sort operation speed
4. Memory usage

### Edge Case Testing

1. Null values
2. Special characters
3. Invalid data
4. Network errors