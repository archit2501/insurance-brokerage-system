# ✅ Pre-Deployment Checklist

## Before Deploying

### 1. Environment Variables Ready
- [ ] `TURSO_CONNECTION_URL` - Your Turso database URL
- [ ] `TURSO_AUTH_TOKEN` - Your Turso auth token  
- [ ] `BETTER_AUTH_SECRET` - Generate with: `openssl rand -base64 32`
- [ ] `BETTER_AUTH_URL` - Will be your deployment URL (update after first deploy)
- [ ] `NODE_ENV=production` - Set automatically by most platforms

### 2. Code Quality
- [ ] Run `npm run build` locally - succeeds without errors
- [ ] Test all features locally - working correctly
- [ ] No hardcoded secrets in code
- [ ] All sensitive data in `.env` file
- [ ] `.env` file is in `.gitignore`

### 3. Database
- [ ] Turso database is accessible remotely
- [ ] All migrations applied successfully
- [ ] Test user can be created
- [ ] Database connection string uses `libsql://` protocol

### 4. Git Repository
- [ ] Code committed to git
- [ ] Pushed to GitHub/GitLab/Bitbucket
- [ ] Repository is accessible (public or give access to deploy service)
- [ ] No sensitive files committed (check `.gitignore`)

### 5. Dependencies
- [ ] All dependencies in `package.json`
- [ ] `package-lock.json` committed
- [ ] Node.js version specified in `package.json` (engines field)

---

## Deployment Steps (Vercel)

### Option A: Vercel Dashboard (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push
   ```

2. **Deploy on Vercel**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your repository
   - Framework: Next.js (auto-detected)
   - Add environment variables
   - Click "Deploy"

3. **Post-Deployment**
   - [ ] Note deployment URL
   - [ ] Update `BETTER_AUTH_URL` with deployment URL
   - [ ] Redeploy (Vercel Dashboard → Redeploy)
   - [ ] Test deployed app
   - [ ] Register test user
   - [ ] Test one complete workflow

### Option B: Vercel CLI

1. **Install Vercel CLI**
   ```powershell
   npm install -g vercel
   ```

2. **Login**
   ```powershell
   vercel login
   ```

3. **Deploy**
   ```powershell
   vercel
   ```

4. **Set Environment Variables**
   ```powershell
   vercel env add TURSO_CONNECTION_URL
   vercel env add TURSO_AUTH_TOKEN
   vercel env add BETTER_AUTH_SECRET
   ```

5. **Production Deploy**
   ```powershell
   vercel --prod
   ```

---

## Post-Deployment Testing

### Test Checklist
- [ ] Homepage loads (https://your-app.vercel.app)
- [ ] Registration works
- [ ] Login works
- [ ] Create client (Individual)
- [ ] Create client (Company)
- [ ] Create insurer
- [ ] Create LOB
- [ ] Create policy
- [ ] Generate credit note
- [ ] All auto-generated codes working
- [ ] No console errors in browser
- [ ] Mobile responsive

### If Issues Occur
1. Check Vercel logs: Vercel Dashboard → Project → Logs
2. Check browser console for errors (F12)
3. Verify environment variables are set
4. Test database connection
5. Redeploy if needed

---

## Sharing with Client

### Create Access Document

```markdown
═══════════════════════════════════════════════
   INSURANCE BROKERAGE SYSTEM - UAT ACCESS
═══════════════════════════════════════════════

🌐 Application URL:
   https://your-actual-url.vercel.app

🔐 Test Credentials:
   Email:    testuser@insurancebrokerage.com
   Password: Test@123456

📋 Getting Started:
   1. Click the application URL above
   2. Click "Register" to create your account
   3. Or "Login" if you already registered
   4. Start testing the features

🎯 Key Features to Test:
   ✅ Clients Management
      - Create Individual clients (no CAC/TIN required)
      - Create Company clients (CAC/TIN required)
   
   ✅ Insurers Management
      - Add insurance companies
   
   ✅ Agents Management
      - Create agent profiles
   
   ✅ Banks Management
      - Add bank accounts
   
   ✅ Lines of Business (LOBs)
      - Setup insurance product types
   
   ✅ Policies
      - Create insurance policies
      - Auto-generated policy numbers
   
   ✅ Financial Notes
      - Generate Credit Notes (CN)
      - Generate Debit Notes (DN)
      - Automatic calculations

📊 Expected Behavior:
   - All codes auto-generate (MEIBL/XX/2025/...)
   - Financial calculations are automatic
   - Data is persisted (saved permanently)
   - Real-time validation on forms

🐛 How to Report Issues:
   1. Take a screenshot
   2. Describe what you were trying to do
   3. Note any error messages
   4. Email to: your.email@company.com

⏰ Availability:
   24/7 - Online and ready for testing

🔒 Security:
   - HTTPS enabled (secure connection)
   - All data encrypted
   - Session-based authentication
   - Automatic logout after inactivity

═══════════════════════════════════════════════
```

---

## Monitoring Deployment

### Check Status
```powershell
# Using Vercel CLI
vercel ls

# Check logs
vercel logs your-deployment-url
```

### Performance Monitoring
- Vercel Dashboard → Analytics
- Check response times
- Monitor error rates
- Track usage

---

## Quick Commands Reference

```powershell
# Test build locally
npm run build
npm start

# Deploy to Vercel
vercel

# Deploy to production
vercel --prod

# Check deployments
vercel ls

# View logs
vercel logs

# Remove deployment
vercel remove YOUR_DEPLOYMENT_URL
```

---

## Troubleshooting

### Build Fails
```powershell
# Test locally first
npm run build

# Clear cache and rebuild
rm -rf .next
npm run build
```

### Environment Variables Not Working
- Redeploy after adding/changing env vars
- Check spelling and format
- Ensure no spaces around values

### Database Connection Issues
- Verify Turso URL format: `libsql://...`
- Check auth token is correct
- Test connection from local machine first

### Auth Issues
- Ensure BETTER_AUTH_URL matches deployment URL
- Must use HTTPS (automatic on Vercel)
- Check BETTER_AUTH_SECRET is set

---

## Rollback Plan

If deployment fails:
1. Check previous deployment: `vercel ls`
2. Promote previous version: Vercel Dashboard → Deployments → Promote
3. Or fix and redeploy: `vercel --prod`

---

## Cost Estimate

### Vercel Free Tier
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Preview deployments
- ⚠️ 10s serverless function timeout
- ⚠️ Hobby projects only

### Vercel Pro ($20/month)
- ✅ Everything in Free
- ✅ 60s function timeout
- ✅ 1TB bandwidth
- ✅ Commercial use
- ✅ Team collaboration
- ✅ Priority support

For UAT testing: **Free tier is sufficient**  
For production: **Pro tier recommended**

---

**Ready to deploy? Run: `.\deploy.ps1` for guided deployment**
