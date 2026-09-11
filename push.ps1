param (
    [string]$Message = "feat: automated update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    [string]$Branch = "main"
)

Write-Host ""
Write-Host "[1/3] Checking Git working tree..." -ForegroundColor Cyan

$status = git status --porcelain
if ($status) {
    Write-Host "[2/3] Changes detected. Staging all files..." -ForegroundColor Yellow
    git add -A

    Write-Host "Committing with message: $Message" -ForegroundColor Yellow
    git commit -m "$Message"
} else {
    Write-Host "Working tree clean (no new local changes to commit)." -ForegroundColor Green
}

Write-Host "[3/3] Pushing to origin/$Branch..." -ForegroundColor Cyan
git push origin $Branch

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Successfully pushed to GitHub ($Branch)!" -ForegroundColor Green
    Write-Host "Automated deployments on Render and Vercel have been triggered." -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Failed to push changes. Check git output above." -ForegroundColor Red
    Write-Host ""
}
