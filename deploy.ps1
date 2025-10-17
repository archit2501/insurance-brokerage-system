# 🚀 Quick Deploy Script for Vercel

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  VERCEL DEPLOYMENT HELPER" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if git is initialized
if (-Not (Test-Path ".git")) {
    Write-Host "⚠️  Git not initialized. Initializing now..." -ForegroundColor Yellow
    git init
    Write-Host "✅ Git initialized" -ForegroundColor Green
}

# Check if vercel CLI is installed
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-Not $vercelInstalled) {
    Write-Host "📦 Vercel CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g vercel
    Write-Host "✅ Vercel CLI installed" -ForegroundColor Green
}

Write-Host "`nDeployment Options:" -ForegroundColor Cyan
Write-Host "1. Quick Deploy (Vercel CLI)" -ForegroundColor White
Write-Host "2. Push to GitHub (for Vercel Dashboard deploy)" -ForegroundColor White
Write-Host "3. Check deployment status" -ForegroundColor White
Write-Host "4. Exit`n" -ForegroundColor White

$choice = Read-Host "Select option (1-4)"

switch ($choice) {
    "1" {
        Write-Host "`n🚀 Starting Vercel deployment..." -ForegroundColor Green
        Write-Host "⚠️  Make sure you have:" -ForegroundColor Yellow
        Write-Host "  - TURSO_CONNECTION_URL" -ForegroundColor Gray
        Write-Host "  - TURSO_AUTH_TOKEN" -ForegroundColor Gray
        Write-Host "  - BETTER_AUTH_SECRET (generate with: openssl rand -base64 32)" -ForegroundColor Gray
        Write-Host ""
        
        $confirm = Read-Host "Continue? (y/n)"
        if ($confirm -eq "y") {
            # Add all files
            git add .
            git commit -m "Deploy to Vercel" -ErrorAction SilentlyContinue
            
            # Deploy
            vercel
            
            Write-Host "`n✅ Deployment initiated!" -ForegroundColor Green
            Write-Host "📝 After deployment:" -ForegroundColor Cyan
            Write-Host "  1. Note your deployment URL" -ForegroundColor Gray
            Write-Host "  2. Add environment variables in Vercel dashboard" -ForegroundColor Gray
            Write-Host "  3. Redeploy: vercel --prod" -ForegroundColor Gray
        }
    }
    
    "2" {
        Write-Host "`n📦 Preparing for GitHub push..." -ForegroundColor Green
        
        # Check if remote exists
        $remoteExists = git remote -v 2>$null
        if (-Not $remoteExists) {
            Write-Host "`n⚠️  No GitHub remote found." -ForegroundColor Yellow
            Write-Host "Please create a GitHub repository first, then run:" -ForegroundColor Gray
            Write-Host "  git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git" -ForegroundColor White
            Write-Host "  git branch -M main" -ForegroundColor White
            Write-Host "  git push -u origin main" -ForegroundColor White
        } else {
            Write-Host "Current remotes:" -ForegroundColor Cyan
            git remote -v
            Write-Host ""
            
            $confirm = Read-Host "Push to GitHub? (y/n)"
            if ($confirm -eq "y") {
                git add .
                $message = Read-Host "Commit message (default: 'Deploy update')"
                if ([string]::IsNullOrWhiteSpace($message)) {
                    $message = "Deploy update"
                }
                git commit -m $message
                git push
                
                Write-Host "`n✅ Pushed to GitHub!" -ForegroundColor Green
                Write-Host "Next steps:" -ForegroundColor Cyan
                Write-Host "  1. Go to vercel.com" -ForegroundColor Gray
                Write-Host "  2. Import your GitHub repository" -ForegroundColor Gray
                Write-Host "  3. Add environment variables" -ForegroundColor Gray
                Write-Host "  4. Deploy!" -ForegroundColor Gray
            }
        }
    }
    
    "3" {
        Write-Host "`n📊 Checking deployment status..." -ForegroundColor Green
        vercel ls
    }
    
    "4" {
        Write-Host "`n👋 Goodbye!" -ForegroundColor Green
        exit
    }
    
    default {
        Write-Host "`n❌ Invalid option" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  For detailed guide, see:" -ForegroundColor White
Write-Host "  DEPLOYMENT_GUIDE.md" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan
