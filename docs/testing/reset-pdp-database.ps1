# PowerShell script to reset the PDP database and seed reference data
# Run this script from C:\code\WorkingFolder

Write-Host "🔄 Resetting PDP database..." -ForegroundColor Yellow

# Navigate to the PDP backend folder
$backendPath = "C:\code\PDP\packages\backend"

if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Backend path not found: $backendPath" -ForegroundColor Red
    exit 1
}

Push-Location $backendPath

try {
    # Step 1: Full database reset (deletes ALL data)
    Write-Host "Step 1/2: Running full reset..." -ForegroundColor Cyan
    npx convex run scripts/fullReset:fullReset '{"confirmNuclearDelete": true}'

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Database reset failed!" -ForegroundColor Red
        exit 1
    }

    Write-Host "✅ Database reset complete" -ForegroundColor Green

    # Step 2: Seed reference data (sports, skills, etc.)
    Write-Host "Step 2/2: Seeding reference data..." -ForegroundColor Cyan
    npx convex run models/referenceData:seedAllReferenceData

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Reference data seeding failed!" -ForegroundColor Red
        exit 1
    }

    Write-Host "✅ Reference data seeded" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Database reset and seed complete!" -ForegroundColor Green
    Write-Host "You can now run the UAT tests with:" -ForegroundColor Cyan
    Write-Host "  cd C:\code\PDP" -ForegroundColor White
    Write-Host "  npx playwright test setup.spec.ts --headed" -ForegroundColor White
}
finally {
    Pop-Location
}
