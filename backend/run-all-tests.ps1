Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Running Phase 2 Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
node scripts/test-phase2-apis.js
$phase2Exit = $LASTEXITCODE

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Running Phase 3 Tests" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
node scripts/test-phase3-apis.js
$phase3Exit = $LASTEXITCODE

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Running Phase 4 Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
node scripts/test-phase4-apis.js
$phase4Exit = $LASTEXITCODE

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Test Summary" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Phase 2 Exit Code: $phase2Exit" -ForegroundColor $(if($phase2Exit -eq 0){"Green"}else{"Red"})
Write-Host "Phase 3 Exit Code: $phase3Exit" -ForegroundColor $(if($phase3Exit -eq 0){"Green"}else{"Red"})
Write-Host "Phase 4 Exit Code: $phase4Exit" -ForegroundColor $(if($phase4Exit -eq 0){"Green"}else{"Red"})

if ($phase2Exit -eq 0 -and $phase3Exit -eq 0 -and $phase4Exit -eq 0) {
    Write-Host "`n✅ All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n❌ Some tests failed" -ForegroundColor Red
    exit 1
}
