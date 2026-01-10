# PowerShell script to reset the PDP database and seed reference data
# Uses staged reset to avoid timeouts

$ErrorActionPreference = "Stop"

Write-Host "🔄 Resetting PDP database (staged approach)..." -ForegroundColor Yellow

# Navigate to the PDP backend folder
$backendPath = Join-Path $PSScriptRoot "..\..\..\..\packages\backend"

if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Backend path not found: $backendPath" -ForegroundColor Red
    exit 1
}

Push-Location $backendPath

try {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Stage 1: Deleting application data..." -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    npx convex run scripts/stagedReset:stage1AppData '{"confirm": true}'
    if ($LASTEXITCODE -ne 0) { throw "Stage 1 failed" }

    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Stage 2: Deleting reference data..." -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    npx convex run scripts/stagedReset:stage2ReferenceData '{"confirm": true}'
    if ($LASTEXITCODE -ne 0) { throw "Stage 2 failed" }

    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Stage 3: Deleting Better Auth tables..." -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan

    # Delete each Better Auth table (order matters - delete dependent tables first)
    $models = @("session", "teamMember", "invitation", "member", "team", "account", "verification", "organization", "user")

    foreach ($model in $models) {
        Write-Host "Deleting $model records..." -ForegroundColor White
        
        # Delete in batches - run 10 times max per model to avoid infinite loops
        for ($i = 1; $i -le 10; $i++) {
            $jsonArg = "{`"model`": `"$model`", `"confirm`": true}"
            $result = npx convex run scripts/stagedReset:stage3BetterAuthBatch $jsonArg 2>&1 | Out-String
            
            # Extract deleted count using regex
            if ($result -match '"deleted":\s*(\d+)') {
                $deletedCount = [int]$Matches[1]
            } else {
                $deletedCount = 0
            }
            
            Write-Host "  Batch $i`: deleted $deletedCount" -ForegroundColor Gray
            
            # If no records deleted, move to next model
            if ($deletedCount -eq 0) {
                Write-Host "  ✅ $model complete" -ForegroundColor Green
                break
            }
        }
    }

    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Stage 4: Seeding reference data..." -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    npx convex run models/referenceData:seedAllReferenceData
    if ($LASTEXITCODE -ne 0) { throw "Seeding failed" }

    Write-Host ""
    Write-Host "🎉 Database reset and seed complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now run the UAT tests with:" -ForegroundColor Cyan
    Write-Host "  cd apps/web" -ForegroundColor White
    Write-Host "  npm run test:setup" -ForegroundColor White
}
catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
}
