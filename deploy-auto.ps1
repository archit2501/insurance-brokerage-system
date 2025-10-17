# ============================================
# FULLY AUTOMATED DEPLOYMENT TO VERCEL
# ============================================

$ErrorActionPreference = "Continue"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  AUTOMATED VERCEL DEPLOYMENT" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "This script automates everything!" -ForegroundColor Green
Write-Host "You just provide Turso credentials.`n" -ForegroundColor White

# Step 1: Get Turso credentials
Write-Host "[1/5] Get Turso Credentials" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Get these from: https://turso.tech/app`n" -ForegroundColor Gray

$tursoUrl = Read-Host "Enter TURSO_CONNECTION_URL (libsql://...)"
if ([string]::IsNullOrWhiteSpace($tursoUrl)) {
    Write-Host "`nError: TURSO_CONNECTION_URL is required!" -ForegroundColor Red
    exit 1
}

Write-Host ""
$tursoToken = Read-Host "Enter TURSO_AUTH_TOKEN"
if ([string]::IsNullOrWhiteSpace($tursoToken)) {
    Write-Host "`nError: TURSO_AUTH_TOKEN is required!" -ForegroundColor Red
    exit 1
}

Write-Host "`nCredentials received!`n" -ForegroundColor Green

# Step 2: Generate secrets
Write-Host "[2/5] Generating Secrets..." -ForegroundColor Yellow

try {
    $secret = node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
    $secret = $secret.Trim()
    Write-Host "Secret generated!`n" -ForegroundColor Green
} catch {
    Write-Host "Error generating secret: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Create .env file
Write-Host "[3/5] Creating .env File..." -ForegroundColor Yellow

$envContent = @"
TURSO_CONNECTION_URL=$tursoUrl
TURSO_AUTH_TOKEN=$tursoToken
BETTER_AUTH_SECRET=$secret
BETTER_AUTH_URL=http://localhost:3000
NODE_ENV=development
"@

$envContent | Out-File -FilePath ".env" -Encoding ASCII
Write-Host ".env file created!`n" -ForegroundColor Green

# Step 4: Check/Install Vercel CLI
Write-Host "[4/5] Setting Up Vercel CLI..." -ForegroundColor Yellow

$vercelCmd = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelCmd) {
    Write-Host "Installing Vercel CLI (may take 30-60 seconds)..." -ForegroundColor Gray
    npm install -g vercel
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install Vercel CLI" -ForegroundColor Red
        Write-Host "Try manually: npm install -g vercel" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "Vercel CLI installed!`n" -ForegroundColor Green
} else {
    Write-Host "Vercel CLI already installed!`n" -ForegroundColor Green
}

# Step 5: Deploy to Vercel
Write-Host "[5/5] Deploying to Vercel..." -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Starting deployment..." -ForegroundColor White
Write-Host "(You may need to login to Vercel)`n" -ForegroundColor Gray

# Set environment variables
$env:TURSO_CONNECTION_URL = $tursoUrl
$env:TURSO_AUTH_TOKEN = $tursoToken
$env:BETTER_AUTH_SECRET = $secret
$env:NODE_ENV = "production"

Write-Host "Running: vercel --prod`n" -ForegroundColor Gray
vercel --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
    
    Write-Host "IMPORTANT - Final Step:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Copy your Vercel URL from above" -ForegroundColor White
    Write-Host "2. Go to: https://vercel.com/dashboard" -ForegroundColor White
    Write-Host "3. Select your project > Settings > Environment Variables" -ForegroundColor White
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
    Write-Host "  Password: Test@123456`n" -ForegroundColor White
    
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Your app is LIVE!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Deployment failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Deploy via Vercel Dashboard" -ForegroundColor Yellow
    Write-Host "1. Go to: https://vercel.com/new" -ForegroundColor White
    Write-Host "2. Import: archit2501/insurance-brokerage-system" -ForegroundColor White
    Write-Host "3. Add environment variables (see .env file)" -ForegroundColor White
    Write-Host "4. Click Deploy`n" -ForegroundColor White
}
