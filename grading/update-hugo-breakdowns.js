/**
 * Update Alternative 2 (Hugo Books) PR breakdown files
 * 
 * This script updates the test names in breakdown files for PRs 45-64
 * from Doctor Who tests to Hugo Books tests.
 */

const fs = require('fs');
const path = require('path');

// Mapping of old test names to new test names for Hugo Books
const TEST_NAME_MAPPING = {
  // These stay the same
  'Data Loads Successfully': 'Data Loads Successfully',
  'Loading Indicator Shown': 'Loading Indicator Shown',
  'All Required Columns Present': 'All Required Columns Present',
  'Semantic HTML Structure': 'Semantic HTML Structure',
  'Clicking Headers Sorts Table': 'Clicking Headers Sorts Table',
  'Toggle Ascending/Descending': 'Toggle Ascending/Descending',
  'Sort Direction Indicator': 'Sort Direction Indicator',
  'Filter Input Field Exists': 'Filter Input Field Exists',
  'Filter Actually Works': 'Filter Actually Works',
  'No "undefined" or "null" Text': 'No "undefined" or "null" Text',
  'Error Messages User-Friendly': 'Error Messages User-Friendly',
  'Missing Data Fields Handled': 'Missing Data Fields Handled',
  
  // These change for Hugo Books
  'Empty Arrays Handled Gracefully': 'Empty/Multiple Genres Handled',
  'Special Characters Render Correctly': 'Special Characters and Long Titles',
  'Nested Data Properly Formatted': 'Award Extraction & Formatting',
  'Multiple Date Formats Sorted': 'Series Format Handling',
  
  // Tier 3 (same for both)
  'Performance Optimization': 'Performance Optimization',
  'Keyboard Navigation': 'Keyboard Navigation',
  'Smart Relevance Sorting': 'Smart Relevance Sorting',
  'Data Validation & Warnings': 'Data Validation & Warnings',
  'Additional Filters': 'Additional Filters',
  'Multi-Column Sorting': 'Multi-Column Sorting',
  'Export to CSV': 'Export to CSV',
  'Grouping/Decade Display': 'Grouping/Decade Display'
};

// Update "Alternative: Doctor Who" to "Alternative: Hugo Award Books"
const ALTERNATIVE_REPLACEMENT = {
  from: '**Alternative:** Doctor Who',
  to: '**Alternative:** Hugo Award Books'
};

// Process PRs 45-64
for (let pr = 45; pr <= 64; pr++) {
  const filePath = path.join(__dirname, 'student-reports', `PR-${pr}-breakdown.md`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  PR-${pr}-breakdown.md not found, skipping...`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // Update alternative name
  if (content.includes(ALTERNATIVE_REPLACEMENT.from)) {
    content = content.replace(ALTERNATIVE_REPLACEMENT.from, ALTERNATIVE_REPLACEMENT.to);
    modified = true;
  }
  
  // Update test names in the table
  for (const [oldName, newName] of Object.entries(TEST_NAME_MAPPING)) {
    if (oldName !== newName && content.includes(oldName)) {
      // Be careful to only replace in the test name column
      content = content.replace(
        new RegExp(`\\| ([✅❌✨]) \\| ${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\|`, 'g'),
        `| $1 | ${newName} |`
      );
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Updated PR-${pr}-breakdown.md`);
  } else {
    console.log(`  PR-${pr}-breakdown.md - no changes needed`);
  }
}

console.log('\n✓ Completed updating Hugo Books breakdown files');
