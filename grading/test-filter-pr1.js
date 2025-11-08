const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

async function testFilter() {
    const PORT = 8766;
    const testDir = path.join(__dirname, 'temp-pr-tests', 'pr-1');
    
    // Start HTTP server
    const server = http.createServer((req, res) => {
        const filePath = path.join(testDir, req.url === '/' ? 'index.html' : req.url);
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            const ext = path.extname(filePath);
            const contentType = ext === '.html' ? 'text/html' :
                               ext === '.js' ? 'text/javascript' :
                               ext === '.css' ? 'text/css' : 'text/plain';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    });
    
    server.listen(PORT);
    console.log(`Server started on port ${PORT}`);
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    await page.goto(`http://localhost:${PORT}`);
    
    // Wait for table to load
    await page.waitForSelector('table tbody tr', { timeout: 30000 });
    
    const rowsBefore = await page.locator('table tbody tr').count();
    console.log(`Rows before filter: ${rowsBefore}`);
    
    // Find the search input
    const filterInput = page.locator('input[type="text"]').first();
    console.log(`Filter input found: ${await filterInput.count()}`);
    
    // Type search query
    await filterInput.fill('Doctor');
    console.log('Filled with "Doctor"');
    
    await page.waitForTimeout(2000);
    
    const rowsAfter = await page.locator('table tbody tr').count();
    console.log(`Rows after filter: ${rowsAfter}`);
    
    console.log(`Filter works: ${rowsAfter < rowsBefore && rowsAfter > 0}`);
    
    await page.pause();
    
    await browser.close();
    server.close();
}

testFilter().catch(console.error);
