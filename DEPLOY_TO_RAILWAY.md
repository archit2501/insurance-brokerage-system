# Railway Deployment Guide

## What is Railway?
Railway is a modern deployment platform that's more reliable than Vercel for complex apps. It uses Docker containers which avoid module resolution issues.

## Steps to Deploy

### 1. Create Railway Account
1. Go to: https://railway.app/
2. Click "Login" (top right)
3. Sign up with GitHub (use your archit2501 account)
4. Authorize Railway to access your repositories

### 2. Create New Project
1. Click "New Project" button
2. Select "Deploy from GitHub repo"
3. Choose: `archit2501/insurance-brokerage-system`
4. Railway will detect it's a Next.js app

### 3. Add Environment Variables
Click on your project, then go to "Variables" tab and add these:

```
TURSO_CONNECTION_URL=libsql://insurance-brokrage-system-archit2501.aws-ap-south-1.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJnaWQiOiI5OTA3YjU5MC1lM2JiLTRmMDMtODRlZC0wMDBmNTYwOGMwMmEiLCJpYXQiOjE3NjA2OTgwNTAsInJpZCI6IjM0M2QwZDE4LWM3MDEtNDc5YS1hMTA0LTNlYjc5MDlhZTVlNSJ9.HrVMF6Opynz090XxELenCWjekSZrTD4PoqTT3bi66v-vXbIfHC7eZJpzda_x_Oa1BWFVHCHpfnlQDDNA-xVECg
BETTER_AUTH_SECRET=X9Juk5aeeu09k6gDUurLe6CDkeFSuvDrNj421rQq7A/rc7uEAwaC8FMWH20758cP
BETTER_AUTH_URL=(Railway will provide this - update after first deploy)
NODE_ENV=production
PORT=3000
```

### 4. Deploy
1. Railway will automatically start building
2. Wait 3-5 minutes for first deploy
3. You'll get a URL like: `your-app.up.railway.app`
4. Update `BETTER_AUTH_URL` with this new URL
5. Redeploy

### 5. Test
Visit your new Railway URL and test the app!

## Why Railway is Better

✅ **Docker-based**: Builds are more reliable
✅ **Better module resolution**: Fewer path issues
✅ **Automatic HTTPS**: SSL certificates included
✅ **GitHub integration**: Auto-deploys on push
✅ **Better logs**: Easier to debug

## Cost
- **Free tier**: $5 credit per month
- Your app should stay within free tier
- No credit card required to start

---

## Alternative: Netlify (If you prefer)

1. Go to: https://netlify.com/
2. Sign up with GitHub
3. Click "Add new site" → "Import from Git"
4. Choose your repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Add environment variables
7. Deploy!

---

Choose Railway or Netlify - both are more reliable than Vercel for this issue!
