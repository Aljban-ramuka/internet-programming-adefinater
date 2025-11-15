/**
 * Regenerate Hugo Books (Alternative 2) Breakdown Files
 * 
 * This script regenerates PR breakdown files for PRs 45-64 using the
 * correct Hugo Books test results from hugo-retest-results.csv
 */

const fs = require('fs');
const path = require('path');

// Read the Hugo retest results
const resultsPath = path.join(__dirname, 'hugo-retest-results.csv');
const resultsCSV = fs.readFileSync(resultsPath, 'utf-8');
const lines = resultsCSV.trim().split('\n');
const headers = lines[0].split(',');

// Parse CSV into objects
const results = lines.slice(1).map(line => {
  const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g).map(v => v.replace(/^"|"$/g, ''));
  return {
    pr: parseInt(values[0]),
    student: values[1],
    t1: parseInt(values[2]),
    t2: parseInt(values[3]),
    t3: parseInt(values[4]),
    total: parseInt(values[5]),
    grade: parseInt(values[6])
  };
});

// Test configurations for Hugo Books
const TIER1_TESTS = [
  { name: 'Data Loads Successfully', points: 10, tier: 1 },
  { name: 'Loading Indicator Shown', points: 3, tier: 1 },
  { name: 'All Required Columns Present', points: 15, tier: 1 },
  { name: 'Semantic HTML Structure', points: 4, tier: 1 },
  { name: 'Clicking Headers Sorts Table', points: 8, tier: 1 },
  { name: 'Toggle Ascending/Descending', points: 4, tier: 1 },
  { name: 'Sort Direction Indicator', points: 3, tier: 1 },
  { name: 'Filter Input Field Exists', points: 5, tier: 1 },
  { name: 'Filter Actually Works', points: 5, tier: 1 }
];

const TIER2_TESTS = [
  { name: 'No "undefined" or "null" Text', points: 5, tier: 2 },
  { name: 'Empty/Multiple Genres Handled', points: 3, tier: 2 },
  { name: 'Special Characters and Long Titles', points: 4, tier: 2 },
  { name: 'Error Messages User-Friendly', points: 3, tier: 2 },
  { name: 'Missing Data Fields Handled', points: 3, tier: 2 },
  { name: 'Award Extraction & Formatting', points: 5, tier: 2 },
  { name: 'Series Format Handling', points: 4, tier: 2 }
];

const TIER3_TESTS = [
  { name: 'Performance Optimization', points: 5, tier: 3 },
  { name: 'Keyboard Navigation', points: 5, tier: 3 },
  { name: 'Smart Relevance Sorting', points: 5, tier: 3 },
  { name: 'Data Validation & Warnings', points: 5, tier: 3 },
  { name: 'Enhanced Filters (Winner/Nominee, Decade, Author)', points: 5, tier: 3 },
  { name: 'Multi-Column Sorting', points: 5, tier: 3 },
  { name: 'Export to CSV', points: 5, tier: 3 },
  { name: 'Genre Grouping with Collapse', points: 5, tier: 3 }
];

// Read existing breakdown to get test pass/fail status
function getExistingTestResults(prNumber) {
  const breakdownPath = path.join(__dirname, 'student-reports', `PR-${prNumber}-breakdown.md`);
  if (!fs.existsSync(breakdownPath)) {
    return null;
  }
  
  const content = fs.readFileSync(breakdownPath, 'utf-8');
  const testResults = {};
  
  // Parse test results from markdown table
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/\| ([✅❌✨]) \| (.+?) \| \d+ \| \d+ \| (\d+) \|/);
    if (match) {
      const status = match[1];
      const testName = match[2].trim();
      const points = parseInt(match[3]);
      testResults[testName] = { status, points };
    }
  }
  
  return testResults;
}

// Generate breakdown file
function generateBreakdown(result) {
  const prNumber = result.pr;
  const existingTests = getExistingTestResults(prNumber);
  
  if (!existingTests) {
    console.log(`⚠️  PR #${prNumber}: No existing breakdown found, skipping...`);
    return;
  }
  
  // Calculate test statuses based on scores
  const tier1Max = 60;
  const tier2Max = 25;
  const tier3Max = 40;
  
  const tier1Pct = result.t1 / tier1Max;
  const tier2Pct = result.t2 / tier2Max;
  const tier3Pct = result.t3 / tier3Max;
  
  // Build test table
  let testRows = [];
  
  // Tier 1 tests
  TIER1_TESTS.forEach(test => {
    const existing = existingTests[test.name];
    const status = existing ? existing.status : '✅';
    const earned = existing ? existing.points : (status === '✅' ? test.points : 0);
    testRows.push(`| ${status} | ${test.name} | ${test.tier} | ${test.points} | ${earned} |`);
  });
  
  testRows.push(`|  | **─── TIER 1 SUBTOTAL ───** |  | ${tier1Max} | ${result.t1} |`);
  
  // Tier 2 tests
  TIER2_TESTS.forEach(test => {
    const existing = existingTests[test.name];
    const status = existing ? existing.status : '✅';
    const earned = existing ? existing.points : (status === '✅' ? test.points : 0);
    testRows.push(`| ${status} | ${test.name} | ${test.tier} | ${test.points} | ${earned} |`);
  });
  
  testRows.push(`|  | **─── TIER 2 SUBTOTAL ───** |  | ${tier2Max} | ${result.t2} |`);
  
  // Tier 3 tests
  TIER3_TESTS.forEach(test => {
    const existing = existingTests[test.name];
    const status = existing ? existing.status : '❌';
    const earned = existing ? existing.points : 0;
    testRows.push(`| ${status} | ${test.name} | ${test.tier} | ${test.points} | ${earned} |`);
  });
  
  testRows.push(`|  | **─── TIER 3 SUBTOTAL ───** |  | 15 | ${result.t3} |`);
  
  // Generate full markdown
  const breakdown = `# Grading Breakdown - PR #${prNumber}

**Student:** ${result.student}
**Student ID:** 
**GitHub:** @username
**Alternative:** Hugo Award Books

---

## Score Summary

| Category | Score | Percentage |
|----------|-------|------------|
| **Tier 1** (Basic Functionality) | ${result.t1} / 60 | ${Math.round(result.t1/60*100)}% |
| **Tier 2** (Edge Case Handling) | ${result.t2} / 25 | ${Math.round(result.t2/25*100)}% |
| **Tier 3** (Advanced Features) | ${result.t3} / 15 | ${Math.round(result.t3/15*100)}% |
| **Subtotal** | ${result.total} / 100 | |
| **Bonus Points** | +0 | |
| **Deductions** | - | |
| **Total Points** | ${result.total} / 100 | |
| **FINAL GRADE** | **${result.grade}%** | |

---

## Complete Points Breakdown

| Status | Test | Tier | Max Pts | Earned |
|--------|------|------|---------|--------|
${testRows.join('\n')}
| | | | | |
|  | **BASE SCORE** |  | 100 | ${result.total} |
| | | | | |
| **═══** | **FINAL TOTAL** | ═══ | 100 | ${result.grade} |

---

## Instructor Notes

AutoTest: ${result.grade}% | T1=${result.t1}/60 (${Math.round(result.t1/60*100)}%) | T2=${result.t2}/25 (${Math.round(result.t2/25*100)}%) | T3=${result.t3}/40 (${Math.round(result.t3/40*100)}%)

Hugo Award Books assignment tested with alternative-specific edge cases (award extraction, series formats, genre handling).

`;

  return breakdown;
}

// Process all Hugo PRs
console.log('Regenerating Hugo Books (Alternative 2) Breakdown Files\n');
console.log('='.repeat(60));

let updated = 0;
let skipped = 0;

results.forEach(result => {
  const breakdown = generateBreakdown(result);
  
  if (breakdown) {
    const outputPath = path.join(__dirname, 'student-reports', `PR-${result.pr}-breakdown.md`);
    fs.writeFileSync(outputPath, breakdown, 'utf-8');
    console.log(`✓ Updated PR-${result.pr}-breakdown.md (${result.grade}%)`);
    updated++;
  } else {
    skipped++;
  }
});

console.log('\n' + '='.repeat(60));
console.log(`✓ Complete: ${updated} files updated, ${skipped} skipped`);
