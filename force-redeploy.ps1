# Force Vercel Redeploy
# This script creates a timestamp file to force Vercel to redeploy

Write-Host "Creating timestamp to force Vercel redeploy..." -ForegroundColor Cyan

# Create a timestamp file
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Set-Content -Path "VERCEL_DEPLOY_TIMESTAMP.txt" -Value "Last deploy: $timestamp"

# Add and commit
git add VERCEL_DEPLOY_TIMESTAMP.txt
git commit -m "Force redeploy - $timestamp"
git push origin main

Write-Host "Pushed to GitHub. Vercel will automatically redeploy." -ForegroundColor Green
Write-Host "Check status at: https://vercel.com/archits-projects-db934b50/mutual_insurance_broker" -ForegroundColor Cyan
