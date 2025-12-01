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
- **Root Directory**: Leave empty (default: `/`)
- OR set to `apps/web` if you want to be explicit

### Build Settings
- **Build Command**: `npm run build` (Vercel will run this from the root)
  - OR if root is set to `apps/web`: Leave empty (auto-detected)
- **Output Directory**: Leave empty (auto-detected as `.next`)
- **Install Command**: `npm install` (default)

### Environment Variables

Click **Environment Variables** and add:

1. **`NEXT_PUBLIC_CONVEX_URL`**
   - Value: Your Convex deployment URL (e.g., `https://your-deployment.convex.cloud`)
   - Add to: Production, Preview, and Development

2. **`NEXT_PUBLIC_CONVEX_SITE_URL`**
   - Value: Will be your Vercel URL (e.g., `https://pdp.vercel.app`)
   - You can update this after first deployment
   - Add to: Production, Preview, and Development

3. **Any other environment variables** your app needs
   - Check your `.env.local` or `.env.example` files

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

Since you're using a Turborepo monorepo, Vercel should automatically:
- Detect the monorepo structure
- Run `npm install` from the root
- Run `npm run build` which uses Turbo
- Build only the `web` workspace

If you encounter issues, you can explicitly set:
- **Root Directory**: `/`
- **Build Command**: `npm run build`
- **Output Directory**: `apps/web/.next` (if needed)

## Troubleshooting

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
