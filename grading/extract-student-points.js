const fs = require('fs');
const path = require('path');

const studentReportsDir = path.join(__dirname, 'student-reports');
const outputDir = path.join(__dirname, 'helper-app');
const outputFile = path.join(outputDir, 'student-points.json');
const masterGradesFile = path.join(__dirname, 'master-grades.csv');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Read master grades CSV to get student names and IDs
const masterGradesContent = fs.readFileSync(masterGradesFile, 'utf8');
const lines = masterGradesContent.split('\n').filter(line => line.trim());
const headers = lines[0].split(',');

// Create lookup map by PR number
const studentInfoMap = {};
for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const prNumber = parseInt(values[0]);
    studentInfoMap[prNumber] = {
        name: values[1],
        studentId: values[2],
        github: values[4]
    };
}

// Read all markdown files
const files = fs.readdirSync(studentReportsDir).filter(f => f.endsWith('.md'));

const students = [];

files.forEach(file => {
    const content = fs.readFileSync(path.join(studentReportsDir, file), 'utf8');
    const prMatch = file.match(/PR-(\d+)-breakdown\.md/);
    if (!prMatch) return;
    
    const prNumber = parseInt(prMatch[1]);
    
    // Get student info from master grades CSV
    const studentInfo = studentInfoMap[prNumber] || {
        name: '',
        studentId: '',
        github: ''
    };
    
    // Extract scores from the table
    const tier1Match = content.match(/\| \*\*Tier 1\*\* \(Basic Functionality\) \| (\d+) \/ 60 \| (\d+)% \|/);
    const tier2Match = content.match(/\| \*\*Tier 2\*\* \(Edge Case Handling\) \| (\d+) \/ 25 \| (\d+)% \|/);
    const tier3Match = content.match(/\| \*\*Tier 3\*\* \(Advanced Features\) \| (\d+) \/ 15 \| (\d+)% \|/);
    const bonusMatch = content.match(/\| \*\*Bonus Points\*\* \| \+(\d+) \|/);
    const deductionsMatch = content.match(/\| \*\*Deductions\*\* \| -(\d+) \|/) || content.match(/\| \*\*Deductions\*\* \| - \|/);
    const totalMatch = content.match(/\| \*\*Total Points\*\* \| (\d+) \/ 100 \|/);
    const gradeMatch = content.match(/\| \*\*FINAL GRADE\*\* \| \*\*(\d+)%+\*\* \|/);
    
    // Extract individual test results
    const tests = {};
    const breakdownSection = content.split('## Complete Points Breakdown')[1];
    
    if (breakdownSection) {
        const lines = breakdownSection.split(/\r?\n/);  // Handle both \n and \r\n
        
        for (const line of lines) {
            // Match table rows: | Status | Test | Tier | Max Pts | Earned |
            const trimmedLine = line.trim();
            const match = trimmedLine.match(/^\| (.+?) \| (.+?) \| (.+?) \| (.+?) \| (.+?) \|$/);
            
            if (match) {
                const [, statusRaw, testName, tierRaw, maxPtsRaw, earnedRaw] = match;
                const status = statusRaw.trim();
                const name = testName.trim();
                const tier = tierRaw.trim();
                const maxPts = maxPtsRaw.trim();
                const earned = earnedRaw.trim();
                
                // Skip header, separator, and summary rows
                if (name === 'Test' || name.includes('---') || name.includes('SUBTOTAL') || 
                    name.includes('BASE SCORE') || name.includes('TOTAL') || name.includes('═══')) {
                    continue;
                }
                
                // Map emoji status to string
                let statusStr = 'unknown';
                if (status === '✅') statusStr = 'pass';
                else if (status === '❌') statusStr = 'fail';
                else if (status === '✨') statusStr = 'bonus';
                
                tests[name] = {
                    status: statusStr,
                    tier: tier && !isNaN(parseInt(tier)) ? parseInt(tier) : null,
                    maxPoints: parseInt(maxPts) || 0,
                    earned: parseInt(earned) || 0
                };
            }
        }
    }
    
    const student = {
        pr: prNumber,
        name: studentInfo.name,
        studentId: studentInfo.studentId,
        github: studentInfo.github,
        scores: {
            tier1: tier1Match ? parseInt(tier1Match[1]) : 0,
            tier1Percentage: tier1Match ? parseInt(tier1Match[2]) : 0,
            tier2: tier2Match ? parseInt(tier2Match[1]) : 0,
            tier2Percentage: tier2Match ? parseInt(tier2Match[2]) : 0,
            tier3: tier3Match ? parseInt(tier3Match[1]) : 0,
            tier3Percentage: tier3Match ? parseInt(tier3Match[2]) : 0,
            bonus: bonusMatch ? parseInt(bonusMatch[1]) : 0,
            deductions: deductionsMatch && deductionsMatch[1] ? parseInt(deductionsMatch[1]) : 0,
            total: totalMatch ? parseInt(totalMatch[1]) : 0,
            finalGrade: gradeMatch ? parseInt(gradeMatch[1]) : 0
        },
        tests: tests
    };
    
    students.push(student);
});

// Sort by PR number
students.sort((a, b) => a.pr - b.pr);

// Write to file
fs.writeFileSync(outputFile, JSON.stringify(students, null, 2));

console.log(` Created student-points.json with ${students.length} students`);
console.log(`   Saved to: ${outputFile}`);
