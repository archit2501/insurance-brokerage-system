# Add environment variables and deploy
# The Vercel project is now linked!

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  FINALIZING DEPLOYMENT" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Project linked successfully!" -ForegroundColor Green
Write-Host "Now deploying with environment variables...`n" -ForegroundColor White

# Load .env to get the values
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            $key = $matches[1]
            $value = $matches[2]
            Set-Item -Path "env:$key" -Value $value
        }
    }
}

Write-Host "Deploying to production..." -ForegroundColor Yellow
Write-Host ""

vercel --prod --yes

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
    
    Write-Host "FINAL STEP:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://vercel.com/dashboard" -ForegroundColor White
    Write-Host "2. Select: mutual_insurance_broker" -ForegroundColor White
    Write-Host "3. Go to: Settings > Environment Variables" -ForegroundColor White
    Write-Host "4. Add all variables from your .env file" -ForegroundColor White
    Write-Host "5. Update BETTER_AUTH_URL to your Vercel URL" -ForegroundColor White
    Write-Host "6. Redeploy`n" -ForegroundColor White
    
    Write-Host "Test your app with:" -ForegroundColor Cyan
    Write-Host "  Email:    testuser@insurancebrokerage.com" -ForegroundColor White
    Write-Host "  Password: Test@123456`n" -ForegroundColor White
} else {
    Write-Host "Deployment needs environment variables!" -ForegroundColor Yellow
    Write-Host "Add them via Vercel Dashboard: https://vercel.com/dashboard`n" -ForegroundColor White
}
