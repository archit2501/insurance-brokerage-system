# GitHub Push Helper Script
# After creating your GitHub repository, run this script

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  GITHUB PUSH HELPER" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Have you created a GitHub repository?" -ForegroundColor Yellow
Write-Host "If not, go to: https://github.com/new`n" -ForegroundColor White

$username = Read-Host "Enter your GitHub username"
$reponame = Read-Host "Enter repository name (default: insurance-brokerage-system)"

if ([string]::IsNullOrWhiteSpace($reponame)) {
    $reponame = "insurance-brokerage-system"
}

$repoUrl = "https://github.com/$username/$reponame.git"

Write-Host "`nRepository URL: $repoUrl" -ForegroundColor Green
Write-Host "`nConnecting to GitHub...`n" -ForegroundColor Cyan

# Add remote
try {
    git remote add origin $repoUrl
    Write-Host "✓ Remote added successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠ Remote may already exist, trying to set URL..." -ForegroundColor Yellow
    git remote set-url origin $repoUrl
    Write-Host "✓ Remote URL updated" -ForegroundColor Green
}

# Rename branch to main
Write-Host "`nRenaming branch to main..." -ForegroundColor Cyan
git branch -M main
Write-Host "✓ Branch renamed to main" -ForegroundColor Green

# Push to GitHub
Write-Host "`nPushing to GitHub..." -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "  ✅ SUCCESS! CODE PUSHED TO GITHUB" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
    
    Write-Host "Your repository:" -ForegroundColor Cyan
    Write-Host "  https://github.com/$username/$reponame`n" -ForegroundColor White
    
    Write-Host "NEXT: Deploy to Vercel" -ForegroundColor Cyan
    Write-Host "  1. Go to: https://vercel.com" -ForegroundColor White
    Write-Host "  2. Click 'New Project'" -ForegroundColor White
    Write-Host "  3. Import: $username/$reponame" -ForegroundColor White
    Write-Host "  4. Add environment variables" -ForegroundColor White
    Write-Host "  5. Deploy!`n" -ForegroundColor White
} else {
    Write-Host "`n❌ Push failed. Common issues:" -ForegroundColor Red
    Write-Host "  1. Repository doesn't exist at GitHub" -ForegroundColor Yellow
    Write-Host "  2. Wrong username or repo name" -ForegroundColor Yellow
    Write-Host "  3. Need to login: gh auth login" -ForegroundColor Yellow
    Write-Host "  4. Check: git remote -v`n" -ForegroundColor Yellow
}

Write-Host "========================================`n" -ForegroundColor Cyan
