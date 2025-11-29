# Microsoft Authentication Setup

This document describes how to set up Microsoft authentication for your PDP application using Better Auth.

## Overview

Microsoft authentication is enabled using Microsoft Azure Entra ID (formerly Active Directory), allowing users to sign in and sign up with their Microsoft accounts.

## Prerequisites

- Microsoft Azure account
- Access to Microsoft Entra ID dashboard

## Step 1: Get Your Microsoft Credentials

1. Go to the [Microsoft Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** (now **Microsoft Entra ID**)
3. Click on **App registrations** → **New registration**
4. Fill in the application details:
   - **Name**: Your application name (e.g., "PDP - Sports Club Management")
   - **Supported account types**: Choose based on your needs:
     - **Single tenant**: Only users from your organization
     - **Multi-tenant**: Users from any organization
     - **Personal Microsoft accounts**: Anyone with a Microsoft account (recommended for broad access)
   - **Redirect URI**: Select "Web" and enter:
     - For local development: `http://localhost:3000/api/auth/callback/microsoft`
     - For production: `https://yourdomain.com/api/auth/callback/microsoft`
5. Click **Register**

### Get Client ID

After registration:
1. On your app's overview page, copy the **Application (client) ID**
2. This is your `MICROSOFT_CLIENT_ID`

### Create Client Secret

1. Go to **Certificates & secrets** in the left menu
2. Click **New client secret**
3. Add a description (e.g., "PDP App Secret")
4. Choose an expiration period
5. Click **Add**
6. **Important**: Copy the secret **Value** immediately (you won't be able to see it again!)
7. This is your `MICROSOFT_CLIENT_SECRET`

For more details, see the [Microsoft Entra ID documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app).

## Step 2: Configure Environment Variables

### For Convex Backend

Since this project uses Convex, you need to add the Microsoft credentials to your Convex environment variables:

```bash
# Using Convex CLI
npx convex env set MICROSOFT_CLIENT_ID "your-client-id-here"
npx convex env set MICROSOFT_CLIENT_SECRET "your-client-secret-here"
```

**For different environments:**

```bash
# Production
npx convex env set MICROSOFT_CLIENT_ID "your-client-id" --prod
npx convex env set MICROSOFT_CLIENT_SECRET "your-secret" --prod

# Development (default)
npx convex env set MICROSOFT_CLIENT_ID "your-client-id"
npx convex env set MICROSOFT_CLIENT_SECRET "your-secret"
```

### Verify Environment Variables

You can verify your environment variables are set:

```bash
npx convex env list
```

## Step 3: Backend Configuration

The backend configuration is already set up in `packages/backend/convex/auth.ts`:

```typescript
socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
  },
  microsoft: { 
    clientId: process.env.MICROSOFT_CLIENT_ID as string, 
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET as string, 
    // Optional configurations
    tenantId: 'common', // 'common' allows any Microsoft account
    authority: "https://login.microsoftonline.com", // Authentication authority URL
    prompt: "select_account", // Forces account selection
  }, 
},
```

### Configuration Options

- **tenantId**: 
  - `'common'`: (default) Allows any Microsoft account (personal or organizational)
  - `'organizations'`: Only organizational accounts
  - `'<tenant-id>'`: Specific tenant only
  
- **authority**: 
  - `https://login.microsoftonline.com`: Standard Entra ID (default)
  - `https://<tenant-id>.ciamlogin.com`: For CIAM scenarios
  
- **prompt**: 
  - `'select_account'`: Forces users to select an account
  - `'consent'`: Forces consent screen
  - `'login'`: Forces login

## Step 4: Frontend Implementation

The frontend is already configured with Microsoft sign-in/sign-up buttons.

### Sign In Form (`apps/web/src/components/sign-in-form.tsx`)

Users can sign in with Microsoft using:

```typescript
const signInWithMicrosoft = async () => {
  const data = await authClient.signIn.social({
    provider: "microsoft",
  });
};
```

### Sign Up Form (`apps/web/src/components/sign-up-form.tsx`)

Users can sign up with Microsoft using:

```typescript
const signUpWithMicrosoft = async () => {
  await authClient.signIn.social(
    {
      provider: "microsoft",
    },
    {
      onSuccess: () => {
        router.push("/");
        toast.success("Sign up successful");
      },
      onError: (error) => {
        toast.error(error.error.message || error.error.statusText);
      },
    }
  );
};
```

## Step 5: Testing

### Local Testing

1. Make sure your Convex environment variables are set
2. Run your development server:
   ```bash
   npm run dev
   ```
3. Navigate to `http://localhost:3000/login`
4. Click "Sign In With Microsoft" or "Sign Up With Microsoft"
5. You should be redirected to Microsoft's login page
6. After successful authentication, you'll be redirected back to your app

### Troubleshooting

**Error: "Redirect URI mismatch"**
- Ensure the redirect URI in Azure matches exactly: `http://localhost:3000/api/auth/callback/microsoft`
- Check that the base URL in `auth.ts` is set correctly

**Error: "Invalid client secret"**
- Double-check your `MICROSOFT_CLIENT_SECRET` environment variable
- The secret may have expired; generate a new one in Azure

**Error: "AADSTS50011: The reply URL specified in the request does not match"**
- Add the redirect URL to your Azure app registration under "Authentication" → "Platform configurations" → "Web"

**Users can't sign in from other organizations**
- Check your `tenantId` setting; use `'common'` for multi-tenant support
- Verify your app registration supports the desired account types

## Production Deployment

When deploying to production:

1. **Update Redirect URI** in Azure:
   - Go to your app registration in Azure
   - Navigate to **Authentication**
   - Add your production URL: `https://yourdomain.com/api/auth/callback/microsoft`

2. **Set Production Environment Variables**:
   ```bash
   npx convex env set MICROSOFT_CLIENT_ID "your-client-id" --prod
   npx convex env set MICROSOFT_CLIENT_SECRET "your-secret" --prod
   npx convex env set SITE_URL "https://yourdomain.com" --prod
   ```

3. **Verify SITE_URL**:
   - The `SITE_URL` environment variable must match your production domain
   - This is used by Better Auth to construct callback URLs

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use different credentials** for development and production
3. **Rotate secrets regularly** (set expiration dates in Azure)
4. **Monitor authentication logs** in Azure for suspicious activity
5. **Use HTTPS** in production (required by Microsoft)
6. **Implement rate limiting** for authentication attempts

## Additional Resources

- [Better Auth Microsoft Provider Documentation](https://www.better-auth.com/docs/authentication/microsoft)
- [Microsoft Entra ID Documentation](https://docs.microsoft.com/en-us/azure/active-directory/)
- [Better Auth Documentation](https://www.better-auth.com/)
- [Convex Environment Variables](https://docs.convex.dev/production/environment-variables)

## Support

If you encounter issues:
1. Check the Convex logs: `npx convex logs`
2. Check the browser console for client-side errors
3. Verify all environment variables are set correctly
4. Review the Azure app registration settings

