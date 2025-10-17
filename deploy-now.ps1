#!/usr/bin/env pwsh
# ============================================
# AUTOMATED VERCEL DEPLOYMENT
# ============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   AUTOMATED DEPLOYMENT WIZARD" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Generate secret
Write-Host "[1/6] Generating BETTER_AUTH_SECRET..." -ForegroundColor Yellow
$secret = node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
Write-Host "✅ Done`n" -ForegroundColor Green

# Get Turso credentials
Write-Host "[2/6] Getting Turso credentials..." -ForegroundColor Yellow
Write-Host "Please enter your Turso credentials (from https://turso.tech/app):`n" -ForegroundColor Gray

$tursoUrl = Read-Host "TURSO_CONNECTION_URL (libsql://...)"
Write-Host ""
$tursoToken = Read-Host "TURSO_AUTH_TOKEN (your auth token)"
Write-Host ""

# Create .env
Write-Host "[3/6] Creating .env file..." -ForegroundColor Yellow
@"
TURSO_CONNECTION_URL=$tursoUrl
TURSO_AUTH_TOKEN=$tursoToken
BETTER_AUTH_SECRET=$secret
BETTER_AUTH_URL=http://localhost:3000
NODE_ENV=development
"@ | Out-File -FilePath ".env" -Encoding utf8
Write-Host "✅ Done`n" -ForegroundColor Green

# Test local build
Write-Host "[4/6] Testing build..." -ForegroundColor Yellow
$env:TURSO_CONNECTION_URL = $tursoUrl
$env:TURSO_AUTH_TOKEN = $tursoToken
$env:BETTER_AUTH_SECRET = $secret
$env:BETTER_AUTH_URL = "http://localhost:3000"

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Build failed! Please fix errors before deploying." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build successful!`n" -ForegroundColor Green

# Push to GitHub
Write-Host "[5/6] Pushing to GitHub..." -ForegroundColor Yellow

# Set up remote if needed
$remote = git remote get-url origin 2>&1
if ($LASTEXITCODE -ne 0) {
    git remote add origin https://github.com/archit2501/insurance-brokerage-system.git
}

# Commit and push
git add .
$changes = git status --porcelain
if ($changes) {
    git commit -m "Setup deployment configuration and environment"
}

Write-Host "Pushing to GitHub..." -ForegroundColor Gray
git push -u origin main 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Pushed to GitHub!`n" -ForegroundColor Green
} else {
    Write-Host "⚠️  Push may have failed - continuing anyway`n" -ForegroundColor Yellow
}

# Deploy to Vercel
Write-Host "[6/6] Deploying to Vercel..." -ForegroundColor Yellow
Write-Host ""

# Check if Vercel CLI is installed
$vercelCmd = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelCmd) {
    Write-Host "Installing Vercel CLI globally..." -ForegroundColor Gray
    npm install -g vercel
}

Write-Host ""
Write-Host "Starting Vercel deployment..." -ForegroundColor Cyan
Write-Host "(You may be prompted to login)`n" -ForegroundColor Gray

# Create temp env file for Vercel
$vercelEnv = @"
TURSO_CONNECTION_URL=$tursoUrl
TURSO_AUTH_TOKEN=$tursoToken
BETTER_AUTH_SECRET=$secret
NODE_ENV=production
"@

# Deploy to Vercel
vercel --prod --yes `
  --env TURSO_CONNECTION_URL="$tursoUrl" `
  --env TURSO_AUTH_TOKEN="$tursoToken" `
  --env BETTER_AUTH_SECRET="$secret" `
  --env NODE_ENV="production"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   DEPLOYMENT COMPLETE! ✅" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "⚠️  FINAL STEP REQUIRED:" -ForegroundColor Yellow
Write-Host "1. Copy your Vercel URL from above" -ForegroundColor White
Write-Host "2. Go to: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "3. Select your project → Settings → Environment Variables" -ForegroundColor White
Write-Host "4. Add variable:" -ForegroundColor White
Write-Host "   Name:  BETTER_AUTH_URL" -ForegroundColor Cyan
Write-Host "   Value: https://your-app.vercel.app" -ForegroundColor Cyan
Write-Host "5. Click 'Redeploy' in Vercel Dashboard`n" -ForegroundColor White

Write-Host "Test Credentials for your deployed app:" -ForegroundColor Cyan
Write-Host "  Email:    testuser@insurancebrokerage.com" -ForegroundColor White
Write-Host "  Password: Test@123456" -ForegroundColor White
Write-Host ""
