# OAuth Redirect URI Fix for PlayerArc.io

## 🚨 Error: `redirect_uri_mismatch`

This error occurs when the redirect URI in your OAuth request doesn't match what's configured in Google/Microsoft Console.

---

## ✅ Current Environment Variables

**Development (Convex):** `http://localhost:3000`  
**Production (Convex):** `https://www.playerarc.io/` ⚠️ (has trailing slash)

---

## 🔧 Step-by-Step Fix

### 1. Fix Trailing Slash in Production SITE_URL

The trailing slash can cause issues. Remove it:

```bash
cd packages/backend
npx convex env set SITE_URL "https://www.playerarc.io" --prod
```

Verify:
```bash
npx convex env get SITE_URL --prod
```
Should return: `https://www.playerarc.io` (no trailing slash)

---

### 2. Update Google OAuth Console

**🔗 Go to:** https://console.cloud.google.com/apis/credentials

1. **Select your project**
2. **Click on your OAuth 2.0 Client ID** (the one used for this app)
3. **Under "Authorized redirect URIs"**, you need EXACTLY these URIs:

#### For Better Auth (Current Setup):
```
https://www.playerarc.io/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

#### Important Notes:
- ⚠️ **NO trailing slashes** on the domain
- ✅ Must include both `http` (dev) and `https` (prod)
- ✅ Path is `/api/auth/callback/google` (Better Auth standard)
- ❌ Remove any old URIs with previous domain names
- ❌ Remove any URIs with trailing slashes

4. **Click "Save"**

---

### 3. Update Microsoft Azure OAuth

**🔗 Go to:** https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade

1. **Select your App Registration**
2. **Go to "Authentication"** (left sidebar)
3. **Under "Redirect URIs" → Web**, add/update:

#### For Better Auth (Current Setup):
```
https://www.playerarc.io/api/auth/callback/microsoft
http://localhost:3000/api/auth/callback/microsoft
```

#### Important Notes:
- ⚠️ **NO trailing slashes** on the domain
- ✅ Must include both `http` (dev) and `https` (prod)
- ✅ Path is `/api/auth/callback/microsoft` (Better Auth standard)
- ❌ Remove any old URIs with previous domain names
- ❌ Remove any URIs with trailing slashes

4. **Click "Save"**

---

### 4. Verify Convex Deployment

After making these changes, redeploy Convex to ensure the environment variables are loaded:

```bash
cd packages/backend
npx convex deploy --prod
```

---

### 5. Clear Browser Cache & Test

1. **Clear browser cookies and cache** for:
   - `playerarc.io`
   - `accounts.google.com`
   - `login.microsoftonline.com`

2. **Try signing in again:**
   - Go to https://www.playerarc.io/login
   - Click "Sign in with Google"
   - Should redirect successfully

---

## 🔍 Debugging Tips

### If Google Still Fails:

1. **Check the actual redirect URI in the error:**
   - The error message shows what URI was sent
   - Compare it exactly to what's in Google Console

2. **Common issues:**
   - Extra trailing slash: `https://www.playerarc.io/` vs `https://www.playerarc.io`
   - Wrong subdomain: `www.playerarc.io` vs `playerarc.io`
   - HTTP vs HTTPS mismatch
   - Missing `/api/auth/callback/google` path

3. **Check in browser console:**
   - Open DevTools → Network tab
   - Look for the OAuth redirect request
   - Check the `redirect_uri` parameter in the URL

### If Microsoft Still Fails:

1. **Verify Tenant ID:**
   - Your config uses `tenantId: "common"` which allows any Microsoft account
   - If you want to restrict to a specific organization, use your tenant ID

2. **Check App Registration Status:**
   - Make sure the app is not disabled
   - Verify API permissions are granted
   - Check if admin consent is required

---

## 📋 Complete Redirect URI Checklist

### Google OAuth Console
- [ ] Removed all old domain URIs (if any)
- [ ] Added: `https://www.playerarc.io/api/auth/callback/google`
- [ ] Added: `http://localhost:3000/api/auth/callback/google`
- [ ] No trailing slashes on domain
- [ ] Clicked "Save"

### Microsoft Azure Portal
- [ ] Removed all old domain URIs (if any)
- [ ] Added: `https://www.playerarc.io/api/auth/callback/microsoft`
- [ ] Added: `http://localhost:3000/api/auth/callback/microsoft`
- [ ] No trailing slashes on domain
- [ ] Clicked "Save"

### Convex Environment
- [ ] `SITE_URL` (dev): `http://localhost:3000`
- [ ] `SITE_URL` (prod): `https://www.playerarc.io` (no trailing slash)
- [ ] Redeployed Convex with new env vars

### Vercel Environment
- [ ] Check if you have `NEXT_PUBLIC_SITE_URL` or similar
- [ ] Should match: `https://www.playerarc.io`

---

## 🎯 Quick Test After Changes

1. **Test Google OAuth:**
   ```
   https://www.playerarc.io/login
   → Click "Sign in with Google"
   → Should redirect to Google
   → After auth, should return to your app
   ```

2. **Test Microsoft OAuth:**
   ```
   https://www.playerarc.io/login
   → Click "Sign in with Microsoft"
   → Should redirect to Microsoft
   → After auth, should return to your app
   ```

3. **Check console for errors:**
   - Open browser DevTools
   - Look for any auth-related errors
   - Check Network tab for failed requests

---

## 🆘 Still Not Working?

### Get the Exact Error Details:

1. **In Google Console** (while logged in as developer):
   - The error page should show "If you are a developer, see error details"
   - Click that link to see the full error message
   - It will show the exact redirect_uri that was sent

2. **Compare URIs character by character:**
   - What's in your Google Console
   - What's being sent in the OAuth request
   - What's in your `SITE_URL` env var

3. **Common gotchas:**
   - Port numbers in dev: `localhost:3000` vs `localhost:5173`
   - Protocol: `http` vs `https`
   - Subdomain: `www` vs no `www`
   - Path: `/api/auth/callback/google` vs `/auth/callback/google`
   - Trailing slashes anywhere

---

## 📝 Better Auth Default Paths

For reference, Better Auth uses these default callback paths:

- **Google:** `/api/auth/callback/google`
- **Microsoft:** `/api/auth/callback/microsoft`
- **GitHub:** `/api/auth/callback/github`
- **etc.**

These are defined by Better Auth and match your `http.ts` routing:

```typescript
// convex/http.ts
const http = httpRouter();
http.route({
  pathPrefix: "/api/auth/",
  method: "GET", "POST", etc.,
  handler: httpAction(async (ctx, req) => {
    // Better Auth handles the callback
  }),
});
```

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ Clicking "Sign in with Google" redirects to Google
- ✅ Google login page appears (no error)
- ✅ After logging in, you're redirected back to PlayerArc
- ✅ You see a success toast: "Welcome back! Let's get to work."
- ✅ You're redirected to `/orgs/current` or your dashboard

---

## 🔐 Security Notes

1. **Never commit OAuth secrets to git**
   - `GOOGLE_CLIENT_SECRET`
   - `MICROSOFT_CLIENT_SECRET`

2. **Keep them in environment variables only:**
   - Convex environment (for backend)
   - Vercel environment (if needed)

3. **Restrict OAuth to your domains only:**
   - Only add redirect URIs you actually use
   - Remove any test/old URIs

---

## 📞 Need Help?

If you're still stuck after following these steps:

1. **Share the exact error message** (redact any sensitive info)
2. **Share what redirect URI** the error says was sent
3. **Confirm what URIs** are configured in Google/Microsoft Console
4. **Confirm what SITE_URL** is set in Convex (dev & prod)

Better Auth docs: https://www.better-auth.com/docs/integrations/oauth

