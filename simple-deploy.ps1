#!/usr/bin/env pwsh
# ============================================
# SIMPLE VERCEL DEPLOYMENT
# ============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   VERCEL DEPLOYMENT WIZARD" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Generate secret
Write-Host "[1/4] Generating BETTER_AUTH_SECRET..." -ForegroundColor Yellow
try {
    $secret = node -e "console.log(require('crypto').randomBytes(48).toString('base64'))" 2>&1 | Select-Object -Last 1
    if ([string]::IsNullOrWhiteSpace($secret)) {
        throw "Failed to generate secret"
    }
    Write-Host "✅ Generated: $($secret.Substring(0,20))..." -ForegroundColor Green
} catch {
    Write-Host "❌ Error generating secret: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Get Turso credentials
Write-Host "[2/4] Turso Credentials" -ForegroundColor Yellow
Write-Host "Get these from: https://turso.tech/app`n" -ForegroundColor Gray

$tursoUrl = Read-Host "Enter TURSO_CONNECTION_URL (libsql://...)"
if ([string]::IsNullOrWhiteSpace($tursoUrl)) {
    Write-Host "❌ TURSO_CONNECTION_URL is required!" -ForegroundColor Red
    exit 1
}

Write-Host ""
$tursoToken = Read-Host "Enter TURSO_AUTH_TOKEN"
if ([string]::IsNullOrWhiteSpace($tursoToken)) {
    Write-Host "❌ TURSO_AUTH_TOKEN is required!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Credentials received" -ForegroundColor Green
Write-Host ""

# Step 3: Create .env file
Write-Host "[3/4] Creating .env file..." -ForegroundColor Yellow
try {
    $envContent = @"
TURSO_CONNECTION_URL=$tursoUrl
TURSO_AUTH_TOKEN=$tursoToken
BETTER_AUTH_SECRET=$secret
BETTER_AUTH_URL=http://localhost:3000
NODE_ENV=development
"@
    $envContent | Out-File -FilePath ".env" -Encoding utf8 -Force
    Write-Host "✅ .env file created" -ForegroundColor Green
} catch {
    Write-Host "❌ Error creating .env: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Deploy to Vercel
Write-Host "[4/4] Deploying to Vercel..." -ForegroundColor Yellow
Write-Host ""

# Check if Vercel CLI is installed
$vercelCmd = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelCmd) {
    Write-Host "Vercel CLI not found. Installing..." -ForegroundColor Gray
    Write-Host "(This may take a minute)`n" -ForegroundColor Gray
    npm install -g vercel
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install Vercel CLI" -ForegroundColor Red
        Write-Host "Try manually: npm install -g vercel" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "Starting Vercel deployment..." -ForegroundColor Cyan
Write-Host "(You'll be prompted to login if needed)`n" -ForegroundColor Gray

# Set environment variables for this session
$env:TURSO_CONNECTION_URL = $tursoUrl
$env:TURSO_AUTH_TOKEN = $tursoToken
$env:BETTER_AUTH_SECRET = $secret
$env:NODE_ENV = "production"

# Deploy with Vercel CLI
Write-Host "Running: vercel --prod`n" -ForegroundColor Gray
vercel --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   DEPLOYMENT SUCCESSFUL! ✅" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
    
    Write-Host "⚠️  IMPORTANT - Final Step:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Copy your Vercel URL from above" -ForegroundColor White
    Write-Host "2. Go to: https://vercel.com/dashboard" -ForegroundColor White
    Write-Host "3. Select your project → Settings → Environment Variables" -ForegroundColor White
    Write-Host "4. Add these variables:" -ForegroundColor White
    Write-Host ""
    Write-Host "   TURSO_CONNECTION_URL = $tursoUrl" -ForegroundColor Cyan
    Write-Host "   TURSO_AUTH_TOKEN = [your token]" -ForegroundColor Cyan
    Write-Host "   BETTER_AUTH_SECRET = [generated secret]" -ForegroundColor Cyan
    Write-Host "   BETTER_AUTH_URL = https://your-app.vercel.app" -ForegroundColor Cyan
    Write-Host "   NODE_ENV = production" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "5. Click 'Redeploy'`n" -ForegroundColor White
    
    Write-Host "Test Credentials:" -ForegroundColor Cyan
    Write-Host "  Email:    testuser@insurancebrokerage.com" -ForegroundColor White
    Write-Host "  Password: Test@123456" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Deploy via Vercel Dashboard" -ForegroundColor Yellow
    Write-Host "1. Go to: https://vercel.com/new" -ForegroundColor White
    Write-Host "2. Import: archit2501/insurance-brokerage-system" -ForegroundColor White
    Write-Host "3. Add environment variables (see .env file)" -ForegroundColor White
    Write-Host "4. Deploy" -ForegroundColor White
    Write-Host ""
    exit 1
}
