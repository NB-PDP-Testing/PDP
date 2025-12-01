# Vercel Deployment Guide for PDP

This guide will walk you through deploying your Next.js 16 PDP application to Vercel's free tier.

## Prerequisites

- A GitHub account (your code is already on GitHub)
- A Vercel account
- Your Convex deployment URL and credentials

### Important: Private GitHub Organizations

**If your repository is under a private GitHub organization** (like `NB-PDP-Testing/PDP`):
- Vercel's **Hobby (free) plan** does NOT support private org repositories
- You'll need to either:
  1. **Use Pro Trial** (14 days free) - Recommended to get started
  2. **Make repository public** (if acceptable)
  3. **Move repository to personal account** (if you have one)
  4. **Upgrade to Pro** ($20/month) - If you need private org support long-term

The Pro trial gives you 14 days to deploy and test, then you can decide.

## Step 1: Sign Up for Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **Sign Up** (top right)
3. Choose **Continue with GitHub**
4. Authorize Vercel to access your GitHub repositories
5. Complete the sign-up process

## Step 2: Import Your Project

1. In Vercel Dashboard, click **Add New Project**
2. You'll see a list of your GitHub repositories
3. Find and select **PDP** (or `NB-PDP-Testing/PDP`)
4. Click **Import**

## Step 3: Configure Project Settings

Vercel will auto-detect Next.js, but you need to configure for a monorepo:

### Framework Preset
- **Framework Preset**: Next.js (should be auto-detected)
- If not detected, select **Next.js** manually

### Root Directory
- **Root Directory**: Set to `apps/web` (IMPORTANT for monorepo!)
- This tells Vercel where your Next.js app is located
- Commands will run from `apps/web`, so we use `cd ..` to reach repo root

### Build Settings
- **Root Directory**: `apps/web` (set this first!)
- **Install Command**: `cd .. && npm install` (goes to repo root for npm workspaces)
- **Build Command**: `cd .. && npm run build` (goes to repo root for Turborepo)
- **Output Directory**: `.next` (relative to `apps/web` directory)

### Environment Variables

**Where to add them:**
1. In your Vercel project dashboard
2. Go to **Settings** (top navigation)
3. Click **Environment Variables** (left sidebar)
4. Click **Add New** button

**Add these variables:**

1. **`NEXT_PUBLIC_CONVEX_URL`**
   - Value: Your Convex deployment URL (e.g., `https://your-deployment.convex.cloud`)
   - Environments: Select **Production**, **Preview**, and **Development** (or just Production)
   - Click **Save**

2. **`NEXT_PUBLIC_CONVEX_SITE_URL`**
   - Value: Your Vercel URL (e.g., `https://pdp-web.vercel.app`)
   - You'll get this URL after the first deployment
   - Environments: Select **Production**, **Preview**, and **Development**
   - Click **Save**

3. **Any other environment variables** your app needs
   - Check your `.env.local` or `.env.example` files

**After adding/updating environment variables:**
- Go to **Deployments** tab
- Click the **"..."** menu on the latest deployment
- Click **Redeploy** to apply the new variables

## OAuth Provider Setup (Google & Microsoft)

**Important**: OAuth credentials are stored in **Convex**, not Vercel, because authentication is handled by your Convex backend.

### Step 1: Update Redirect URIs in OAuth Providers

You need to add your Vercel production URL as a redirect URI in both Google and Microsoft OAuth apps:

#### Google OAuth Console:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID
4. Click **Edit**
5. Under **Authorized redirect URIs**, add:
   - `https://pdp-web-eight.vercel.app/api/auth/callback/google`
6. Click **Save**

#### Microsoft Azure Portal:
1. Go to [Microsoft Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find your app registration
4. Go to **Authentication**
5. Under **Redirect URIs**, add:
   - `https://pdp-web-eight.vercel.app/api/auth/callback/microsoft`
6. Click **Save**

### Step 2: Set Convex Environment Variables

The OAuth credentials need to be set in Convex (not Vercel):

```bash
# Set Google OAuth credentials
npx convex env set GOOGLE_CLIENT_ID "your-google-client-id" --prod
npx convex env set GOOGLE_CLIENT_SECRET "your-google-client-secret" --prod

# Set Microsoft OAuth credentials
npx convex env set MICROSOFT_CLIENT_ID "your-microsoft-client-id" --prod
npx convex env set MICROSOFT_CLIENT_SECRET "your-microsoft-client-secret" --prod

# Set the site URL to your Vercel deployment
npx convex env set SITE_URL "https://pdp-web-eight.vercel.app" --prod
```

**Verify your environment variables:**
```bash
npx convex env list --prod
```

### Step 3: Verify Configuration

After setting the environment variables:
1. The OAuth buttons should work on your Vercel deployment
2. Users can sign in with Google or Microsoft accounts
3. Callbacks will redirect to: `https://pdp-web-eight.vercel.app/api/auth/callback/{provider}`

**Note**: If you change your Vercel domain, update:
- Redirect URIs in Google/Microsoft OAuth apps
- `SITE_URL` in Convex environment variables
- `NEXT_PUBLIC_CONVEX_SITE_URL` in Vercel environment variables

### Troubleshooting OAuth Buttons Not Working

If the Google/Microsoft buttons don't work after setup:

**Where to run these commands:**
- Open your terminal (Terminal app on Mac, or VS Code integrated terminal)
- Navigate to your project root: `cd /Users/neil/Documents/GitHub/PDP`
- Run the commands from there

1. **Verify OAuth Credentials are Set in Convex:**
   ```bash
   npx convex env list --prod
   ```
   You should see:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `MICROSOFT_CLIENT_ID`
   - `MICROSOFT_CLIENT_SECRET`
   - `SITE_URL` (should be `https://pdp-web-eight.vercel.app`)

2. **Check Browser Console:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Click the OAuth button
   - Look for any error messages
   - Common errors:
     - "Missing GOOGLE_CLIENT_ID" → Credentials not set in Convex
     - "Redirect URI mismatch" → Redirect URI not added in OAuth provider
     - CORS errors → Check `trustedOrigins` in auth config

3. **Verify Redirect URIs Match Exactly:**
   - Google: Must be exactly `https://pdp-web-eight.vercel.app/api/auth/callback/google`
   - Microsoft: Must be exactly `https://pdp-web-eight.vercel.app/api/auth/callback/microsoft`
   - No trailing slashes, exact match required

4. **Check Convex Logs:**
   ```bash
   # From project root directory
   npx convex logs --prod
   ```
   Look for authentication-related errors

5. **Verify SITE_URL is Set Correctly:**
   ```bash
   # From project root directory
   npx convex env get SITE_URL --prod
   ```
   Should return: `https://pdp-web-eight.vercel.app`

6. **Test OAuth Flow:**
   - Click the button
   - Should redirect to Google/Microsoft login
   - After login, should redirect back to your app
   - If it redirects but shows an error, check Convex logs

7. **Common Issues:**
   - **Buttons do nothing**: Check browser console for JavaScript errors
   - **Redirects but fails**: Check Convex logs for backend errors
   - **"Invalid client" error**: OAuth credentials are wrong or not set
   - **"Redirect URI mismatch"**: Redirect URI not added in OAuth provider console

## Step 4: Deploy

1. Click **Deploy** button
2. Vercel will:
   - Clone your repository
   - Install dependencies
   - Build your Next.js app
   - Deploy to production
3. Wait for the build to complete (usually 2-5 minutes)

## Step 5: Update Convex Site URL

After deployment:

1. Copy your Vercel deployment URL (e.g., `https://pdp.vercel.app`)
2. Go to your Convex Dashboard
3. Update the site URL to match your Vercel URL
4. This ensures authentication redirects work correctly

## Step 6: Verify Deployment

1. Visit your Vercel deployment URL
2. Test:
   - Landing page loads
   - Authentication flows work
   - API routes function (`/api/auth/[...all]`)
   - All features work as expected

## Automatic Deployments

Vercel automatically deploys:
- **Production**: Every push to `main` branch
- **Preview**: Every pull request and push to other branches
- Each preview gets a unique URL for testing

## Custom Domain (Optional)

1. In Vercel Dashboard → Your Project → Settings → Domains
2. Click **Add Domain**
3. Enter your domain name
4. Follow DNS configuration instructions
5. Vercel automatically provisions SSL certificates

## Monorepo Configuration

A `vercel.json` file has been added, but the **most important setting is in the Vercel Dashboard**:

**CRITICAL: Set Root Directory to `apps/web`**

1. Go to **Settings** → **General**
2. Find **Root Directory**
3. Set it to: `apps/web`
4. Click **Save**

The `vercel.json` file matches these settings. The key is that commands use `cd ..` to reach the repo root where npm workspaces can resolve dependencies.

**If you still get build errors:**
1. **Verify Root Directory** (MOST IMPORTANT):
   - Go to **Settings** → **General**
   - **Root Directory** MUST be: `apps/web`
2. **Check Install Command**:
   - Should be: `cd .. && npm install` (goes to repo root for workspaces)
3. **Check Build Command**:
   - Should be: `cd .. && npm run build` (goes to repo root for Turborepo)
4. **Check Output Directory**:
   - Should be: `.next` (relative to `apps/web`)
5. **Check for Configuration Warnings**:
   - If you see "Configuration Settings differ" warning, click to sync or redeploy
4. **Redeploy**:
   - After making changes, go to **Deployments**
   - Click **"..."** on latest deployment → **Redeploy**

## Troubleshooting

### 404 Error on Deployment

If you get a 404 error after deployment:

1. **Check Build Logs**:
   - Go to **Deployments** tab
   - Click on the latest deployment
   - Check if the build completed successfully
   - Look for any errors

2. **Verify Output Directory**:
   - Go to **Settings** → **General**
   - Check **Output Directory** is set to: `apps/web/.next`
   - The `vercel.json` file should handle this automatically

3. **Verify Root Directory**:
   - In **Settings** → **General**
   - **Root Directory** should be empty (default: `/`)
   - This tells Vercel to use the repository root

4. **Check Build Command**:
   - Should be: `npm run build`
   - This runs Turbo which builds the `web` workspace

5. **Redeploy**:
   - After making changes, go to **Deployments**
   - Click **"..."** on latest deployment → **Redeploy**

### Build Fails

- Check build logs in Vercel Dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Vercel uses Node 18+ by default)
- Check that `npm run build` works locally

### Environment Variables Not Loading

- Verify variables are set in Vercel project settings
- Ensure variables start with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding new environment variables

### Submodule Issue

If you see submodule errors:
- Vercel should handle this automatically
- If not, the submodule (`mvp-app`) isn't needed for the build anyway
- You can ignore submodule warnings if the build succeeds

### API Routes Not Working

- Ensure you're not using static export (`output: "export"` in `next.config.ts`)
- Check that routes are in `app/api` directory
- Verify environment variables are set correctly

## Vercel Free Tier Limits

- **Bandwidth**: 100 GB/month
- **Build Time**: 6,000 minutes/month
- **Serverless Function Execution**: 100 GB-hours/month
- **Edge Network**: Global CDN included
- **Custom Domains**: Unlimited
- **HTTPS**: Automatic SSL certificates

These limits are generous for most projects and should be sufficient for your PDP app.

## Next Steps After Deployment

1. **Set up custom domain** (if you have one)
2. **Configure preview deployments** for pull requests
3. **Set up analytics** (optional, in Vercel Dashboard)
4. **Configure environment variables** for different environments
5. **Set up webhooks** if needed for CI/CD

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Vercel Support](https://vercel.com/support)
