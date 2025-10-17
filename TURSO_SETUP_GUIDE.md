# 🗄️ Turso Database Setup Guide

## What is Turso?

Turso is your **libSQL database** (SQLite for the cloud). Your application already uses Turso - you just need to get the credentials.

---

## 📋 Quick Setup (3 minutes)

### Option 1: Use the Setup Wizard (Recommended)
```powershell
.\setup-env.ps1
```

This interactive script will:
- ✅ Generate a secure `BETTER_AUTH_SECRET`
- ✅ Guide you to get your Turso credentials
- ✅ Create the `.env` file automatically
- ✅ Show you next steps

### Option 2: Manual Setup

1. **Get your Turso credentials:**
   - Go to https://turso.tech/app
   - Login to your Turso account
   - Select your database
   - Copy these two values:
     - **Connection URL** (starts with `libsql://...`)
     - **Auth Token** (long random string)

2. **Generate BETTER_AUTH_SECRET:**
   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
   ```
   Copy the output.

3. **Create .env file:**
   ```powershell
   cp .env.example .env
   ```

4. **Edit .env and fill in:**
   ```bash
   TURSO_CONNECTION_URL=libsql://your-database.turso.io
   TURSO_AUTH_TOKEN=your-long-token-here
   BETTER_AUTH_SECRET=your-generated-secret-here
   BETTER_AUTH_URL=http://localhost:3000
   NODE_ENV=development
   ```

---

## 🔍 Finding Your Turso Credentials

### Step-by-Step with Screenshots:

1. **Login to Turso**
   - Visit: https://turso.tech/app
   - Login with your credentials

2. **Select Your Database**
   - You should see a list of databases
   - Click on your `insurance-brokerage` database (or whatever you named it)

3. **Get Connection URL**
   - Look for "Connection Details" or "Connection String"
   - It looks like: `libsql://your-db-name-xxx.turso.io`
   - Click the copy button or select and copy

4. **Get Auth Token**
   - Look for "API Tokens" or "Auth Tokens" section
   - If you don't have one:
     - Click "Create Token" or "Generate Token"
     - Give it a name like "production-app"
     - Select "Read & Write" permissions
     - Copy the token (you can only see it once!)
   - If you have one already, copy it

### Alternative: Use Turso CLI

If you have the Turso CLI installed:

```powershell
# List your databases
turso db list

# Get the connection URL
turso db show your-db-name

# Create a token
turso db tokens create your-db-name
```

---

## ✅ Verification

After setting up your `.env` file, test the connection:

```powershell
# Start the development server
npm run dev
```

Then visit: http://localhost:3000

If you see the app without errors, your Turso connection is working! ✅

---

## 🚀 Deploying to Vercel

Once your local `.env` is working:

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your project

2. **Add Environment Variables**
   - Go to: Settings → Environment Variables
   - Add each variable from your `.env` file:
     ```
     TURSO_CONNECTION_URL
     TURSO_AUTH_TOKEN
     BETTER_AUTH_SECRET
     BETTER_AUTH_URL (use your Vercel URL)
     NODE_ENV=production
     ```

3. **Important for BETTER_AUTH_URL:**
   - First deployment: Use your Vercel preview URL
   - After deployment: Update to your production URL
   - Example: `https://insurance-brokerage.vercel.app`

4. **Redeploy**
   - After adding variables, trigger a new deployment
   - Or just push to GitHub (if auto-deploy is enabled)

---

## 🔒 Security Notes

- ✅ **Never commit `.env` to Git** (it's already in `.gitignore`)
- ✅ **Keep your TURSO_AUTH_TOKEN secret** (treat it like a password)
- ✅ **Rotate tokens periodically** (every 90 days recommended)
- ✅ **Use different tokens for dev/staging/prod** (if possible)
- ✅ **BETTER_AUTH_SECRET must be 32+ characters** (we generate 48 bytes)

---

## 🆘 Troubleshooting

### Error: "Failed to connect to Turso"
- ✅ Check your `TURSO_CONNECTION_URL` is correct
- ✅ Verify your `TURSO_AUTH_TOKEN` is valid
- ✅ Ensure you have network access to `*.turso.io`

### Error: "Invalid auth token"
- ✅ Token might be expired - create a new one
- ✅ Check for extra spaces in `.env` file
- ✅ Ensure token has read/write permissions

### Error: "Database not found"
- ✅ Verify the database name in the URL
- ✅ Check if the database was deleted
- ✅ Ensure you're logged into the correct Turso account

### Need to create a new database?
```powershell
# Using Turso CLI
turso db create insurance-brokerage
turso db show insurance-brokerage
```

---

## 📚 Additional Resources

- **Turso Documentation**: https://docs.turso.tech/
- **Turso Dashboard**: https://turso.tech/app
- **Our Deployment Guide**: `DEPLOYMENT_GUIDE.md`
- **Start Here Guide**: `START_HERE.md`

---

## 🎯 Quick Reference

```bash
# Your .env should look like this:
TURSO_CONNECTION_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=eyJhbGc...long-token-here
BETTER_AUTH_SECRET=dy/FkR...48-char-random-string
BETTER_AUTH_URL=http://localhost:3000
NODE_ENV=development
```

---

**Need help?** Check the Turso dashboard or run `.\setup-env.ps1` for interactive setup!
