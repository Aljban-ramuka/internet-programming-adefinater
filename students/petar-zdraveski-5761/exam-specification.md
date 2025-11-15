# Doctor Who Episodes Explorer - Exam Specification

## Overview

Build an interactive web application for exploring Doctor Who episodes with sorting, filtering, and data display capabilities. The application should handle edge cases gracefully and provide options for advanced features.

## Requirements

### Tier 1: Basic Functionality (60 points)

#### Episode Display Table (35 points)

Display episodes in a table with the following columns:

- Rank (number)
- Title (text)
- Series (number)
- Era (Classic/Modern/Recent)
- Broadcast Year (extracted from date)
- Director (text)
- Writer (text)
- Doctor (format: "Actor Name (Incarnation)")
- Companion (format: "Actor Name (Character)")
- Cast Count (number)

#### Data Loading (15 points)

- Fetch episode data from the provided JSON endpoint

  - Alternative 1: use the URL: https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-full.json
  - Alternative 2: **(bonus 5 points)** use this set of URLS to load all data:
      - https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-01-10.json
      - https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-11-20.json
      - https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-21-30.json
      - https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-31-40.json
      - https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-41-50.json
      - https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-51-65.json

  - Alternative 3: **(negative 10 points for using this option)** - use a local file named `doctor-who-episodes-full.json` placed in the same directory as your HTML file

- Show loading indicator while data is being fetched
- Handle network errors gracefully
- Display error message if fetch fails

#### Basic Interaction (10 points)

- Implement single-column sorting (toggle ascending/descending)
- Add case-insensitive name filter (partial match)
- Show/hide loading states appropriately

### Tier 2: Edge Case Handling (25 points)

#### Data Robustness (15 points)

- Handle null/missing companion data (5 points)
- Process empty cast arrays correctly (3 points)
- Display multiple writer credits properly (3 points)
- Sort dates with mixed formats (4 points)

#### Display Formatting (10 points)

- Render special characters in titles correctly (4 points)
- Format error messages clearly (3 points)
- Handle missing/null values gracefully (3 points)

### Tier 3: Advanced Features (Choose 2, 15 points total)

#### 1. Performance Optimization (5 points)

- Implement strategies for handling 1000+ episodes
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
4. Default rank order

#### 4. Data Validation (5 points)

- Log console warnings for:
  - Missing required fields
  - Future broadcast dates
  - Duplicate/invalid ranks
  - Negative series numbers
- Display warning count in UI

### Bonus Features (5 points each, optional)

1. **Multi-column Sort**

   - Shift+click to add sort levels
   - Visual indicators for sort order

2. **Enhanced Filters**

   - Era dropdown (Classic/Modern/Recent)
   - Doctor filter (populated from data)
   - Companion filter (populated from data)

3. **Export Functionality**

   - Export filtered results as CSV
   - Include all visible columns
   - Proper string escaping

4. **Decade Grouping**
   - Group episodes by decade
   - Collapsible decade sections
   - Episode count per decade

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

1. Missing companion data
2. Empty cast arrays
3. Multiple writer formats
4. Special characters in titles
5. Mixed date formats
6. Invalid/suspicious data entries

### Error Scenarios

1. Network fetch failures
2. Invalid JSON data
3. Missing required fields
4. Malformed data values

## Data Structure

Each episode object in the JSON contains:

```json
{
  "rank": 65,
  "title": "Episode Title",
  "series": 1,
  "era": "Classic",
  "broadcast_date": "1963-11-23",
  "director": "Director Name",
  "writer": "Writer Name",
  "doctor": {
    "actor": "William Hartnell",
    "incarnation": "First Doctor"
  },
  "companion": {
    "actor": "Carole Ann Ford",
    "character": "Susan Foreman"
  },
  "cast": [
    {"actor": "Actor Name", "character": "Character Name"}
  ]
}
```

**Important Notes:**
- `rank` is a number representing the episode's ranking (may be negative in edge cases)
- `broadcast_date` can be in multiple formats: "YYYY-MM-DD", "DD/MM/YYYY", "Month DD, YYYY", or "YYYY"
- `doctor` is an object with `actor` (string) and `incarnation` (string) properties
- `companion` can be `null` for episodes without a companion
- `cast` is an array of objects, can be empty `[]`
- `writer` may contain multiple writers separated by "&" or "and"
- Special characters (quotes, apostrophes, hyphens, slashes) may appear in titles

**Edge Cases to Handle:**
- Episodes with `companion: null` (display "None" or "—")
- Episodes with empty cast arrays (display "0" or appropriate message)
- Multiple writers: "Writer A & Writer B" or "Writer A and Writer B"
- Mixed date formats that must sort correctly
- Negative or zero ranks (test data validation)
- Special characters in titles: quotes ("), apostrophes ('), hyphens (-), slashes (/)

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
