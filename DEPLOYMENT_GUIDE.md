# 🚀 Deployment Guide - Insurance Brokerage System

## Quick Deploy Options (Easiest to Hardest)

### ✅ **Option 1: Vercel (RECOMMENDED - Free & Fastest)**
**Time:** 5-10 minutes | **Cost:** Free | **Best For:** Quick UAT testing

#### Prerequisites:
- GitHub account
- Vercel account (free at vercel.com)

#### Steps:

1. **Push Code to GitHub**
   ```bash
   # Initialize git if not already done
   git init
   git add .
   git commit -m "Ready for deployment"
   
   # Create a new repository on GitHub, then:
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel auto-detects Next.js
   - Add environment variables:
     - `TURSO_CONNECTION_URL`: Your Turso database URL
     - `TURSO_AUTH_TOKEN`: Your Turso auth token
     - `BETTER_AUTH_SECRET`: Generate with: `openssl rand -base64 32`
     - `BETTER_AUTH_URL`: Will be `https://your-app.vercel.app`
   - Click "Deploy"
   - Done! You'll get a URL like: `https://insurance-brokerage-sys.vercel.app`

3. **Share with Client**
   ```
   URL: https://your-app.vercel.app
   Email: testuser@insurancebrokerage.com
   Password: Test@123456
   ```

#### Pros:
✅ Free hosting  
✅ Automatic HTTPS  
✅ Global CDN  
✅ Auto-deploys on git push  
✅ Preview deployments for testing  
✅ Easy rollbacks  
✅ Zero configuration  

#### Cons:
⚠️ Cold starts on free tier  
⚠️ 10 second timeout limit (should be fine for this app)

---

### ✅ **Option 2: Netlify (Alternative to Vercel)**
**Time:** 5-10 minutes | **Cost:** Free | **Best For:** Similar to Vercel

#### Steps:
1. Push code to GitHub (same as Option 1)
2. Go to [netlify.com](https://netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect to GitHub and select your repository
5. Build settings (auto-detected for Next.js):
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Add environment variables (same as Vercel)
7. Deploy!

---

### ✅ **Option 3: Railway (Includes Database)**
**Time:** 10-15 minutes | **Cost:** $5/month (trial available) | **Best For:** All-in-one solution

#### Steps:
1. Push code to GitHub
2. Go to [railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway auto-detects Next.js
6. Add environment variables
7. Get deployment URL

#### Pros:
✅ Can host database on same platform  
✅ Simple pricing  
✅ Good for production  
✅ No cold starts  

---

### ✅ **Option 4: Docker + Any Cloud Provider**
**Time:** 30-60 minutes | **Cost:** Varies | **Best For:** Custom infrastructure

#### Create Production Dockerfile:
```dockerfile
# Already exists at frontend.Dockerfile
# Just ensure it's up to date
```

#### Deploy to:
- **Digital Ocean App Platform** ($5/month)
- **AWS ECS/Fargate** (varies)
- **Google Cloud Run** (pay per use)
- **Azure Container Instances** (varies)

---

### ✅ **Option 5: Traditional VPS (DigitalOcean, Linode, AWS EC2)**
**Time:** 1-2 hours | **Cost:** $5-10/month | **Best For:** Full control

#### Steps:
1. Rent a VPS (Ubuntu 22.04 recommended)
2. SSH into server
3. Install Node.js, npm, git
4. Clone your repository
5. Install dependencies: `npm install`
6. Set environment variables in `.env`
7. Build: `npm run build`
8. Install PM2: `npm install -g pm2`
9. Run: `pm2 start npm --name "insurance-app" -- start`
10. Setup nginx reverse proxy
11. Setup SSL with Let's Encrypt

---

## 🎯 **RECOMMENDED: Quick Vercel Deployment**

Since you need this deployed **quickly for client testing**, here's the exact process:

### Step-by-Step Vercel Deployment

#### 1. Create GitHub Repository
```powershell
# In your project directory
git init
git add .
git commit -m "Initial commit - Ready for deployment"
```

Then:
- Go to https://github.com/new
- Create a new repository (e.g., `insurance-brokerage-system`)
- **Don't** initialize with README (you already have code)
- Copy the commands shown, something like:

```powershell
git remote add origin https://github.com/YourUsername/insurance-brokerage-system.git
git branch -M main
git push -u origin main
```

#### 2. Deploy to Vercel

**Option A: Using Vercel Dashboard (Easiest)**
1. Go to https://vercel.com/signup (sign up with GitHub)
2. Click "New Project"
3. Import your `insurance-brokerage-system` repository
4. Configure:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (keep default)
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)

5. **Environment Variables** - Click "Environment Variables" and add:
   ```
   TURSO_CONNECTION_URL=libsql://your-database.turso.io
   TURSO_AUTH_TOKEN=your-token-here
   BETTER_AUTH_SECRET=generate-random-32-char-string
   BETTER_AUTH_URL=https://your-app.vercel.app
   NODE_ENV=production
   ```

6. Click "Deploy"
7. Wait 2-3 minutes
8. Get your URL: `https://insurance-brokerage-system.vercel.app`

**Option B: Using Vercel CLI (Faster for future deploys)**
```powershell
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts, set environment variables when asked
# On subsequent deploys, just run: vercel --prod
```

#### 3. Post-Deployment Setup

After deployment, you need to:

**A. Update Better Auth URL**
- Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- Update `BETTER_AUTH_URL` to your actual Vercel URL
- Redeploy: Vercel Dashboard → Deployments → Latest → "Redeploy"

**B. Test the Deployment**
```powershell
# Test the deployed app
curl https://your-app.vercel.app/api/auth/get-session
```

**C. Create Test User**
- Open https://your-app.vercel.app/register
- Register with: testuser@insurancebrokerage.com / Test@123456
- Or use the register page in the deployed app

#### 4. Share with Client

Create a simple access document:

```
═══════════════════════════════════════════════
   INSURANCE BROKERAGE SYSTEM - UAT ACCESS
═══════════════════════════════════════════════

🌐 Application URL:
   https://insurance-brokerage-system.vercel.app

🔐 Test Credentials:
   Email:    testuser@insurancebrokerage.com
   Password: Test@123456

📋 Quick Start:
   1. Click the URL above
   2. Click "Register" if first time
   3. Or "Login" if account exists
   4. Use the credentials above
   5. Start testing!

📖 Features to Test:
   ✅ Create Clients (Company/Individual)
   ✅ Create Insurers
   ✅ Create Agents
   ✅ Create Bank Accounts
   ✅ Setup LOBs
   ✅ Create Policies
   ✅ Generate Credit Notes (CN)
   ✅ Generate Debit Notes (DN)

🐛 Report Issues:
   Email: your.email@company.com
   Or use the feedback form in the app

⏰ Testing Period:
   Available 24/7 for UAT testing

═══════════════════════════════════════════════
```

---

## 🔧 Troubleshooting Deployment Issues

### Issue: Build Fails
```bash
# Check build locally first
npm run build

# If it works locally but fails on Vercel:
# - Check Node.js version in package.json
# - Add "engines": { "node": ">=18.0.0" }
```

### Issue: Environment Variables Not Working
- Vercel requires redeployment after env var changes
- Go to Deployments → Click "..." → Redeploy

### Issue: Database Connection Fails
- Check TURSO_CONNECTION_URL format: `libsql://...`
- Verify TURSO_AUTH_TOKEN is correct
- Test locally with same credentials

### Issue: Auth Not Working
- Ensure BETTER_AUTH_URL matches your deployed URL
- Must be HTTPS, not HTTP
- Redeploy after changing this variable

---

## 📊 Comparison Table

| Option | Time | Cost | Ease | Best For |
|--------|------|------|------|----------|
| **Vercel** | 5-10min | Free | ⭐⭐⭐⭐⭐ | UAT Testing |
| **Netlify** | 5-10min | Free | ⭐⭐⭐⭐⭐ | Alternative to Vercel |
| **Railway** | 10-15min | $5/mo | ⭐⭐⭐⭐ | Production |
| **Docker + Cloud** | 30-60min | Varies | ⭐⭐⭐ | Custom Setup |
| **VPS** | 1-2hr | $5-10/mo | ⭐⭐ | Full Control |

---

## 🎯 My Recommendation

**For UAT Testing RIGHT NOW:** Use **Vercel** (Option 1)

**Why:**
- ✅ Fastest to deploy (5 minutes)
- ✅ Free for testing
- ✅ Automatic HTTPS
- ✅ Global CDN (fast worldwide)
- ✅ Easy to redeploy when you fix bugs
- ✅ Client gets a professional URL
- ✅ No server maintenance
- ✅ Scales automatically

**For Production Later:** 
- Upgrade to Vercel Pro ($20/month) for better support
- Or migrate to Railway/VPS for more control

---

## 🚀 Next Steps

1. **Right now:** Deploy to Vercel (10 minutes)
2. **Test:** Access the URL yourself first
3. **Share:** Send client the access document
4. **Monitor:** Check Vercel logs for errors
5. **Iterate:** Fix bugs and redeploy quickly

---

## 📞 Need Help?

If you encounter issues during deployment:
1. Check Vercel deployment logs
2. Test locally first: `npm run build && npm start`
3. Verify environment variables are set correctly
4. Check this guide's troubleshooting section

---

## 🔐 Security Checklist Before Deployment

- ✅ Environment variables set (not hardcoded)
- ✅ BETTER_AUTH_SECRET is strong (32+ characters)
- ✅ Database credentials are secure
- ✅ HTTPS enabled (automatic with Vercel)
- ✅ CORS configured properly
- ✅ Rate limiting enabled (optional for UAT)
- ⚠️ Remove any debug logs with sensitive data
- ⚠️ Disable detailed error messages in production

---

**Ready to deploy? Let me know if you want help with any specific step!**
