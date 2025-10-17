# 🚀 DEPLOY NOW - QUICK START

## What You Need (2 Things):

1. **TURSO_CONNECTION_URL** - from https://turso.tech/app
   - Looks like: `libsql://your-db.turso.io`

2. **TURSO_AUTH_TOKEN** - from https://turso.tech/app
   - Long random string (your database auth token)

---

## 🎯 Deploy in 1 Command:

```powershell
.\deploy-now.ps1
```

**The script will:**
1. ✅ Ask for your Turso credentials
2. ✅ Generate secure secrets automatically
3. ✅ Create `.env` file
4. ✅ Test the build
5. ✅ Push to GitHub
6. ✅ Deploy to Vercel
7. ✅ Set all environment variables

**Total time: ~3-5 minutes**

---

## 📋 After Deployment:

You'll get a Vercel URL like: `https://insurance-brokerage-xyz.vercel.app`

**Final step (30 seconds):**
1. Go to https://vercel.com/dashboard
2. Select your project → Settings → Environment Variables
3. Add: `BETTER_AUTH_URL` = `https://your-vercel-url.vercel.app`
4. Click "Redeploy"

**Done!** 🎉

---

## 🆘 Don't Have Turso Credentials Yet?

### Quick Setup (2 minutes):

1. Go to: https://turso.tech/app
2. Login/signup (free account)
3. Create a database:
   - Name: `insurance-brokerage`
   - Region: Choose closest to you
4. Copy the connection URL
5. Click "Create Token" and copy it

Now run: `.\deploy-now.ps1`

---

## Alternative: Manual Deploy

See `VERCEL_DEPLOY_GUIDE.md` for detailed step-by-step instructions.

---

**Ready?** Just run: `.\deploy-now.ps1` 🚀
