#!/usr/bin/env node

/**
 * Test Student PRs Directly from GitHub
 * 
 * This script fetches student submissions from their PRs and tests them
 * without needing to check out each PR locally.
 * 
 * SETUP:
 *   npm install playwright
 *   npx playwright install chromium
 *   
 *   Set GITHUB_TOKEN environment variable:
 *   $env:GITHUB_TOKEN="your_github_token_here"
 * 
 * USAGE:
 *   node test-prs-directly.js
 *   node test-prs-directly.js --pr=64
 *   node test-prs-directly.js --parallel=5
 *   node test-prs-directly.js --pr=16 --no-fetch    # Use existing temp files without re-fetching
 */

const { chromium } = require('playwright');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const OWNER = 'sweko';
const REPO = 'internet-programming-adefinater';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const RESULTS_FILE = path.join(__dirname, 'pr-test-results.csv');
const TEMP_DIR = path.join(__dirname, 'temp-pr-tests');
const HTTP_PORT = 8765; // Local server port for testing
const TIMEOUT = 30000;
const PARALLEL_TESTS = parseInt(process.argv.find(arg => arg.startsWith('--parallel='))?.split('=')[1]) || 1;
const SPECIFIC_PR = process.argv.find(arg => arg.startsWith('--pr='))?.split('=')[1];
const NO_FETCH = process.argv.includes('--no-fetch'); // Skip re-fetching files if temp dir exists

// Import test definitions from automated-browser-test.js
const { TESTS } = require('./automated-browser-test.js');

// Import Hugo Books specific tests
const { getHugoTests } = require('./hugo-book-tests.js');

// Alternative-specific configurations (duplicated for now, should be shared)
const ALTERNATIVE_CONFIG = {
  'alternative-one': {
    name: 'Doctor Who Episodes',
    columns: ['rank', 'title', 'series', 'era', 'broadcast', 'director', 'writer', 'doctor', 'companion', 'cast'],
    minColumnCount: 9,
    filterTestQuery: 'Doctor',
    expectedRows: 100
  },
  'alternative-two': {
    name: 'Hugo Award Books',
    columns: ['title', 'author', 'type', 'award', 'publisher', 'series', 'genres'],
    minColumnCount: 6,
    filterTestQuery: 'Foundation',
    expectedRows: 50
  }
};

/**
 * Make GitHub API request
 */
function githubRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: path,
      headers: {
        'User-Agent': 'Node.js',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    if (GITHUB_TOKEN) {
      options.headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`GitHub API error: ${res.statusCode} - ${data}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Get PR files from GitHub API
 */
async function getPRFiles(prNumber) {
  console.log(`  Fetching files for PR #${prNumber}...`);
  const files = await githubRequest(`/repos/${OWNER}/${REPO}/pulls/${prNumber}/files`);
  
  // Determine which alternative to use based on PR number
  const alternative = prNumber <= 44 ? 'alternative-one' : 'alternative-two';
  
  // We need: index.html, script.js, styles.css
  const htmlFile = files.find(f => f.filename.endsWith('index.html'));
  const jsFile = files.find(f => f.filename.endsWith('script.js') || f.filename.endsWith('.js'));
  const cssFile = files.find(f => f.filename.endsWith('styles.css') || f.filename.endsWith('.css'));

  return {
    html: htmlFile,
    js: jsFile,
    css: cssFile,
    alternative: alternative,
    allFiles: files
  };
}

/**
 * Fetch raw file content from GitHub (follows redirects)
 */
function fetchRawContent(url) {
  return new Promise((resolve, reject) => {
    const doFetch = (fetchUrl) => {
      https.get(fetchUrl, (res) => {
        // Follow redirects
        if (res.statusCode === 301 || res.statusCode === 302) {
          const redirectUrl = res.headers.location;
          console.log(`  Following redirect to: ${redirectUrl}`);
          doFetch(redirectUrl);
          return;
        }
        
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${fetchUrl}`));
          return;
        }
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    };
    
    doFetch(url);
  });
}

/**
 * Create a simple HTTP server to serve test files
 */
function createHTTPServer() {
  const server = http.createServer((req, res) => {
    // Parse URL and remove query string
    let filePath = req.url.split('?')[0];
    
    // Default to index.html
    if (filePath === '/') {
      filePath = '/index.html';
    }
    
    // Build full path
    const fullPath = path.join(TEMP_DIR, filePath);
    
    // Security: ensure path is within TEMP_DIR
    if (!fullPath.startsWith(TEMP_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    
    // Serve file
    fs.readFile(fullPath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      
      // Set content type
      const ext = path.extname(fullPath);
      const contentTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json'
      };
      
      res.writeHead(200, {
        'Content-Type': contentTypes[ext] || 'text/plain',
        'Access-Control-Allow-Origin': '*' // Allow CORS
      });
      res.end(data);
    });
  });
  
  return new Promise((resolve) => {
    server.listen(HTTP_PORT, () => {
      console.log(`HTTP server started on port ${HTTP_PORT}`);
      resolve(server);
    });
  });
}

/**
 * Create temporary test directory for a PR
 */
async function createTempPRFiles(prNumber, files) {
  const prDir = path.join(TEMP_DIR, `pr-${prNumber}`);
  
  // If --no-fetch flag is set and directory exists, skip fetching
  if (NO_FETCH && fs.existsSync(prDir)) {
    console.log(`  Skipping fetch (--no-fetch): Using existing files in ${prDir}`);
    return path.join(prDir, 'index.html');
  }
  
  // Clean up old directory if exists
  if (fs.existsSync(prDir)) {
    fs.rmSync(prDir, { recursive: true, force: true });
  }
  
  fs.mkdirSync(prDir, { recursive: true });

  // Helper to get fallback file path
  const getFallbackPath = (filename) => {
    // First try: students/{student-folder}/{filename}
    // Extract student folder from first file in PR
    if (files.allFiles.length > 0) {
      const firstFile = files.allFiles[0].filename;
      const match = firstFile.match(/^students\/([^\/]+)\//);
      if (match) {
        const studentFolder = match[1];
        const studentPath = path.join(__dirname, '..', 'students', studentFolder, filename);
        if (fs.existsSync(studentPath)) {
          console.log(`  Using student starter: ${studentFolder}/${filename}`);
          return studentPath;
        }
      }
    }
    
    // Second try: alternative folder
    const alternativePath = path.join(__dirname, '..', files.alternative, 'code', filename);
    if (fs.existsSync(alternativePath)) {
      console.log(`  Using alternative starter: ${files.alternative}/code/${filename}`);
      return alternativePath;
    }
    
    return null;
  };

  // Fetch and save HTML (or use fallback)
  if (files.html) {
    const htmlContent = await fetchRawContent(files.html.raw_url);
    fs.writeFileSync(path.join(prDir, 'index.html'), htmlContent, 'utf8');
  } else {
    const fallbackPath = getFallbackPath('index.html');
    if (fallbackPath) {
      fs.copyFileSync(fallbackPath, path.join(prDir, 'index.html'));
    } else {
      throw new Error('No HTML file in PR and no fallback found');
    }
  }

  // Fetch and save JS (or use fallback)
  if (files.js) {
    const jsContent = await fetchRawContent(files.js.raw_url);
    // Save as script.js regardless of original filename
    fs.writeFileSync(path.join(prDir, 'script.js'), jsContent, 'utf8');
  } else {
    const fallbackPath = getFallbackPath('script.js');
    if (fallbackPath) {
      fs.copyFileSync(fallbackPath, path.join(prDir, 'script.js'));
    }
    // JS is optional in fallback (student might not have changed it)
  }

  // Fetch and save CSS (or use fallback)
  if (files.css) {
    const cssContent = await fetchRawContent(files.css.raw_url);
    // Save as styles.css regardless of original filename
    fs.writeFileSync(path.join(prDir, 'styles.css'), cssContent, 'utf8');
  } else {
    const fallbackPath = getFallbackPath('styles.css');
    if (fallbackPath) {
      fs.copyFileSync(fallbackPath, path.join(prDir, 'styles.css'));
    }
    // CSS is optional in fallback
  }

  // Also copy the data file(s) if students are loading from relative paths
  const dataDir = path.join(__dirname, '..', 'data');
  if (fs.existsSync(dataDir)) {
    const dataFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
    for (const dataFile of dataFiles) {
      fs.copyFileSync(
        path.join(dataDir, dataFile),
        path.join(prDir, dataFile)
      );
    }
  }

  return path.join(prDir, 'index.html');
}

/**
 * Test a single PR
 */
async function testPR(prNumber, prData, browser) {
  // Determine which alternative based on PR number
  const alternative = prNumber <= 44 ? 'alternative-one' : 'alternative-two';
  const config = ALTERNATIVE_CONFIG[alternative];
  
  const results = {
    prNumber,
    student: prData.title || `PR #${prNumber}`,
    githubUsername: prData.user?.login || 'unknown',
    alternative: alternative,
    timestamp: new Date().toISOString(),
    tests: {},
    tier1Points: 0,
    tier2Points: 0,
    tier3Points: 0,
    totalPoints: 0,
    maxPoints: 125,
    percentageGrade: 0,
    finalGrade: 0,
    errors: []
  };

  console.log(`\n[PR #${prNumber}: ${results.student}] Testing as ${config.name}...`);

  try {
    // Get PR files
    const files = await getPRFiles(prNumber);
    const foundFiles = [
      files.html ? files.html.filename : '(fallback HTML)',
      files.js ? files.js.filename : '(fallback JS)',
      files.css ? files.css.filename : '(fallback CSS)'
    ].join(', ');
    console.log(`  Found: ${foundFiles}`);

    // Create temporary directory with PR files
    const indexPath = await createTempPRFiles(prNumber, files);
    console.log(`  Created temp files in: ${path.dirname(indexPath)}`);

    // Test in browser using HTTP server
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Use HTTP URL instead of file:/// to allow fetch() to work
    const relativePath = path.relative(TEMP_DIR, path.dirname(indexPath)).replace(/\\/g, '/');
    const testUrl = `http://localhost:${HTTP_PORT}/${relativePath}/index.html`;
    
    await page.goto(testUrl);
    
    // Select appropriate tests based on alternative
    let testsToRun = TESTS;
    
    if (config.name === 'Hugo Award Books') {
      // Use Hugo-specific tests for Alternative 2
      testsToRun = getHugoTests(TESTS);
      console.log(`  Using Hugo Books-specific tests (replaced Doctor Who Tier 2 tests)`);
    }
    
    // Run all tests (same as automated-browser-test.js)
    for (const [testKey, testConfig] of Object.entries(testsToRun)) {
      try {
        const passed = await Promise.race([
          testConfig.test(page, config),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Test timeout')), TIMEOUT)
          )
        ]);
        
        results.tests[testKey] = {
          name: testConfig.name,
          passed,
          points: passed ? testConfig.points : 0,
          maxPoints: testConfig.points
        };
        
        if (passed) {
          if (testConfig.tier === 1) results.tier1Points += testConfig.points;
          if (testConfig.tier === 2) results.tier2Points += testConfig.points;
          if (testConfig.tier === 3) results.tier3Points += testConfig.points;
          results.totalPoints += testConfig.points;
          console.log(`  ✓ ${testConfig.name} (${testConfig.points} pts) [T${testConfig.tier}]`);
        } else {
          console.log(`  ✗ ${testConfig.name} (0/${testConfig.points} pts) [T${testConfig.tier}]`);
        }
      } catch (error) {
        results.tests[testKey] = {
          name: testConfig.name,
          passed: false,
          points: 0,
          maxPoints: testConfig.points,
          tier: testConfig.tier,
          error: error.message
        };
        // Clean error message for console output
        const cleanError = error.message
          .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI escape codes
          .replace(/\n/g, ' ')             // Replace newlines with spaces
          .replace(/\r/g, '')              // Remove carriage returns
          .replace(/\s+/g, ' ')            // Collapse multiple spaces
          .trim();
        console.log(`  ⚠ ${testConfig.name} - Error: ${cleanError} [T${testConfig.tier}]`);
        results.errors.push(`${testConfig.name}: ${cleanError}`);
      }
    }
    
    results.percentageGrade = Math.round((results.totalPoints / 100) * 100);
    results.finalGrade = Math.min(results.percentageGrade, 100);
    
    console.log(`  Total Score: ${results.totalPoints}/125 pts`);
    console.log(`  Breakdown: Tier1=${results.tier1Points}/60, Tier2=${results.tier2Points}/25, Tier3=${results.tier3Points}/40`);
    console.log(`  Final Grade: ${results.finalGrade}% (capped at 100%)`);
    
    await context.close();
  } catch (error) {
    const cleanError = error.message
      .replace(/\x1b\[[0-9;]*m/g, '')
      .replace(/\n/g, ' ')
      .replace(/\r/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    console.log(`  ❌ Failed: ${cleanError}`);
    results.errors.push(`Setup error: ${cleanError}`);
  }

  return results;
}

/**
 * Generate CSV report
 */
function generateCSV(allResults) {
  // Collect all unique test keys from all results (handles both alternatives)
  const allTestKeys = new Set();
  allResults.forEach(result => {
    Object.keys(result.tests).forEach(key => allTestKeys.add(key));
  });
  const testKeys = Array.from(allTestKeys).sort();
  const testHeaders = testKeys;
  
  const headers = [
    'PR_Number',
    'Student_Name',
    'GitHub_Username',
    'Total_Points',
    'Tier1_Points',
    'Tier2_Points',
    'Tier3_Points',
    'Final_Grade',
    ...testHeaders,
    'Errors'
  ];

  const rows = allResults.map(result => {
    const testPoints = testKeys.map(testKey => {
      return result.tests[testKey]?.points || 0;
    });

    return [
      result.prNumber,
      `"${result.student}"`,
      `"${result.githubUsername}"`,
      result.totalPoints,
      result.tier1Points || 0,
      result.tier2Points || 0,
      result.tier3Points || 0,
      result.finalGrade || Math.min(result.percentageGrade, 100),
      ...testPoints,
      `"${result.errors.join('; ')}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Main execution
 */
async function main() {
  console.log('PR-Based Automated Browser Testing');
  console.log('===================================\n');

  if (!GITHUB_TOKEN) {
    console.log('⚠️  Warning: No GITHUB_TOKEN set. API rate limits apply (60 requests/hour)');
    console.log('   Set token with: $env:GITHUB_TOKEN="your_token"\n');
  }

  // Get list of PRs from pr-data.json
  const prDataPath = path.join(__dirname, 'pr-data.json');
  if (!fs.existsSync(prDataPath)) {
    console.error('❌ pr-data.json not found. Run fetch-all-prs.js first.');
    process.exit(1);
  }

  const prData = JSON.parse(fs.readFileSync(prDataPath, 'utf8'));
  let prs = prData.prs;

  if (SPECIFIC_PR) {
    prs = prs.filter(pr => pr.number === parseInt(SPECIFIC_PR));
    console.log(`Testing specific PR: #${SPECIFIC_PR}\n`);
  }

  console.log(`Found ${prs.length} PRs to test`);
  console.log(`Parallel tests: ${PARALLEL_TESTS}\n`);

  // Create temp directory
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  // Launch browser
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true }); // Headless for speed

  // Start HTTP server
  const server = await createHTTPServer();

  const allResults = [];
  
  // Run tests in batches
  for (let i = 0; i < prs.length; i += PARALLEL_TESTS) {
    const batch = prs.slice(i, i + PARALLEL_TESTS);
    const batchResults = await Promise.all(
      batch.map(pr => testPR(pr.number, pr, browser))
    );
    allResults.push(...batchResults);
  }

  await browser.close();
  
  // Stop HTTP server
  server.close();
  console.log('HTTP server stopped');

  // Clean up temp directory (optional - comment out to keep for debugging)
  // fs.rmSync(TEMP_DIR, { recursive: true, force: true });

  // Generate CSV report
  console.log('\n\nGenerating CSV report...');
  const csv = generateCSV(allResults);
  fs.writeFileSync(RESULTS_FILE, csv, 'utf8');
  console.log(`✓ Report saved to: ${RESULTS_FILE}`);

  // Summary statistics
  const avgFinalGrade = allResults.reduce((sum, r) => sum + (r.finalGrade || Math.min(r.percentageGrade, 100)), 0) / allResults.length;
  const avgTier1 = allResults.reduce((sum, r) => sum + (r.tier1Points || 0), 0) / allResults.length;
  const avgTier2 = allResults.reduce((sum, r) => sum + (r.tier2Points || 0), 0) / allResults.length;
  const avgTier3 = allResults.reduce((sum, r) => sum + (r.tier3Points || 0), 0) / allResults.length;
  const passed = allResults.filter(r => (r.finalGrade || r.percentageGrade) >= 60).length;
  const excellent = allResults.filter(r => (r.finalGrade || r.percentageGrade) >= 90).length;
  
  console.log('\n\nSummary:');
  console.log('--------');
  console.log(`Total PRs tested: ${allResults.length}`);
  console.log(`Average final grade: ${avgFinalGrade.toFixed(1)}% (capped at 100)`);
  console.log(`Average Tier 1: ${avgTier1.toFixed(1)}/60 pts (${(avgTier1/60*100).toFixed(1)}%)`);
  console.log(`Average Tier 2: ${avgTier2.toFixed(1)}/25 pts (${(avgTier2/25*100).toFixed(1)}%)`);
  console.log(`Average Tier 3: ${avgTier3.toFixed(1)}/40 pts (${(avgTier3/40*100).toFixed(1)}%)`);
  console.log(`Excellent (≥90%): ${excellent}/${allResults.length} (${Math.round(excellent/allResults.length*100)}%)`);
  console.log(`Passing (≥60%): ${passed}/${allResults.length} (${Math.round(passed/allResults.length*100)}%)`);
  console.log(`Failed (<60%): ${allResults.length - passed}/${allResults.length}`);
  
  // Tier completion rates
  console.log('\n\nTier Completion Rates:');
  console.log('---------------------');
  const tier1Strong = allResults.filter(r => (r.tier1Points || 0) >= 50).length;
  const tier2Strong = allResults.filter(r => (r.tier2Points || 0) >= 20).length;
  const tier3Features = allResults.filter(r => (r.tier3Points || 0) >= 10).length;
  console.log(`Tier 1 Strong (≥50/60): ${tier1Strong}/${allResults.length} (${Math.round(tier1Strong/allResults.length*100)}%)`);
  console.log(`Tier 2 Strong (≥20/25): ${tier2Strong}/${allResults.length} (${Math.round(tier2Strong/allResults.length*100)}%)`);
  console.log(`Tier 3 (≥2 features): ${tier3Features}/${allResults.length} (${Math.round(tier3Features/allResults.length*100)}%)`);
  
  // Test-specific stats by tier
  console.log('\n\nTest Pass Rates by Tier:');
  console.log('------------------------');
  
  console.log('\nTier 1 - Basic Functionality (60 pts):');
  Object.entries(TESTS).filter(([k, v]) => v.tier === 1).forEach(([key, config]) => {
    const passCount = allResults.filter(r => r.tests[key]?.passed).length;
    const passRate = Math.round((passCount / allResults.length) * 100);
    console.log(`  ${config.name}: ${passCount}/${allResults.length} (${passRate}%)`);
  });
  
  console.log('\nTier 2 - Edge Case Handling (25 pts):');
  Object.entries(TESTS).filter(([k, v]) => v.tier === 2).forEach(([key, config]) => {
    const passCount = allResults.filter(r => r.tests[key]?.passed).length;
    const passRate = Math.round((passCount / allResults.length) * 100);
    console.log(`  ${config.name}: ${passCount}/${allResults.length} (${passRate}%)`);
  });
  
  console.log('\nTier 3 - Advanced Features (5 pts each):');
  Object.entries(TESTS).filter(([k, v]) => v.tier === 3).forEach(([key, config]) => {
    const passCount = allResults.filter(r => r.tests[key]?.passed).length;
    const passRate = Math.round((passCount / allResults.length) * 100);
    console.log(`  ${config.name}: ${passCount}/${allResults.length} (${passRate}%)`);
  });
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { testPR };
