# 🔧 FIX: Connect Vercel to GitHub

## Problem
The app is failing to build on Vercel with "Module not found: Can't resolve '@/lib/api'" even though the file exists.

## Root Cause
You're using **Vercel CLI direct deployment** which uploads files from your local machine. This can sometimes cause module resolution issues. The solution is to use **GitHub-connected deployment** where Vercel pulls code directly from your GitHub repository.

---

## ✅ SOLUTION: Connect Vercel to GitHub (5 minutes)

### Step 1: Go to Your Vercel Project
Open: https://vercel.com/archits-projects-db934b50/mutual_insurance_broker

### Step 2: Disconnect Current Deployment (if needed)
1. Click **Settings** (tab at top)
2. Scroll to **General** section
3. If you see any deployment method listed, note it

### Step 3: Connect to GitHub Repository
1. In **Settings**, click **Git** in the left sidebar
2. Click **"Connect Git Repository"** button
3. Select **GitHub** as the provider
4. Authorize Vercel to access your GitHub (if prompted)
5. Search for and select: **`archit2501/insurance-brokerage-system`**
6. Click **Connect**

### Step 4: Configure Build Settings
Vercel should auto-detect Next.js, but verify these settings:

- **Framework Preset**: Next.js
- **Root Directory**: `./` (leave as is)
- **Build Command**: `npm run build` (or leave default)
- **Output Directory**: `.next` (or leave default)  
- **Install Command**: `npm install` (or leave default)

Click **Save** if you made any changes.

### Step 5: Verify Environment Variables
1. Still in **Settings**, click **Environment Variables** in left sidebar
2. Verify these 5 variables exist (they should already be there):
   - ✅ `TURSO_CONNECTION_URL`
   - ✅ `TURSO_AUTH_TOKEN`
   - ✅ `BETTER_AUTH_SECRET`
   - ✅ `BETTER_AUTH_URL`
   - ✅ `NODE_ENV`

If any are missing, add them from the `YOUR_APP_IS_LIVE.md` file.

### Step 6: Trigger Redeploy
1. Go to **Deployments** tab
2. Click the **three dots** (...) next to the latest deployment
3. Click **"Redeploy"**
4. Wait 2-3 minutes for the build to complete

---

## ✅ Benefits of GitHub-Connected Deployment

- ✨ **Automatic deployments** when you push to GitHub
- ✨ **More reliable** builds (files pulled from GitHub)
- ✨ **Better caching** and build optimization
- ✨ **Deployment previews** for pull requests
- ✨ **Build logs** linked to commits
- ✨ **Rollback easily** to previous deployments

---

## 🎯 After Connecting

Once connected to GitHub:

1. **To deploy**: Just push to GitHub
   ```powershell
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
   Vercel will automatically deploy!

2. **View deployments**: Visit your dashboard
   https://vercel.com/archits-projects-db934b50/mutual_insurance_broker

3. **Check build logs**: Click on any deployment to see detailed logs

---

## 🚨 Alternative: Quick CLI Fix (if you want to keep CLI deployment)

If you prefer to keep using CLI deployment, try this:

```powershell
# Clear local Vercel cache
Remove-Item -Recurse -Force .vercel -ErrorAction SilentlyContinue

# Re-link and deploy
vercel link
vercel --prod --force
```

But **GitHub connection is strongly recommended** for production apps!

---

## 📝 Current Status

- ✅ Code is in GitHub: https://github.com/archit2501/insurance-brokerage-system
- ✅ All files including `src/lib/api.ts` are committed
- ✅ Environment variables are in Vercel
- ⏳ **Waiting for**: GitHub connection + redeploy

---

## ❓ Need Help?

If you encounter issues:
1. Check build logs in Vercel dashboard
2. Verify the GitHub repository is correct
3. Ensure branch is set to `main`
4. Try clearing Vercel build cache in Settings

Your app **will work** once connected to GitHub! The code is correct and builds locally without issues.
