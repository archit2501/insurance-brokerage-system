# 🤖 FULLY AUTOMATED DEPLOYMENT

**Zero manual work - just provide credentials once!**

---

## 🚀 Run This ONE Command:

```powershell
.\auto-deploy.ps1
```

---

## What It Does Automatically:

✅ Checks prerequisites (Node, npm, Git)
✅ Generates all secrets
✅ Creates .env file
✅ Commits to Git
✅ Installs Vercel CLI (if needed)
✅ Deploys to Vercel
✅ Configures all environment variables
✅ Gives you the live URL

**Total time: ~3 minutes**

---

## What You Need to Provide:

When the script asks, you'll need:

1. **TURSO_CONNECTION_URL** (from https://turso.tech/app)
   - Looks like: `libsql://your-db.turso.io`

2. **TURSO_AUTH_TOKEN** (from https://turso.tech/app)
   - Your database auth token

**That's it!** The script handles everything else automatically.

---

## Don't Have Turso Credentials Yet?

### 2-minute setup:

1. Go to: **https://turso.tech/app**
2. Sign up (free)
3. Create a database
4. Copy the connection URL
5. Create/copy an auth token

Then run: `.\auto-deploy.ps1`

---

## After Running the Script:

You'll get:
- ✅ Live Vercel URL
- ✅ All environment variables configured
- ✅ App ready to test
- ✅ Instructions to share with client

**Everything automated!** 🎉

---

## Troubleshooting:

### "Vercel login required"
- The script will open a browser for you to login
- Login with GitHub
- Return to terminal and continue

### "Missing Turso credentials"
- Make sure you copied them from https://turso.tech/app
- URL must start with `libsql://`

---

## Ready?

```powershell
.\auto-deploy.ps1
```

**Just run it!** 🚀
