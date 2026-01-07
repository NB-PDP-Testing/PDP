# Troubleshooting Vercel + Convex Deployment Issues

## Error: "Detected a non-production build environment and CONVEX_DEPLOY_KEY for a production Convex deployment"

This error occurs when:
- You're deploying a **preview/branch build** (not production)
- The `CONVEX_DEPLOY_KEY` environment variable is set
- Convex detects this mismatch and warns you

## Solutions

### Solution 1: Remove CONVEX_DEPLOY_KEY from Preview/Development (Recommended)

**For preview builds, you typically don't need to deploy Convex** - you can just use an existing Convex deployment URL.

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Find `CONVEX_DEPLOY_KEY`
3. Click on it to edit
4. Under **Environment**, **uncheck**:
   - ✅ Preview
   - ✅ Development
5. **Keep checked**:
   - ✅ Production
6. Click **Save**

**Result**: Preview builds won't try to deploy Convex, they'll just use the `NEXT_PUBLIC_CONVEX_URL` you've already set.

### Solution 2: Use Different Convex Deployments

If you want preview builds to deploy to a separate Convex deployment:

1. Create a separate Convex deployment for preview/staging:
   ```bash
   cd packages/backend
   npx convex deploy --project-name your-preview-project
   ```

2. In Vercel, set different environment variables per environment:
   - **Production**: `CONVEX_DEPLOY_KEY` = production key
   - **Preview**: `CONVEX_DEPLOY_KEY` = preview/staging key (or remove it)
   - **Development**: `CONVEX_DEPLOY_KEY` = dev key (or remove it)

### Solution 3: Skip Convex Deployment for Preview Builds

If your build command includes `npx convex deploy`, you can conditionally skip it for preview builds.

**Option A: Modify build command in Vercel Dashboard**

1. Go to **Settings** → **General** → **Build & Development Settings**
2. Change **Build Command** to:
   ```bash
   cd .. && ([ "$VERCEL_ENV" = "production" ] && npm run build:with-convex || npm run build)
   ```

3. Add a new script to `package.json`:
   ```json
   {
     "scripts": {
       "build:with-convex": "cd packages/backend && npx convex deploy --cmd 'cd ../../apps/web && turbo run build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL"
     }
   }
   ```

**Option B: Use Convex's `--once` flag (if supported)**

Some versions of Convex support a `--once` flag that might help, but this isn't the recommended approach.

### Solution 4: Check Your Build Command Configuration

The error shows this command is running:
```
cd ../../packages/backend && npx convex deploy --cmd 'cd ../../apps/web && turbo run build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
```

**Check where this is configured:**

1. **Vercel Dashboard** → **Settings** → **General** → **Build & Development Settings**
   - Check if **Build Command** is set to something custom
   - If it is, it should match your `vercel.json` or you should update it

2. **Your `vercel.json`** currently has:
   ```json
   {
     "buildCommand": "cd .. && npm run build"
   }
   ```
   - This should just run `turbo build`, not deploy Convex
   - If Vercel is running a different command, there might be a mismatch

3. **Check for build scripts** in `package.json` that might be calling Convex deploy

## Recommended Setup

For most projects, the best setup is:

1. **Production builds**: Deploy Convex and build Next.js
2. **Preview builds**: Just build Next.js (use existing Convex deployment)

**Environment Variables in Vercel:**

| Variable | Production | Preview | Development |
|----------|-----------|---------|-------------|
| `CONVEX_DEPLOY_KEY` | ✅ Set | ❌ Not set | ❌ Not set |
| `NEXT_PUBLIC_CONVEX_URL` | ✅ Set | ✅ Set | ✅ Set |

**Build Command:**
- Should be: `cd .. && npm run build` (from `vercel.json`)
- This runs `turbo build` which builds the Next.js app
- Convex deployment should happen separately or only in production

## Quick Fix Steps

1. **Go to Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. **Find `CONVEX_DEPLOY_KEY`**
3. **Edit it** and uncheck **Preview** and **Development** environments
4. **Save**
5. **Redeploy** the failed deployment

This should fix the immediate error. Preview builds will use the Convex URL you've already configured without trying to deploy.

## Verify Your Setup

After making changes:

1. **Check Build Command** in Vercel Dashboard matches `vercel.json`
2. **Check Environment Variables** are set correctly per environment
3. **Test a preview deployment** - it should build without Convex deploy
4. **Test a production deployment** - it should deploy Convex if configured

## Additional Notes

- **Convex deployment** is typically only needed when you've changed Convex functions/schema
- **Preview builds** usually just need the Convex URL to connect to an existing deployment
- **Production builds** might need to deploy Convex if you want automatic deployments, but you can also deploy Convex separately via CI/CD or manually




