# 🌐 DEPLOY TO NETLIFY - STEP BY STEP

Netlify is super easy and has excellent Next.js support!

---

## 📋 STEP 1: Create Netlify Account (1 minute)

1. Go to: **https://app.netlify.com/signup**
2. Click **"Sign up with GitHub"**
3. Authorize Netlify to access your GitHub
4. You're in! 🎉

---

## 📋 STEP 2: Create New Site (2 minutes)

1. You'll see the Netlify dashboard
2. Click **"Add new site"** dropdown (top right)
3. Select **"Import an existing project"**
4. Click **"Deploy with GitHub"**
5. Authorize Netlify if prompted
6. Search for and select: **`insurance-brokerage-system`**
7. Click on the repository

---

## 📋 STEP 3: Configure Build Settings (1 minute)

Netlify should auto-detect Next.js. Verify these settings:

**Build settings:**
- **Branch to deploy**: `main`
- **Build command**: `npm run build` (should be auto-filled)
- **Publish directory**: `.next` (should be auto-filled)
- **Functions directory**: `.netlify/functions` (auto-filled)

✅ Click **"Show advanced"** button

---

## 📋 STEP 4: Add Environment Variables (2 minutes)

Click **"New variable"** and add these **5 variables**:

### Variable 1:
```
Key: TURSO_CONNECTION_URL
Value: libsql://insurance-brokrage-system-archit2501.aws-ap-south-1.turso.io
```

### Variable 2:
```
Key: TURSO_AUTH_TOKEN
Value: eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJnaWQiOiI5OTA3YjU5MC1lM2JiLTRmMDMtODRlZC0wMDBmNTYwOGMwMmEiLCJpYXQiOjE3NjA2OTgwNTAsInJpZCI6IjM0M2QwZDE4LWM3MDEtNDc5YS1hMTA0LTNlYjc5MDlhZTVlNSJ9.HrVMF6Opynz090XxELenCWjekSZrTD4PoqTT3bi66v-vXbIfHC7eZJpzda_x_Oa1BWFVHCHpfnlQDDNA-xVECg
```

### Variable 3:
```
Key: BETTER_AUTH_SECRET
Value: X9Juk5aeeu09k6gDUurLe6CDkeFSuvDrNj421rQq7A/rc7uEAwaC8FMWH20758cP
```

### Variable 4:
```
Key: BETTER_AUTH_URL
Value: (Leave blank for now - we'll update after first deploy)
```

### Variable 5:
```
Key: NODE_ENV
Value: production
```

---

## 📋 STEP 5: Deploy! (3-5 minutes)

1. Click **"Deploy insurance-brokerage-system"** button
2. Netlify will start building your app
3. You'll see build logs in real-time
4. Wait 3-5 minutes for first build
5. You'll get a URL like: `random-name-123.netlify.app`

---

## 📋 STEP 6: Update BETTER_AUTH_URL (1 minute)

1. After deployment completes, copy your Netlify URL
2. Go to **"Site configuration"** → **"Environment variables"**
3. Find `BETTER_AUTH_URL`
4. Click **"Edit"**
5. Update with your Netlify URL (e.g., `https://your-site.netlify.app`)
6. Click **"Save"**

---

## 📋 STEP 7: Redeploy (2 minutes)

1. Go to **"Deploys"** tab
2. Click **"Trigger deploy"** dropdown
3. Select **"Deploy site"**
4. Wait 2-3 minutes for rebuild
5. Done! ✅

---

## 📋 STEP 8: Custom Domain (Optional)

1. Go to **"Domain management"**
2. Click **"Add custom domain"**
3. Or click **"Change site name"** for a better netlify.app subdomain
4. Example: `insurance-broker.netlify.app`

---

## 📋 STEP 9: Test Your App! 🎉

1. Click on your Netlify URL
2. Your app should load! 🚀
3. Login with:
   - **Email**: `testuser@insurancebrokerage.com`
   - **Password**: `Test@123456`

---

## ✅ Why Netlify is Great

- ✅ **Excellent Next.js support** with official plugin
- ✅ **Free tier** - 100GB bandwidth/month
- ✅ **Auto HTTPS** - SSL certificates included
- ✅ **GitHub integration** - Auto-deploys on push
- ✅ **Custom domains** - Free subdomains
- ✅ **Great UI** - Easy to use dashboard

---

## 🆘 Troubleshooting

### If build fails:
1. Check the build logs for errors
2. Verify all environment variables are set correctly
3. Try "Clear cache and retry deploy"

### If you see module resolution errors:
1. The netlify.toml file should handle this
2. Try adding this to environment variables:
   ```
   Key: NEXT_USE_NETLIFY_EDGE
   Value: true
   ```

---

## 📱 Quick Access

**Netlify Dashboard**: https://app.netlify.com/
**Your Repository**: https://github.com/archit2501/insurance-brokerage-system

---

## 🎯 START HERE

**Go to**: https://app.netlify.com/signup

This will work great - Netlify has excellent Next.js support! 🚀

---

## 📝 Notes

- First deploy might take 5 minutes
- Subsequent deploys are faster (2-3 minutes)
- You get automatic SSL (HTTPS)
- Auto-deploys on every git push to main branch
- Free tier is very generous for your app size

**Let's get it deployed!** 🌐
