#!/usr/bin/env pwsh
# ============================================
# ENVIRONMENT SETUP HELPER
# ============================================
# This script helps you set up your environment variables

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   ENVIRONMENT SETUP WIZARD" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Generate BETTER_AUTH_SECRET
Write-Host "📝 Generating BETTER_AUTH_SECRET..." -ForegroundColor Yellow
$secret = node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
Write-Host "✅ Generated!" -ForegroundColor Green
Write-Host ""

# Display instructions
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   YOUR TURSO CREDENTIALS NEEDED" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Please follow these steps:" -ForegroundColor White
Write-Host ""
Write-Host "1️⃣  Go to: " -NoNewline -ForegroundColor Yellow
Write-Host "https://turso.tech/app" -ForegroundColor Blue
Write-Host "2️⃣  Login to your Turso account" -ForegroundColor Yellow
Write-Host "3️⃣  Select your database" -ForegroundColor Yellow
Write-Host "4️⃣  Look for connection details:" -ForegroundColor Yellow
Write-Host "    - Connection URL (starts with libsql://...)" -ForegroundColor Gray
Write-Host "    - Auth Token (long random string)" -ForegroundColor Gray
Write-Host ""

# Get Turso URL
Write-Host "========================================`n" -ForegroundColor Cyan
$tursoUrl = Read-Host "Enter your TURSO_CONNECTION_URL (libsql://...)"
Write-Host ""

# Get Turso Token
$tursoToken = Read-Host "Enter your TURSO_AUTH_TOKEN"
Write-Host ""

# Get BETTER_AUTH_URL
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "BETTER_AUTH_URL options:" -ForegroundColor White
Write-Host "  - For local testing: http://localhost:3000" -ForegroundColor Gray
Write-Host "  - For Vercel: https://your-app.vercel.app (after deploy)" -ForegroundColor Gray
Write-Host ""
$authUrl = Read-Host "Enter your BETTER_AUTH_URL (press Enter for http://localhost:3000)"
if ([string]::IsNullOrWhiteSpace($authUrl)) {
    $authUrl = "http://localhost:3000"
}
Write-Host ""

# Create .env file
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   CREATING .env FILE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$envContent = @"
# ============================================
# ENVIRONMENT VARIABLES
# ============================================
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# DO NOT commit this file to version control!

# ============================================
# DATABASE (Turso/LibSQL)
# ============================================
TURSO_CONNECTION_URL=$tursoUrl
TURSO_AUTH_TOKEN=$tursoToken

# ============================================
# AUTHENTICATION (Better Auth)
# ============================================
BETTER_AUTH_SECRET=$secret
BETTER_AUTH_URL=$authUrl

# ============================================
# NODE ENVIRONMENT
# ============================================
NODE_ENV=development
"@

# Write to .env file
$envContent | Out-File -FilePath ".env" -Encoding utf8 -NoNewline
Write-Host "✅ Created .env file!" -ForegroundColor Green
Write-Host ""

# Display summary
Write-Host "========================================" -ForegroundColor Green
Write-Host "   SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Your .env file has been created with:" -ForegroundColor White
Write-Host "  ✅ TURSO_CONNECTION_URL" -ForegroundColor Green
Write-Host "  ✅ TURSO_AUTH_TOKEN" -ForegroundColor Green
Write-Host "  ✅ BETTER_AUTH_SECRET (generated)" -ForegroundColor Green
Write-Host "  ✅ BETTER_AUTH_URL" -ForegroundColor Green
Write-Host "  ✅ NODE_ENV" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   NEXT STEPS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "For LOCAL TESTING:" -ForegroundColor Yellow
Write-Host "  Just run: npm run dev" -ForegroundColor White
Write-Host ""

Write-Host "For VERCEL DEPLOYMENT:" -ForegroundColor Yellow
Write-Host "  1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables" -ForegroundColor White
Write-Host "  2. Add these variables (copy from .env file):" -ForegroundColor White
Write-Host "     - TURSO_CONNECTION_URL" -ForegroundColor Gray
Write-Host "     - TURSO_AUTH_TOKEN" -ForegroundColor Gray
Write-Host "     - BETTER_AUTH_SECRET" -ForegroundColor Gray
Write-Host "     - BETTER_AUTH_URL" -ForegroundColor Gray
Write-Host "     - NODE_ENV=production" -ForegroundColor Gray
Write-Host "  3. Redeploy your app" -ForegroundColor White
Write-Host ""

Write-Host "========================================`n" -ForegroundColor Green

# Offer to display the file
$show = Read-Host "Would you like to see the .env file contents? (y/n)"
if ($show -eq "y") {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "   .env FILE CONTENTS" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
    Get-Content .env
    Write-Host ""
}

Write-Host "✅ Setup complete! You can now run: " -NoNewline -ForegroundColor Green
Write-Host "npm run dev" -ForegroundColor White -BackgroundColor DarkGreen
Write-Host ""
