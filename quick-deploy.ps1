#!/usr/bin/env pwsh
# ============================================
# QUICK DEPLOY TO VERCEL
# ============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   INSURANCE BROKERAGE - VERCEL DEPLOY" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Generate BETTER_AUTH_SECRET
Write-Host "Step 1/5: Generating BETTER_AUTH_SECRET..." -ForegroundColor Yellow
$secret = node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
Write-Host "✅ Generated secure secret!" -ForegroundColor Green
Write-Host ""

# Step 2: Get Turso credentials
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 2/5: TURSO DATABASE CREDENTIALS" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Please provide your Turso credentials:" -ForegroundColor White
Write-Host "(Go to https://turso.tech/app to find them)`n" -ForegroundColor Gray

$tursoUrl = Read-Host "Enter TURSO_CONNECTION_URL (libsql://...)"
$tursoToken = Read-Host "Enter TURSO_AUTH_TOKEN"

Write-Host ""

# Step 3: Create .env file
Write-Host "Step 3/5: Creating .env file..." -ForegroundColor Yellow

$envContent = @"
# Environment Variables - Generated $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# DO NOT commit this file!

TURSO_CONNECTION_URL=$tursoUrl
TURSO_AUTH_TOKEN=$tursoToken
BETTER_AUTH_SECRET=$secret
BETTER_AUTH_URL=http://localhost:3000
NODE_ENV=development
"@

$envContent | Out-File -FilePath ".env" -Encoding utf8
Write-Host "✅ .env file created!" -ForegroundColor Green
Write-Host ""

# Step 4: Push to GitHub
Write-Host "Step 4/5: Pushing to GitHub..." -ForegroundColor Yellow

# Check if remote exists
$remoteExists = git remote get-url origin 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Setting up GitHub remote..." -ForegroundColor Gray
    git remote add origin https://github.com/archit2501/insurance-brokerage-system.git
}

# Add new files and commit
git add .
$hasChanges = git status --porcelain
if ($hasChanges) {
    git commit -m "Add environment setup scripts and deployment configurations"
    Write-Host "✅ Changes committed!" -ForegroundColor Green
} else {
    Write-Host "✅ No new changes to commit" -ForegroundColor Green
}

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Gray
git push -u origin main
Write-Host "✅ Pushed to GitHub!" -ForegroundColor Green
Write-Host ""

# Step 5: Deploy to Vercel
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 5/5: DEPLOYING TO VERCEL" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Checking for Vercel CLI..." -ForegroundColor Gray
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
    Write-Host "✅ Vercel CLI installed!" -ForegroundColor Green
}

Write-Host "`nDeploying to Vercel..." -ForegroundColor Yellow
Write-Host "(You'll be prompted to login if not already logged in)`n" -ForegroundColor Gray

# Deploy with environment variables
vercel --prod `
  -e TURSO_CONNECTION_URL="$tursoUrl" `
  -e TURSO_AUTH_TOKEN="$tursoToken" `
  -e BETTER_AUTH_SECRET="$secret" `
  -e NODE_ENV="production"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "`n⚠️  IMPORTANT: Update BETTER_AUTH_URL" -ForegroundColor Yellow
Write-Host "After deployment, you need to:" -ForegroundColor White
Write-Host "1. Copy your Vercel deployment URL" -ForegroundColor Gray
Write-Host "2. Go to Vercel Dashboard → Settings → Environment Variables" -ForegroundColor Gray
Write-Host "3. Add: BETTER_AUTH_URL = https://your-app.vercel.app" -ForegroundColor Gray
Write-Host "4. Redeploy the app" -ForegroundColor Gray
Write-Host ""

Write-Host "Test Credentials:" -ForegroundColor Cyan
Write-Host "  Email:    testuser@insurancebrokerage.com" -ForegroundColor White
Write-Host "  Password: Test@123456" -ForegroundColor White
Write-Host ""
