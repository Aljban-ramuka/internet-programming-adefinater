# Test all Alternative 2 (Hugo Books) PRs: 45-64

Write-Host "Testing Alternative 2 (Hugo Books) PRs: 45-64" -ForegroundColor Cyan
Write-Host "=" * 60

$startTime = Get-Date

for ($pr = 45; $pr -le 64; $pr++) {
    Write-Host "`nTesting PR #$pr..." -ForegroundColor Yellow
    
    try {
        # Run the test
        $output = & node test-prs-directly.js --pr=$pr 2>&1 | Out-String
        
        # Extract key info
        if ($output -match "Total Score: (\d+)/\d+ pts") {
            $score = $matches[1]
        }
        if ($output -match "Final Grade: (\d+)%") {
            $grade = $matches[1]
        }
        if ($output -match "Tier1=(\d+)/\d+, Tier2=(\d+)/\d+, Tier3=(\d+)/\d+") {
            $t1 = $matches[1]
            $t2 = $matches[2]
            $t3 = $matches[3]
        }
        
        Write-Host "  Success PR #$pr - ${grade}% (T1=$t1, T2=$t2, T3=$t3)" -ForegroundColor Green
    }
    catch {
        Write-Host "  Error PR #$pr - $($_.Exception.Message)" -ForegroundColor Red
    }
}

$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host "`n" + ("=" * 60)
Write-Host "Testing completed in $($duration.TotalMinutes.ToString('F1')) minutes" -ForegroundColor Cyan
Write-Host "Results saved to: pr-test-results.csv" -ForegroundColor Cyan
