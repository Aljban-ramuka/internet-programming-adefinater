/**
 * Batch test Alternative 2 (Hugo Books) PRs and save results
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const results = [];
const prsToTest = [];
for (let i = 45; i <= 64; i++) {
  prsToTest.push(i);
}

let currentIndex = 0;

function testNext() {
  if (currentIndex >= prsToTest.length) {
    // All done - save results
    const csvContent = [
      'PR,Student,T1,T2,T3,Total,Grade',
      ...results.map(r => `${r.pr},"${r.student}",${r.t1},${r.t2},${r.t3},${r.total},${r.grade}`)
    ].join('\n');
    
    fs.writeFileSync(path.join(__dirname, 'hugo-retest-results.csv'), csvContent);
    console.log('\n✓ All testing complete!');
    console.log(`✓ Results saved to: hugo-retest-results.csv`);
    process.exit(0);
    return;
  }
  
  const pr = prsToTest[currentIndex];
  console.log(`\nTesting PR #${pr} (${currentIndex + 1}/${prsToTest.length})...`);
  
  exec(`node test-prs-directly.js --pr=${pr}`, { cwd: __dirname }, (error, stdout, stderr) => {
    const output = stdout + stderr;
    
    // Parse results
    const result = { pr, student: '', t1: 0, t2: 0, t3: 0, total: 0, grade: 0 };
    
    const studentMatch = output.match(/\[PR #\d+: ([^\]]+)\]/);
    if (studentMatch) result.student = studentMatch[1];
    
    const tierMatch = output.match(/Tier1=(\d+)\/\d+, Tier2=(\d+)\/\d+, Tier3=(\d+)\/\d+/);
    if (tierMatch) {
      result.t1 = parseInt(tierMatch[1]);
      result.t2 = parseInt(tierMatch[2]);
      result.t3 = parseInt(tierMatch[3]);
    }
    
    const totalMatch = output.match(/Total Score: (\d+)\/\d+ pts/);
    if (totalMatch) result.total = parseInt(totalMatch[1]);
    
    const gradeMatch = output.match(/Final Grade: (\d+)%/);
    if (gradeMatch) result.grade = parseInt(gradeMatch[1]);
    
    console.log(`  ✓ PR #${pr}: ${result.grade}% (T1=${result.t1}, T2=${result.t2}, T3=${result.t3})`);
    
    results.push(result);
    currentIndex++;
    
    // Test next after a short delay
    setTimeout(testNext, 100);
  });
}

console.log('Batch Testing Alternative 2 (Hugo Books) PRs: 45-64');
console.log('='.repeat(60));
testNext();
