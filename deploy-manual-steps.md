# 🚀 Manual Deployment to Vercel (If Script Fails)

If the automated script fails, follow these simple manual steps:

---

## Step 1: Create .env File (1 minute)

Copy `.env.example` to `.env`:

```powershell
cp .env.example .env
```

Edit `.env` and add:

```bash
TURSO_CONNECTION_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token-here
BETTER_AUTH_SECRET=run-command-below-to-generate
BETTER_AUTH_URL=http://localhost:3000
NODE_ENV=development
```

Generate `BETTER_AUTH_SECRET`:
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

---

## Step 2: Deploy via Vercel Dashboard (3 minutes)

### Option A: Connect GitHub Repository

1. **Go to Vercel**
   - Visit: https://vercel.com/new
   - Click "Add New" → "Project"

2. **Import Repository**
   - Select "Import Git Repository"
   - Choose: `archit2501/insurance-brokerage-system`
   - Click "Import"

3. **Configure Project**
   - Framework Preset: **Next.js** (should auto-detect)
   - Build Command: `npm run build` (leave default)
   - Output Directory: `.next` (leave default)

4. **Add Environment Variables**
   Click "Environment Variables" and add:
   
   | Name | Value |
   |------|-------|
   | `TURSO_CONNECTION_URL` | `libsql://your-db.turso.io` |
   | `TURSO_AUTH_TOKEN` | Your Turso auth token |
   | `BETTER_AUTH_SECRET` | Generated secret from above |
   | `NODE_ENV` | `production` |

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build

6. **Add Final Variable**
   After deployment:
   - Copy your Vercel URL: `https://your-app.vercel.app`
   - Go to: Project Settings → Environment Variables
   - Add: `BETTER_AUTH_URL` = `https://your-app.vercel.app`
   - Click "Redeploy"

---

### Option B: Use Vercel CLI

```powershell
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

When prompted, add environment variables manually.

---

## Step 3: Verify Deployment

1. **Visit your Vercel URL**
2. **Register/Login with:**
   - Email: `testuser@insurancebrokerage.com`
   - Password: `Test@123456`
3. **Test creating a client**

---

## 🆘 Common Issues

### "TURSO_CONNECTION_URL is not defined"
- **Fix**: Add environment variables in Vercel Dashboard
- Go to: Settings → Environment Variables

### "Build failed"
- **Fix**: Check build logs in Vercel
- Most likely: missing environment variables

### "Can't connect to database"
- **Fix**: Verify Turso credentials are correct
- Check: TURSO_CONNECTION_URL and TURSO_AUTH_TOKEN

### "Login doesn't work"
- **Fix**: Add BETTER_AUTH_URL in Vercel Dashboard
- Value: Your Vercel app URL (https://your-app.vercel.app)
- Redeploy after adding

---

## 📋 Environment Variables Checklist

Make sure all these are in Vercel:

- [ ] `TURSO_CONNECTION_URL`
- [ ] `TURSO_AUTH_TOKEN`
- [ ] `BETTER_AUTH_SECRET`
- [ ] `BETTER_AUTH_URL` (add after first deploy)
- [ ] `NODE_ENV=production`

---

## ✅ Success!

Your app should now be live at: `https://your-app.vercel.app`

Share this URL with your client for testing!

---

**Need help?** Check:
- Vercel Dashboard logs for errors
- Your Turso credentials are correct
- All environment variables are set
