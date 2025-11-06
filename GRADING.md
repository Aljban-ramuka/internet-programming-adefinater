# Grading Guide - Internet Programming Exam

## Grading Scale Overview

**Total Available Points:** ~125  
**Grading Scale:** 0-100  
**Conversion:** Your score is calculated as: `(earned_points - deductions) / 100 × 100`, **capped at 100**

This means you can earn up to 125 points, but your final grade maxes out at 100. This design provides **multiple paths to achieving a perfect score** and rewards students who go above and beyond.

---

## Point Distribution

| Category | Points | Description |
|----------|--------|-------------|
| **Tier 1: Basic Functionality** | 60 | Core requirements - must work reliably |
| **Tier 2: Edge Case Handling** | 25 | Robust implementation - shows understanding |
| **Tier 3: Advanced Features** | 15+ | Problem-solving - choose 2 or more features |
| **Bonus Features** | 25+ | Exceptional work - optional enhancements |
| **Total Available** | **~125** | Multiple paths to 100 |

---

## Paths to 100 Points

Here are example combinations that achieve a perfect score:

1. **The Completionist:** Tier 1 (60) + Tier 2 (25) + Tier 3 (15) = 100
2. **The Perfectionist:** Tier 1 (60) + Tier 2 (25) + Any 3 Bonus (15) = 100
3. **The Innovator:** Tier 1 (60) + Tier 2 (20) + Tier 3 (10) + Bonus (10) = 100
4. **The Specialist:** Tier 1 (60) + Tier 3 (15) + Bonus (25) = 100

Students who complete all tiers plus bonus features can earn significantly more than 100 points, ensuring the highest grade.

---

## Tier 1: Basic Functionality (60 points)

These requirements are **essential** and must work reliably. This tier represents the minimum for a passing grade.

### Data Loading (15 points)

- **10 pts** - Successfully fetches data from the specified JSON endpoint
  - Must use the correct URL from exam specification
  - Must handle HTTP errors gracefully
  - Must parse JSON without errors
  
- **3 pts** - Shows loading indicator during fetch
  - Indicator appears immediately when loading starts
  - Indicator disappears when data loads or error occurs
  - Indicator is visible and clear to user
  
- **2 pts** - Displays error message if fetch fails
  - Error message is user-friendly
  - Message appears in appropriate location
  - Does not leave user with blank/broken page

**Deductions:**
- Incorrect API URL: -5 pts
- No error handling (fails silently): -3 pts
- Loading indicator never disappears: -2 pts

---

### Episode/Book Display (25 points)

- **15 pts** - All required columns displayed correctly
  - All columns from specification present
  - Data appears in correct columns
  - No missing or misaligned data
  - Proper data types (numbers as numbers, text as text)
  
- **6 pts** - Proper data formatting
  - Doctor/Companion formatted as "Actor (Role)" or similar
  - Award formatted as "YYYY Winner/Nominee" (alternative-two)
  - Series formatted correctly (alternative-two)
  - Broadcast year extracted from date (alternative-one)
  - Cast count displayed as number (alternative-one)
  
- **4 pts** - Table structure is semantic and accessible
  - Uses proper HTML table elements (`<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`)
  - Headers use `<th>` tags
  - Table is reasonably styled and readable

**Common Issues:**
- Missing columns: -3 pts per column
- Displaying raw JSON (e.g., "[object Object]"): -5 pts
- Year not extracted from date: -2 pts
- Companion showing "undefined" or "null": -3 pts (also penalized in Tier 2)

---

### Single-Column Sorting (15 points)

- **8 pts** - Clicking column headers sorts the table
  - Click changes visible order of rows
  - Sort affects all columns (rows move together)
  - Works on at least 5 different columns
  
- **4 pts** - Toggle ascending/descending on re-click
  - First click sorts one direction
  - Second click reverses sort order
  - Third click (if implemented) returns to original or toggles again
  
- **3 pts** - Visual indicator of sort direction
  - Arrow, icon, or text shows current sort column
  - Indicator shows direction (ascending/descending)
  - Indicator updates when sorting changes

**Common Issues:**
- Sort doesn't actually change order: -8 pts
- No visual feedback: -3 pts
- Only works once (doesn't toggle): -4 pts
- Era sorting alphabetically instead of logically: -2 pts

---

### Name/Title Filtering (10 points)

- **7 pts** - Filter works correctly
  - Case-insensitive matching
  - Partial matches (contains, not exact match)
  - Updates visible rows appropriately
  - Works with special characters
  
- **3 pts** - Filter updates in real-time or on clear interaction
  - Updates as user types (real-time) OR
  - Updates on button click/enter press (clear trigger)
  - No confusing delays or multiple triggers needed

**Common Issues:**
- Case-sensitive filtering only: -3 pts
- Only exact matches work: -3 pts
- Filter doesn't actually filter: -7 pts
- Crashes on empty input: -5 pts

---

## Tier 2: Edge Case Handling (25 points)

This tier separates students who understand the code from those who just copy-paste. Proper edge case handling requires **testing with the provided data** and **understanding** what the code does.

### Data Robustness (15 points)

#### For Alternative One (Doctor Who):

- **5 pts** - Null companion handling
  - Displays "No companion", "None", "—", or similar
  - Does NOT show "null", "undefined", or crash
  - Format is consistent across all null companions
  
- **3 pts** - Empty cast arrays
  - Shows "0" or appropriate message
  - Does NOT show "undefined" or crash
  - Handles gracefully in display and sorting
  
- **4 pts** - Multiple writers display
  - Shows full writer string correctly
  - Handles "Writer A & Writer B" format
  - Handles "Writer A and Writer B" format
  - Sorting works correctly with multiple writers
  
- **3 pts** - Special characters rendering
  - Apostrophes: "The Doctor's Wife"
  - Quotes: 'The "Deadly" Assassin'
  - Hyphens, slashes, parentheses all render correctly

#### For Alternative Two (Hugo Books):

- **5 pts** - Award extraction and formatting
  - Correctly extracts nested award.year
  - Correctly reads award.is_winner boolean
  - Formats as "YYYY Winner" or "YYYY Nominee"
  - Sorts correctly by year when clicking Award column
  
- **4 pts** - Series format handling (all three types)
  - `series: false` → displays "None" or "—"
  - `series: "String"` → displays the series name
  - `series: {name, order}` → displays formatted "Name (#order)" or similar
  
- **3 pts** - Empty/multiple genres
  - Empty genres array shows "None" or similar
  - Multiple genres display properly (comma-separated or similar)
  - Does not show "undefined" or crash
  
- **3 pts** - Special characters and long titles
  - Handles special characters in titles/authors
  - Long titles wrap or truncate appropriately
  - No layout breaking

---

### Display Formatting (10 points)

- **4 pts** - Special characters render correctly
  - No HTML entity codes visible (e.g., `&amp;`, `&quot;`)
  - Unicode characters display properly
  - Accented characters render correctly
  
- **3 pts** - Error messages are clear and user-friendly
  - Not technical/developer-oriented
  - Provide helpful information
  - Appear in appropriate location
  
- **3 pts** - Missing/null values handled gracefully
  - Never shows "undefined", "null", "[object Object]"
  - Uses consistent placeholder text
  - Maintains layout integrity

---

## Tier 3: Advanced Features (15 points base)

Students must complete **at least 2 advanced features** to earn Tier 3 points. Each feature is worth **5 points**. Students can complete **more than 2 features** for additional points beyond the 15-point base.

**Minimum requirement:** 2 features = 10 points  
**Target:** 2 features = 15 points  
**Extra credit:** 3rd+ feature = 5 points each (counts toward bonus)

---

### Option A: Performance Optimization (5 points)

**Goal:** Application remains responsive with 1000+ records

- **3 pts** - Code includes optimization techniques
  - Debouncing for search input
  - Event delegation for table interactions
  - Efficient sorting algorithms
  - Virtual scrolling or pagination
  - Memoization of expensive operations
  
- **2 pts** - Comment explains optimization strategy
  - Clear explanation of what was optimized
  - Why this approach was chosen
  - Demonstrates understanding

**Verification:**
- Check code for debounce/throttle functions
- Look for event delegation patterns
- Test with large dataset (if provided)
- Read explanatory comments

---

### Option B: Keyboard Navigation (5 points)

**Goal:** Full keyboard accessibility

**Requirements:**
- Arrow keys: Navigate table rows or headers
- Enter: Sort by focused column or activate filter
- Tab/Shift+Tab: Move between interactive elements
- Visual focus indicators

**Grading:**
- **5 pts** - All keyboard features work correctly
- **3 pts** - Partial implementation (some features work)
- **0 pts** - Doesn't work or not implemented

**Verification:**
- Tab through interface - focus visible and logical
- Arrow keys navigate effectively
- Enter activates focused element
- No keyboard traps

---

### Option C: Smart Relevance Sort (5 points)

**Goal:** Search results sorted by relevance

When filter is active, results should be ordered:
1. Exact matches (title exactly equals search)
2. Title contains search term
3. Any other field contains search term
4. Then by default sort order

**Grading:**
- **5 pts** - Relevance sorting clearly works
- **3 pts** - Partial relevance (some prioritization)
- **0 pts** - No relevance sorting

**Verification:**
- Search for exact title - it appears first
- Search for partial title - appears before other matches
- Search for actor name - appears after title matches

---

### Option D: Data Validation (5 points)

**Goal:** Identify and report suspicious data

**Requirements:**
- Console warnings for data issues:
  - Missing required fields
  - Future broadcast dates / publication years
  - Duplicate ranks or IDs
  - Negative series numbers
  - Invalid winner status values
- Display warning count in UI

**Grading:**
- **3 pts** - Console warnings present and accurate
- **2 pts** - Warning count displayed in UI

**Verification:**
- Open browser console
- Check for warnings about known bad data
- Look for UI element showing warning count

---

### Option E: Additional Filters (5 points)

**Goal:** More filtering options

**Alternative One requirements:**
- Era dropdown (Classic/Modern/Recent)
- Doctor filter (populated from data)
- Companion filter (populated from data)

**Alternative Two requirements:**
- Winner/Nominee dropdown filter
- Decade dropdown (1950s, 1960s, etc.)
- Author filter (populated from data)

**Grading:**
- **3 pts** - Primary filter implemented and works
- **2 pts** - Secondary filter implemented and works
- Filters must work together (AND logic)

---

### Option F: Multi-Column Sort (5 points)

**Goal:** Sort by multiple columns simultaneously

**Requirements:**
- Shift+click to add secondary sort levels
- Visual indicators for all sort columns
- Correct multi-level sorting behavior

**Grading:**
- **5 pts** - Multi-column sort works correctly
- **3 pts** - Partial implementation (works but has issues)
- **0 pts** - Doesn't work

**Verification:**
- Click column A to sort
- Shift+click column B - should sort by A then B
- Visual indicators show both sorts

---

### Option G: Export to CSV (5 points)

**Goal:** Export filtered results to CSV file

**Requirements:**
- Exports currently visible/filtered data
- Includes all displayed columns
- Proper CSV formatting (commas, quotes, escaping)
- Triggers download with appropriate filename

**Grading:**
- **3 pts** - Export works and produces valid CSV
- **2 pts** - Proper string escaping and formatting

**Verification:**
- Apply filters
- Click export
- Open CSV in spreadsheet app - should be valid

---

### Option H: Decade/Genre Grouping (5 points)

**Goal:** Group items by decade or genre

**Alternative One:** Group episodes by broadcast decade  
**Alternative Two:** Group books by primary genre

**Requirements:**
- Collapsible sections for each group
- Count of items per group
- Groups are logically ordered

**Grading:**
- **3 pts** - Grouping works correctly
- **2 pts** - Collapsible functionality works
- **Bonus 1 pt** - Visual polish and clear UX

---

### Option I: Custom Feature (5 points)

**Goal:** Student-proposed feature

If implementing a custom feature not listed above:
- Must include comment explaining the feature
- Must be non-trivial (not just styling changes)
- Must enhance user experience

**Grading:**
- **5 pts** - Creative, useful, well-implemented
- **3 pts** - Works but not exceptional
- **1 pt** - Present but broken or trivial

---

## Bonus Points (25+ points available)

Bonus points reward exceptional work beyond requirements. Students can earn bonus points through:

1. **Additional Advanced Features** (5 pts each)
   - Completing more than 2 advanced features from Tier 3
   - Example: Completing 4 features = 15 (Tier 3) + 10 (Bonus) = 25 pts total

2. **Exceptional Code Quality** (up to 5 pts)
   - Exceptionally clean, well-organized code
   - Comprehensive comments explaining complex logic
   - Consistent formatting throughout
   - Clear separation of concerns

3. **Outstanding UI/UX** (up to 5 pts)
   - Professional, polished design
   - Smooth animations and transitions
   - Excellent responsive design
   - Accessibility considerations (ARIA labels, etc.)

4. **Creative Problem Solving** (up to 5 pts)
   - Novel approach to requirements
   - Elegant solutions to complex problems
   - Going significantly beyond specifications

5. **Alternative Data Loading** (5 pts)
   - Using multiple JSON endpoints (alternative 2 from spec)
   - Successfully fetching and merging multiple data sources
   - Proper async handling and error management

**Note:** Bonus points are capped at a total that keeps the maximum achievable score around 125 points.

---

## Grade Boundaries

| Points Earned | Letter Grade | Description |
|---------------|--------------|-------------|
| 90-100 | A | Excellent - All requirements met plus advanced features |
| 80-89 | B | Good - All basics working, most edge cases handled |
| 70-79 | C | Passing - Core functionality works, some edge cases |
| 60-69 | D | Needs Improvement - Partial functionality, bugs present |
| 0-59 | F | Failing - Non-functional or minimal effort |

**Remember:** Your final grade is calculated as `(earned_points - deductions) / 100 × 100`, capped at 100, with a floor of 0.

---

## Negative Points and Grading Floor

### How Deductions Work

Your final score is calculated as:
```
Final Score = (Earned Points - Deductions) / 100 × 100
```

**Critical Rules:**
1. **Minimum Grade: 0** - Your grade cannot go below zero, even with massive deductions
2. **Deductions are cumulative** - Multiple issues result in multiple deductions being added together
3. **Deductions apply after earning points** - You earn points first, then deductions are subtracted from your total
4. **The 125-point buffer helps** - Extra points can absorb deductions without affecting your final grade

### Why the 125-Point System Helps with Deductions

The 125-point system provides a **25-point cushion** that can absorb deductions:

- **Scenario 1:** You earn 105 points but have -5 in deductions → (105-5)/100 × 100 = **100%**
- **Scenario 2:** You earn 90 points but have -5 in deductions → (90-5)/100 × 100 = **85%**
- **Scenario 3:** You earn 75 points with no deductions → 75/100 × 100 = **75%**

Notice that Scenario 1 got 100% despite deductions, while Scenario 2 ended up with the same 85% that someone with 90 points and -5 deductions would get. The buffer rewards effort and completeness.

### Examples of How Deductions Impact Final Grades

**Example 1: Strong Student with Minor Issues**
- Earned: 95 points (Tier 1: 60, Tier 2: 25, Tier 3: 10)
- Deductions: -5 (console errors)
- **Calculation: (95 - 5) / 100 × 100 = 90%**
- **Final Grade: 90 (A)**

**Example 2: Good Student with Multiple Issues**
- Earned: 85 points (Tier 1: 58, Tier 2: 22, Tier 3: 5)
- Deductions: -12 (-10 crash on interaction, -2 no comments)
- **Calculation: (85 - 12) / 100 × 100 = 73%**
- **Final Grade: 73 (C)**

**Example 3: Overachiever with Significant Deductions**
- Earned: 115 points (Tier 1: 60, Tier 2: 25, Tier 3: 20, Bonus: 10)
- Deductions: -15 (-10 crash on edge case, -5 missing required feature)
- **Calculation: (115 - 15) / 100 × 100 = 100%** (capped at 100)
- **Final Grade: 100 (A+)**
- *Note: The 15 extra points absorbed the deductions completely*

**Example 4: Struggling Student with Issues**
- Earned: 45 points (partial Tier 1: 40, Tier 2: 5)
- Deductions: -10 (-8 console errors, -2 poor organization)
- **Calculation: (45 - 10) / 100 × 100 = 35%**
- **Final Grade: 35 (F)**

**Example 5: Minimal Submission with Major Problems**
- Earned: 30 points (attempted basic structure)
- Deductions: -25 (-20 doesn't run at all, -5 missing files)
- **Calculation: (30 - 25) / 100 × 100 = 5%**
- **Final Grade: 5 (F)**

**Example 6: Non-Functional Submission**
- Earned: 15 points (some HTML structure visible)
- Deductions: -40 (-20 doesn't run, -15 crashes immediately, -5 console errors)
- **Calculation: (15 - 40) = -25**
- **Final Grade: 0 (F)** *(floored at zero, cannot go negative)*

### Key Takeaway

The 125-point system means:
- **With 100+ points earned:** Most deductions won't affect your final grade (still 100% = A)
- **With 90-99 points earned:** Minor deductions (-5 to -9) keep you at A; larger deductions drop you to B
- **With 80-89 points earned:** Deductions (-5 to -9) keep you at B; larger deductions drop you to C
- **With 70-79 points earned:** Deductions (-5 to -9) keep you at C; larger deductions drop you to D
- **With 60-69 points earned:** Deductions (-10+) push you to failing
- **Below 60 points earned:** You're already failing; deductions make it worse

**Pro Tip:** Focus on earning more points rather than avoiding all deductions. The buffer is your friend!

---

## Automatic Deductions

These deductions apply regardless of tier and are subtracted from your total earned points:

### Critical Issues

- **-20 pts** - Code doesn't run at all (page blank, console errors prevent execution)
- **-15 pts** - Crashes on loading the page
- **-10 pts** - Crashes on basic interaction (clicking sort, typing in filter)
- **-10 pts** - Missing required files (index.html, script.js, styles.css)
- **-10 pts** - Uses local data file (option 3) instead of fetching from URL

### Major Issues

- **-8 pts** - Console errors on page load (per unique error, max -16 total)
- **-5 pts** - Feature specified as required but missing entirely
- **-5 pts** - Significantly non-functional core feature

### Minor Issues

- **-3 pts** - Console warnings or errors during normal use
- **-2 pts** - Poor code organization (no separation, everything in one function)
- **-2 pts** - No comments explaining complex logic

### Code Quality Issues

- **-3 pts** - Use of `var` instead of `let`/`const` throughout code
- **-2 pts** - Global namespace pollution (many global variables)
- **-1 pt** - Inconsistent code formatting

### Maximum Deductions by Category

**Deduction Caps (where applicable):**
- Console errors: Maximum -16 points (capped at 2 unique errors × 8 pts each)
- Missing features: -5 points per feature (no cap, but unlikely to exceed -15)
- Code quality: Maximum -10 points total across all quality issues

**No Overall Deduction Cap:**
If you have multiple critical issues (e.g., doesn't run + crashes + missing files), deductions can exceed -50 points. However, your final grade will never go below 0.

### Deduction Examples

**Light Deductions (−5 to −10):**
- Minor console error on load: -8
- Missing comments: -2
- **Impact:** May drop one letter grade depending on base score

**Moderate Deductions (−15 to −25):**
- Crashes on interaction: -10
- Uses local file: -10
- Poor organization: -2
- **Impact:** Will drop 1-2 letter grades

**Heavy Deductions (−30+):**
- Doesn't run: -20
- Missing files: -10
- Console errors: -8
- No comments: -2
- **Impact:** Likely failing grade unless you earned 90+ points

---

## Common Pitfalls to Avoid

### ❌ Displaying Raw Data
```javascript
// BAD - shows "[object Object]"
cell.textContent = episode.doctor;

// GOOD - extracts and formats properly
cell.textContent = `${episode.doctor.actor} (${episode.doctor.incarnation})`;
```

### ❌ Not Handling Null Values
```javascript
// BAD - crashes if companion is null
cell.textContent = episode.companion.actor;

// GOOD - handles null case
cell.textContent = episode.companion 
  ? `${episode.companion.actor} (${episode.companion.character})`
  : 'No companion';
```

### ❌ Case-Sensitive Filtering
```javascript
// BAD - only finds exact case matches
if (episode.title === searchTerm)

// GOOD - case-insensitive contains
if (episode.title.toLowerCase().includes(searchTerm.toLowerCase()))
```

### ❌ Sorting By Object Instead of Value
```javascript
// BAD - sorts by object reference, not actor name
episodes.sort((a, b) => a.doctor > b.doctor ? 1 : -1);

// GOOD - extracts actor name for comparison
episodes.sort((a, b) => 
  a.doctor.actor.localeCompare(b.doctor.actor)
);
```

---

## Grading Process

### For Students

Your submission will be evaluated in this order:

1. **Automated Tests** - Basic functionality checks
2. **Manual Review** - Edge cases and advanced features
3. **Code Quality** - Organization and comments
4. **Bonus Assessment** - Exceptional work identification

You'll receive:
- Point breakdown by category
- Specific feedback on issues
- Suggestions for improvement (if applicable)

### For Instructors

**Time Estimate:** 5-7 minutes per submission with automation

1. **Run Automated Tests** (1-2 min)
   - Execute test suite
   - Note any critical failures
   - Record baseline scores

2. **Manual Testing** (2-3 min)
   - Test edge cases with provided data
   - Verify advanced features
   - Check error handling

3. **Code Review** (1-2 min)
   - Scan for code quality
   - Check for plagiarism indicators
   - Note exceptional work

4. **Scoring** (1 min)
   - Tally points from all categories
   - Apply deductions
   - Calculate final grade: (earned - deductions) / 100 × 100, capped at 100, floored at 0
   - Add brief feedback notes

---

## Examples of Grade Calculations

### Example 1: The Solid Student
- Tier 1: 58/60 (minor display issue)
- Tier 2: 22/25 (missed one edge case)
- Tier 3: 10/15 (completed 2 features fully)
- Bonus: 0
- Deductions: 0
- **Total: 90 points = Grade 90 (A)**

### Example 2: The Overachiever
- Tier 1: 60/60 (perfect)
- Tier 2: 25/25 (perfect)
- Tier 3: 25/15 (completed 5 advanced features)
- Bonus: 8 (exceptional UI + code quality)
- Deductions: 0
- **Total: 118 points = Grade 100 (A+)** *(capped)*

### Example 3: The Minimum Viable
- Tier 1: 55/60 (basics work, some bugs)
- Tier 2: 15/25 (some edge cases handled)
- Tier 3: 0/15 (no advanced features)
- Bonus: 0
- Deductions: -5 (console errors)
- **Total: (70 - 5) = 65 points = Grade 65 (D)**

### Example 4: The Specialist
- Tier 1: 60/60 (perfect basics)
- Tier 2: 18/25 (most edge cases)
- Tier 3: 5/15 (one advanced feature)
- Bonus: 20 (completed 4 bonus features)
- Deductions: -3 (minor issues)
- **Total: (103 - 3) = 100 points = Grade 100 (A+)** *(capped)*

---

## Academic Integrity

### Allowed Resources
✅ Online documentation  
✅ Stack Overflow and similar sites  
✅ AI assistants (ChatGPT, GitHub Copilot, etc.)  
✅ Course materials and notes  

### Not Allowed
❌ Copying another student's work  
❌ Sharing your code with other students  
❌ Submitting work you don't understand  

### If You Use AI/Online Resources
- You must understand the code you submit
- You'll be expected to explain your solution
- Edge cases must be properly tested
- Modify generated code to fit requirements

### Plagiarism Detection
We check for:
- Identical code between students
- Code copied verbatim from online sources
- Submissions that don't handle specified edge cases (indicates lack of testing)
- Advanced features that don't work (indicates lack of understanding)

**Penalty for Academic Dishonesty:** Zero on exam, possible further action per university policy

---

## Tips for Success

### ⭐ Start with Tier 1
Get basic functionality working first. This is 60% of your grade and must be solid.

### ⭐ Test with Real Data
Use the provided JSON files - they contain all the edge cases you need to handle.

### ⭐ Understand Your Code
If you use AI or copied examples, make sure you understand what the code does. You may be asked to explain it.

### ⭐ Handle Errors Gracefully
Never let the user see "undefined", "null", or crash the page. Always provide fallbacks.

### ⭐ Choose Your Advanced Features Wisely
Pick 2 features you can complete well rather than attempting 4 and doing them poorly.

### ⭐ Test in Multiple Browsers
Make sure your solution works in Chrome, Firefox, and Safari.

### ⭐ Use Browser DevTools
The console is your friend - check for errors regularly as you develop.

### ⭐ Time Management
- First 60 minutes: Tier 1 (basic functionality)
- Next 30 minutes: Tier 2 (edge cases)
- Final 30 minutes: Tier 3 (advanced features)

---

## FAQ

**Q: Can I get more than 100 on my final grade?**  
A: No, the final grade is capped at 100. However, earning 125 points ensures you get 100 even with deductions.

**Q: Can my grade go below zero?**  
A: No, grades are floored at 0. Even if deductions exceed your earned points, you'll receive a 0, not a negative grade.

**Q: What if I complete only 1 advanced feature?**  
A: You'll receive 5 points instead of the full 15 for Tier 3. You can make up points through bonus features or exceptional work in other tiers.

**Q: Do deductions apply before or after the 125-point calculation?**  
A: Deductions are subtracted from your earned points before dividing by 100. So: (earned - deductions) / 100 × 100.

**Q: Do I lose points for styling that's not beautiful?**  
A: No, as long as it's functional and readable. However, exceptional UI/UX can earn bonus points.

**Q: Can I use a CSS framework like Bootstrap?**  
A: Yes, CDN resources are allowed. However, you still must write the JavaScript functionality yourself.

**Q: What if the API URL is down during the exam?**  
A: Inform the instructor immediately. We'll provide an alternative or adjustment.

**Q: How much does code organization matter?**  
A: It's not explicitly graded unless it's so poor it prevents understanding. However, good organization helps you avoid bugs and can earn bonus points.

**Q: Can I use TypeScript?**  
A: Yes, but it must run in the browser (compile to JavaScript if needed). Make sure all submitted files work.

**Q: What if I find a bug in the provided data?**  
A: Handle it gracefully in your code - that's part of the exercise. Real-world data is messy.

---

## Summary

**Remember the core principle:** This exam rewards understanding and practical skills. You can:
- Use any resources including AI
- Complete requirements in any order
- Choose your own path to 100 points
- Earn points beyond 100 for exceptional work
- Absorb reasonable deductions with the 25-point buffer

**Focus on:**
- Working, reliable basic functionality
- Proper edge case handling
- Clean, understandable code
- Testing with the provided data
- Earning more points rather than avoiding all deductions

**Good luck!** 🚀
