# Phase 2 Test Runner
Write-Host "Starting Phase 2 API Tests..." -ForegroundColor Cyan
Write-Host ""

# Wait for server to be ready
Start-Sleep -Seconds 2

# Run tests and capture output
node scripts/test-phase2-apis.js

# Capture exit code
$exitCode = $LASTEXITCODE

# Display result
Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "Phase 2 Tests PASSED!" -ForegroundColor Green
} else {
    Write-Host "Phase 2 Tests FAILED!" -ForegroundColor Red
}

exit $exitCode
