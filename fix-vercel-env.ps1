# Fix Vercel Environment Variables
# This script adds the required environment variables to your Vercel project

Write-Host "🔧 Fixing Vercel Environment Variables..." -ForegroundColor Cyan
Write-Host ""

# Read from .env file
if (Test-Path ".env") {
    Write-Host "✓ Found .env file" -ForegroundColor Green
    
    # Read .env and parse key-value pairs
    $envVars = @{}
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.+)$') {
            $envVars[$matches[1]] = $matches[2]
        }
    }
    
    Write-Host ""
    Write-Host "📝 Environment variables found:" -ForegroundColor Yellow
    Write-Host "  TURSO_CONNECTION_URL: $($envVars['TURSO_CONNECTION_URL'])" -ForegroundColor White
    Write-Host "  TURSO_AUTH_TOKEN: [hidden]" -ForegroundColor White
    Write-Host "  BETTER_AUTH_SECRET: [hidden]" -ForegroundColor White
    Write-Host "  BETTER_AUTH_URL: $($envVars['BETTER_AUTH_URL'])" -ForegroundColor White
    Write-Host ""
    
    # Add environment variables to Vercel
    Write-Host "Adding environment variables to Vercel..." -ForegroundColor Cyan
    Write-Host ""
    
    # TURSO_CONNECTION_URL
    Write-Host "Setting TURSO_CONNECTION_URL..." -ForegroundColor Gray
    $tursoUrl = $envVars['TURSO_CONNECTION_URL']
    echo $tursoUrl | vercel env add TURSO_CONNECTION_URL production
    
    # TURSO_AUTH_TOKEN  
    Write-Host "Setting TURSO_AUTH_TOKEN..." -ForegroundColor Gray
    $tursoToken = $envVars['TURSO_AUTH_TOKEN']
    echo $tursoToken | vercel env add TURSO_AUTH_TOKEN production
    
    # BETTER_AUTH_SECRET
    Write-Host "Setting BETTER_AUTH_SECRET..." -ForegroundColor Gray
    $authSecret = $envVars['BETTER_AUTH_SECRET']
    echo $authSecret | vercel env add BETTER_AUTH_SECRET production
    
    # BETTER_AUTH_URL
    Write-Host "Setting BETTER_AUTH_URL..." -ForegroundColor Gray
    $authUrl = $envVars['BETTER_AUTH_URL']
    echo $authUrl | vercel env add BETTER_AUTH_URL production
    
    # NODE_ENV
    Write-Host "Setting NODE_ENV..." -ForegroundColor Gray
    echo "production" | vercel env add NODE_ENV production
    
    Write-Host ""
    Write-Host "✅ Environment variables added!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Redeploying to apply changes..." -ForegroundColor Cyan
    Write-Host ""
    
    vercel --prod
    
    Write-Host ""
    Write-Host "✅ All done!" -ForegroundColor Green
    Write-Host "🌐 Your app should now work at: https://mutualinsurancebroker-gttqapplq-archits-projects-db934b50.vercel.app" -ForegroundColor Cyan
    
} else {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Please make sure you have a .env file with all required variables." -ForegroundColor Yellow
}
