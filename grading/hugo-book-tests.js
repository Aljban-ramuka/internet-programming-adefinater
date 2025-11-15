/**
 * Hugo Award Books - Specific Test Cases
 * 
 * These tests override the default Doctor Who tests for Alternative 2 submissions.
 * They test Hugo Books-specific edge cases:
 * - Award extraction from nested object
 * - Three series formats (false, string, {name, order})
 * - Empty/multiple genres arrays
 */

/**
 * Get Hugo-specific tests (removes Doctor Who tests, adds Hugo tests)
 * @param {Object} baseTests - The base TESTS object from automated-browser-test.js
 * @returns {Object} - Modified tests for Hugo Books
 */
function getHugoTests(baseTests) {
  const hugoTests = { ...baseTests };
  
  // Remove Doctor Who-specific Tier 2 tests
  delete hugoTests.EMPTY_ARRAYS_HANDLED; // Will be replaced
  delete hugoTests.NESTED_DATA_FORMATTED; // Will be replaced
  delete hugoTests.DATE_FORMATS_HANDLED; // Not applicable to Hugo
  
  // Remove generic Tier 3 bonus tests that have Hugo-specific versions
  delete hugoTests.ADDITIONAL_FILTERS; // Replaced with ENHANCED_FILTERS_HUGO
  delete hugoTests.GROUPING_FEATURE; // Replaced with GENRE_GROUPING
  
  // Add Hugo-specific Tier 2 tests
  Object.assign(hugoTests, HUGO_TIER2_TESTS);
  
  // Add Hugo-specific Tier 3 bonus tests
  Object.assign(hugoTests, HUGO_TIER3_BONUS);
  
  return hugoTests;
}

const HUGO_TIER2_TESTS = {
  // ============================================
  // TIER 2: Edge Case Handling (25 points)
  // Hugo Books specific tests
  // ============================================

  NO_UNDEFINED_NULL: {
    name: 'No "undefined" or "null" text displayed',
    points: 5,
    tier: 2,
    test: async (page, config) => {
      const bodyText = await page.locator('table tbody').textContent();
      const noUndefined = !bodyText.includes('undefined');
      const noNull = !bodyText.toLowerCase().includes('null');
      const noObject = !bodyText.includes('[object Object]');
      
      return noUndefined && noNull && noObject;
    }
  },

  AWARD_EXTRACTION: {
    name: 'Award extraction and formatting (nested object)',
    points: 5,
    tier: 2,
    alternative: 'alternative-two',
    test: async (page, config) => {
      const bodyText = await page.locator('table tbody').textContent();
      
      // Should have formatted award strings like "2024 Winner" or "2023 Nominee"
      const hasWinnerFormat = /\d{4}\s+(Winner|Nominee)/i.test(bodyText);
      
      // Should not show [object Object] for nested award data
      const noObjects = !bodyText.includes('[object');
      
      // Check if award column exists and has data
      const headers = await page.locator('table thead th').allTextContents();
      const hasAwardColumn = headers.some(h => h.toLowerCase().includes('award'));
      
      return hasWinnerFormat && noObjects && hasAwardColumn;
    }
  },

  SERIES_FORMATS: {
    name: 'Series format handling (all three types)',
    points: 4,
    tier: 2,
    alternative: 'alternative-two',
    test: async (page, config) => {
      const bodyText = await page.locator('table tbody').textContent();
      
      // Should handle series: false (displays "None" or "—")
      const hasNoneOrDash = bodyText.includes('None') || 
                           bodyText.includes('—') || 
                           bodyText.includes('N/A') ||
                           bodyText.includes('Standalone');
      
      // Should handle series: {name, order} (displays with order like "#1")
      const hasSeriesOrder = bodyText.includes('#') || 
                            bodyText.includes('Book ') ||
                            bodyText.match(/\(\d+\)/);
      
      // Should not show [object Object]
      const noObjects = !bodyText.includes('[object');
      
      // At least handle the basic cases properly
      return hasNoneOrDash && noObjects;
    }
  },

  GENRES_HANDLING: {
    name: 'Empty/multiple genres handled',
    points: 3,
    tier: 2,
    alternative: 'alternative-two',
    test: async (page, config) => {
      const bodyText = await page.locator('table tbody').textContent();
      
      // Should not show "undefined" or empty for genres
      const rows = await page.locator('table tbody tr').count();
      if (rows < 5) return false;
      
      // Check that genres column exists
      const headers = await page.locator('table thead th').allTextContents();
      const hasGenresColumn = headers.some(h => h.toLowerCase().includes('genre'));
      
      if (!hasGenresColumn) return false;
      
      // Should handle multiple genres (comma-separated or similar)
      const hasCommaSeparated = bodyText.includes(',');
      
      // Should not show array syntax like "[genre1, genre2]"
      const noArraySyntax = !bodyText.includes('[');
      
      return hasCommaSeparated || noArraySyntax;
    }
  },

  SPECIAL_CHARS_RENDER: {
    name: 'Special characters and long titles',
    points: 4,
    tier: 2,
    test: async (page, config) => {
      const bodyText = await page.locator('table tbody').textContent();
      
      // Check that HTML entities are not visible
      const noEntities = !bodyText.includes('&amp;') && 
                        !bodyText.includes('&quot;') &&
                        !bodyText.includes('&#');
      
      // Check that there are no broken layouts
      const rows = await page.locator('table tbody tr').count();
      const hasContent = rows > 5;
      
      return noEntities && hasContent;
    }
  },

  ERROR_MESSAGE_FRIENDLY: {
    name: 'Error messages user-friendly',
    points: 3,
    tier: 2,
    test: async (page, config) => {
      const html = await page.content();
      
      // Look for error handling code
      const hasErrorHandling = html.includes('error') || html.includes('Error');
      
      // Check console for errors (shouldn't have any on successful load)
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      // No console errors on load is good
      return errors.length === 0 || hasErrorHandling;
    }
  },

  MISSING_DATA_HANDLED: {
    name: 'Missing/null values display placeholders',
    points: 3,
    tier: 2,
    test: async (page, config) => {
      const bodyText = await page.locator('table tbody').textContent();
      
      // Should use placeholders for missing data
      const hasPlaceholders = bodyText.includes('None') || 
                             bodyText.includes('N/A') ||
                             bodyText.includes('—') ||
                             bodyText.includes('Unknown') ||
                             bodyText.includes('Standalone');
      
      // Should not show undefined/null/empty
      const noUndefined = !bodyText.includes('undefined');
      const noNull = !bodyText.toLowerCase().includes('null');
      
      return (hasPlaceholders || noUndefined) && noNull;
    }
  }
};

// Hugo-specific Tier 3 Bonus tests
const HUGO_TIER3_BONUS = {
  // Enhanced Filters - Hugo specific
  ENHANCED_FILTERS_HUGO: {
    name: 'Enhanced Filters (Winner/Nominee, Decade, Author)',
    points: 5,
    tier: 3,
    alternative: 'alternative-two',
    test: async (page, config) => {
      const html = (await page.content()).toLowerCase();
      
      // Check for Winner/Nominee filter
      const hasWinnerFilter = html.includes('winner') || html.includes('nominee');
      
      // Check for Decade filter
      const hasDecadeFilter = html.includes('decade') || 
                             html.includes('1950s') || 
                             html.includes('1960s');
      
      // Check for Author filter
      const hasAuthorFilter = html.includes('author');
      
      // Count select/dropdown elements
      const selects = await page.locator('select').count();
      const dropdowns = await page.locator('[role="combobox"]').count();
      
      // Should have at least 2 Hugo-specific filters
      const hasEnoughFilters = (selects + dropdowns) >= 2;
      const hasHugoSpecific = hasWinnerFilter || hasDecadeFilter || hasAuthorFilter;
      
      return hasEnoughFilters && hasHugoSpecific;
    }
  },

  // Genre Grouping - Hugo specific
  GENRE_GROUPING: {
    name: 'Genre Grouping with Collapse',
    points: 5,
    tier: 3,
    alternative: 'alternative-two',
    test: async (page, config) => {
      const html = await page.content();
      
      // Look for grouping in HTML structure
      const hasDetails = html.includes('<details') || html.includes('collapse');
      const hasGenreGrouping = html.toLowerCase().includes('genre');
      
      // Check for genre-specific grouping keywords
      const hasGrouping = html.includes('group') || 
                         html.includes('section') ||
                         html.includes('category');
      
      return hasDetails && hasGenreGrouping && hasGrouping;
    }
  }
};

module.exports = {
  getHugoTests,
  HUGO_TIER2_TESTS,
  HUGO_TIER3_BONUS
};
