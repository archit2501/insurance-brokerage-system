# 🚀 DEPLOY TO VERCEL - COMPLETE GUIDE

## Quick Deploy (5 Minutes)

### Prerequisites
- ✅ Turso account (get free at https://turso.tech)
- ✅ GitHub account (already set up)
- ✅ Vercel account (sign up at https://vercel.com)

---

## 🎯 OPTION 1: Automated Deploy (Recommended)

### Step 1: Get Your Turso Credentials

1. Go to **https://turso.tech/app**
2. Login to your Turso account
3. Select your database (or create one if needed)
4. Find and copy:
   - **Connection URL**: `libsql://your-db.turso.io`
   - **Auth Token**: Long string (create if needed)

### Step 2: Run the Deploy Script

```powershell
.\deploy-now.ps1
```

**What it does:**
- ✅ Generates secure `BETTER_AUTH_SECRET`
- ✅ Asks for your Turso credentials
- ✅ Creates `.env` file
- ✅ Tests the build
- ✅ Pushes to GitHub
- ✅ Deploys to Vercel with all environment variables

### Step 3: Final Configuration

After deployment completes:

1. Copy your Vercel URL (shown in terminal)
2. Go to **https://vercel.com/dashboard**
3. Select your project
4. Go to **Settings** → **Environment Variables**
5. Add one more variable:
   - **Name**: `BETTER_AUTH_URL`
   - **Value**: `https://your-app.vercel.app` (your Vercel URL)
   - **Environment**: Production
6. Click **Redeploy** button

**Done! 🎉**

---

## 🎯 OPTION 2: Manual Deploy

### Step 1: Create .env File

```powershell
# Copy the example
cp .env.example .env
```

Edit `.env` and fill in:

```bash
TURSO_CONNECTION_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-auth-token-here
BETTER_AUTH_SECRET=generate-with-command-below
BETTER_AUTH_URL=http://localhost:3000
NODE_ENV=development
```

Generate `BETTER_AUTH_SECRET`:
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

### Step 2: Test Locally

```powershell
npm run build
npm run dev
```

Open http://localhost:3000 and test login.

### Step 3: Push to GitHub

```powershell
git add .
git commit -m "Setup deployment configuration"
git push origin main
```

### Step 4: Deploy to Vercel

#### Via Vercel CLI:

```powershell
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

When prompted, set environment variables:
- `TURSO_CONNECTION_URL`
- `TURSO_AUTH_TOKEN`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` (use your Vercel URL)
- `NODE_ENV=production`

#### Via Vercel Dashboard:

1. Go to **https://vercel.com/dashboard**
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Add environment variables:
   - `TURSO_CONNECTION_URL`
   - `TURSO_AUTH_TOKEN`
   - `BETTER_AUTH_SECRET`
   - `NODE_ENV=production`
5. Click **Deploy**
6. After deployment, add `BETTER_AUTH_URL` and redeploy

---

## 📋 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `TURSO_CONNECTION_URL` | Your Turso database URL | `libsql://my-db.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso authentication token | `eyJhbGc...` (long string) |
| `BETTER_AUTH_SECRET` | Auth secret (48+ chars) | Generate with crypto |
| `BETTER_AUTH_URL` | Your app's public URL | `https://your-app.vercel.app` |
| `NODE_ENV` | Node environment | `production` |

---

## 🔍 Finding Turso Credentials - Detailed Steps

### If You Already Have a Database:

1. **Login to Turso**
   - Visit: https://turso.tech/app
   - Login with your credentials

2. **Select Your Database**
   - You'll see a list of databases
   - Click on your database name

3. **Get Connection URL**
   - Look for "Connection String" or "CLI Usage"
   - Copy the URL: `libsql://your-database-name.turso.io`

4. **Get/Create Auth Token**
   - Look for "API Tokens" or "Tokens" tab
   - If you have a token, copy it
   - If not, click "Create Token":
     - Name: "production-app"
     - Permissions: Read & Write
     - Copy the token (shown only once!)

### If You Need to Create a Database:

Using Turso CLI:
```powershell
# Install Turso CLI
powershell -c "irm https://get.turso.tech/install.ps1 | iex"

# Login
turso auth login

# Create database
turso db create insurance-brokerage

# Get connection URL
turso db show insurance-brokerage

# Create token
turso db tokens create insurance-brokerage
```

Or use the Turso Dashboard at https://turso.tech/app

---

## ✅ Verification Checklist

After deployment:

- [ ] App loads at Vercel URL
- [ ] No console errors in browser
- [ ] Can register new user
- [ ] Can login with test credentials
- [ ] Can create a client
- [ ] Can create a policy
- [ ] Database is saving data

### Test Credentials:
```
Email:    testuser@insurancebrokerage.com
Password: Test@123456
```

Or register a new account on your deployed app.

---

## 🆘 Troubleshooting

### Build Fails

**Error**: "TURSO_CONNECTION_URL is not defined"
- **Fix**: Make sure environment variables are set in Vercel dashboard

**Error**: "Failed to connect to database"
- **Fix**: Check your Turso credentials are correct
- **Fix**: Verify the database exists and is accessible

### Login Doesn't Work

**Error**: "Invalid credentials" or "Session error"
- **Fix**: Make sure `BETTER_AUTH_URL` matches your deployment URL
- **Fix**: Redeploy after setting `BETTER_AUTH_URL`

### Database Connection Fails

**Error**: "Authentication failed"
- **Fix**: Verify `TURSO_AUTH_TOKEN` is correct
- **Fix**: Check token has read/write permissions
- **Fix**: Try creating a new token in Turso dashboard

---

## 🔒 Security Notes

- ✅ Never commit `.env` file (already in `.gitignore`)
- ✅ Use strong random secret for `BETTER_AUTH_SECRET`
- ✅ Rotate Turso tokens periodically
- ✅ Use different tokens for dev/staging/prod
- ✅ Keep `TURSO_AUTH_TOKEN` confidential

---

## 📚 Additional Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Turso Documentation**: https://docs.turso.tech
- **Next.js Deployment**: https://nextjs.org/docs/deployment

---

## 🎉 After Successful Deployment

1. **Share with your client:**
   - App URL: `https://your-app.vercel.app`
   - Test credentials or have them register

2. **Monitor:**
   - Vercel Dashboard: Check logs and analytics
   - Turso Dashboard: Monitor database usage

3. **Update docs:**
   - Share deployment URL with team
   - Update any documentation with production URL

---

## Quick Commands Reference

```powershell
# Automated deploy (recommended)
.\deploy-now.ps1

# Manual deploy steps
npm run build                 # Test build
git push origin main          # Push to GitHub
vercel --prod                 # Deploy to Vercel

# Check deployment
vercel ls                     # List deployments
vercel logs                   # View logs

# Environment variables
vercel env ls                 # List env vars
vercel env add                # Add env var
vercel env rm                 # Remove env var
```

---

**Ready to deploy?** Run `.\deploy-now.ps1` to start! 🚀
