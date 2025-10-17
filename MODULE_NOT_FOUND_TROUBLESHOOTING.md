# Module Not Found Error - Troubleshooting Guide

## Problem
Vercel build is failing with: `Module not found: Can't resolve '@/lib/api'`

## Root Cause Analysis

1. **File exists locally**: `src/lib/api.ts` exists and works in local builds
2. **File is in Git**: Confirmed via `git ls-files src/lib/api.ts`
3. **Vercel deployment method**: Using Vercel CLI direct deployment (not Git-connected)
4. **Build difference**: Local builds succeed, Vercel builds fail

## What We Know

- Local build with `npm run build` works (with warnings about test routes)
- The `@/lib/api` module exists at `src/lib/api.ts`
- tsconfig.json correctly maps `@/*` to `./src/*`
- Seven files import from `@/lib/api`:
  - `src/app/clients/page.tsx`
  - `src/app/banks/page.tsx`
  - `src/app/agents/page.tsx`
  - `src/app/audit/page.tsx`
  - `src/app/lobs/page.tsx`
  - `src/app/users/page.tsx`
  - `src/app/api/auth/health/route.ts`

## Potential Solutions

### Solution 1: Connect Vercel to GitHub (RECOMMENDED)

Instead of using Vercel CLI direct deployment, connect your Vercel project to GitHub:

1. Go to https://vercel.com/archits-projects-db934b50/mutual_insurance_broker
2. Click on "Settings" tab
3. Click on "Git" section
4. Click "Connect Git Repository"
5. Select GitHub and choose your repository: `archit2501/insurance-brokerage-system`
6. Configure the repository settings:
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
7. Add environment variables in the "Environment Variables" tab:
   - `TURSO_CONNECTION_URL`: libsql://insurance-brokrage-system-archit2501.aws-ap-south-1.turso.io
   - `TURSO_AUTH_TOKEN`: (your token from .env)
   - `BETTER_AUTH_SECRET`: (your secret from .env)
   - `BETTER_AUTH_URL`: https://mutualinsurancebroker-gttqapplq-archits-projects-db934b50.vercel.app
   - `NODE_ENV`: production

### Solution 2: Fix TypeScript Configuration

Ensure `tsconfig.json` has the correct configuration:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "moduleResolution": "bundler"
  }
}
```

### Solution 3: Use Relative Imports

If module resolution continues to fail, we can change all imports from `@/lib/api` to relative paths. However, this is not ideal.

### Solution 4: Clear Vercel Cache

Sometimes Vercel's cache can cause issues. Try:

1. Go to Vercel dashboard
2. Settings → General
3. Scroll to "Build & Development Settings"
4. Clear build cache

## Current Status

- Attempting new deployment with test file to verify module resolution
- Environment variables already added to Vercel
- Awaiting build results

## Next Steps

1. **If current deployment succeeds**: The issue was temporary/cache-related
2. **If deployment fails again**: Switch to GitHub-connected deployment (Solution 1)
3. **If still fails**: Investigate tsconfig.json configuration more deeply

## Files to Monitor

- Build logs at: https://vercel.com/archits-projects-db934b50/mutual_insurance_broker
- Test endpoint: `/api/test-api-file` (created to verify api.ts resolution)

## Important Notes

- The app uses Vercel CLI direct deployment, not Git-connected deployment
- This means files are uploaded directly from your local machine
- Git-connected deployment would pull from GitHub automatically and is more reliable
- Local builds work perfectly, so the code is correct
