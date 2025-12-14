# Invitation Acceptance Flow - Complete Review

## Overview

This document reviews all possible flows when a user clicks an invitation link, covering all authentication states and email matching scenarios.

## Current Implementation Status

### ✅ Scenario 1: User NOT Logged In → Clicks Invitation Link

**Flow:**
1. User clicks invitation link → `/orgs/accept-invitation/[invitationId]`
2. Page checks session → No session found
3. Redirects to → `/login?redirect=/orgs/accept-invitation/[invitationId]`
4. User can:
   - Sign in with email/password
   - Sign in with Google
   - Sign in with Microsoft
   - Click "Sign up" link → Goes to `/signup` (⚠️ **ISSUE: redirect parameter lost**)

**Current Status:**
- ✅ Login page handles redirect parameter
- ✅ Sign-in form uses redirect parameter
- ⚠️ **ISSUE**: Signup page doesn't handle redirect parameter
- ⚠️ **ISSUE**: Signup form doesn't use redirect parameter

**Fix Needed:**
- Update signup page to read redirect parameter
- Update signup form to use redirect parameter
- Ensure social signup (Google/Microsoft) also uses redirect

### ✅ Scenario 2: User Logged In with MATCHING Email → Clicks Invitation Link

**Flow:**
1. User clicks invitation link → `/orgs/accept-invitation/[invitationId]`
2. Page checks session → Session found
3. Fetches invitation details
4. Compares emails → ✅ Match
5. Automatically accepts invitation
6. Redirects to organization dashboard

**Current Status:**
- ✅ Pre-check implemented
- ✅ Email comparison (case-insensitive)
- ✅ Automatic acceptance on match
- ✅ Shows invitation details while checking

### ✅ Scenario 3: User Logged In with DIFFERENT Email → Clicks Invitation Link

**Flow:**
1. User clicks invitation link → `/orgs/accept-invitation/[invitationId]`
2. Page checks session → Session found
3. Fetches invitation details
4. Compares emails → ❌ No match
5. Shows mismatch warning with:
   - Invitation email
   - Current logged-in email
   - "Sign Out and Sign In with [invitation email]" button
6. User clicks button → Signs out → Redirects to login with redirect parameter
7. User signs in with correct email → Redirects back to invitation page
8. Emails now match → Invitation accepted

**Current Status:**
- ✅ Pre-check implemented
- ✅ Mismatch detection
- ✅ Clear warning message
- ✅ Sign out button with redirect preservation
- ✅ Redirect back to invitation page after login

## Issues Found

### Issue 1: Signup Page Doesn't Handle Redirect Parameter ⚠️

**Problem:**
- When user clicks invitation link while not logged in
- Redirects to `/login?redirect=/orgs/accept-invitation/[invitationId]`
- User clicks "Sign up" link
- Goes to `/signup` (redirect parameter is lost)
- After signup, user goes to `/orgs/current` instead of back to invitation

**Fix:**
- Update signup page to read redirect parameter from URL
- Pass redirect to signup form
- Use redirect in signup success callback

### Issue 2: Signup Form Doesn't Use Redirect Parameter ⚠️

**Problem:**
- Signup form hardcodes redirect to `/orgs/current`
- Doesn't check for redirect parameter
- Social signup (Google/Microsoft) also hardcodes callback URL

**Fix:**
- Read redirect parameter in signup form
- Use redirect parameter in email/password signup
- Use redirect parameter in social signup callback URLs

### Issue 3: Signup Link on Login Page Doesn't Preserve Redirect ⚠️

**Problem:**
- Login page has redirect parameter: `/login?redirect=/orgs/accept-invitation/[id]`
- "Sign up" link goes to `/signup` (doesn't include redirect)
- Redirect parameter is lost

**Fix:**
- Update signup link on login page to preserve redirect parameter
- Or update signup page to read redirect from referrer/query params

## Recommended Fixes

### Fix 1: Update Signup Page to Handle Redirect

```typescript
// apps/web/src/app/signup/page.tsx
function RedirectToOrgs({ router }: { router: ReturnType<typeof useRouter> }) {
  const user = useCurrentUser();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  useEffect(() => {
    if (user) {
      if (redirect) {
        router.push(redirect as Route);
      } else if (user?.isPlatformStaff) {
        router.push("/orgs" as Route);
      } else {
        router.push("/orgs/current" as Route);
      }
    }
  }, [router, user, redirect]);
}
```

### Fix 2: Update Signup Form to Use Redirect

```typescript
// apps/web/src/components/sign-up-form.tsx
export default function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  // In onSuccess callback:
  onSuccess: () => {
    const destination = redirect || "/orgs/current";
    router.push(destination as Route);
    toast.success("🎉 Welcome to PDP! Your account is ready.");
  }

  // In social signup:
  callbackURL: redirect || "/orgs/current",
}
```

### Fix 3: Update Signup Link on Login Page

```typescript
// apps/web/src/components/sign-in-form.tsx
// In the "Sign up" link:
<a
  href={`/signup${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
  style={{ color: "var(--pdp-green)" }}
>
  Sign up
</a>
```

## Complete Flow Diagrams

### Flow A: Not Logged In → Sign In with Matching Email

```
1. Click invitation link
   ↓
2. /orgs/accept-invitation/[id]
   ↓
3. No session → Redirect to /login?redirect=/orgs/accept-invitation/[id]
   ↓
4. User signs in with matching email
   ↓
5. Redirect back to /orgs/accept-invitation/[id]
   ↓
6. Session found → Fetch invitation → Compare emails → ✅ Match
   ↓
7. Accept invitation → Redirect to organization
```

### Flow B: Not Logged In → Sign Up with Matching Email

```
1. Click invitation link
   ↓
2. /orgs/accept-invitation/[id]
   ↓
3. No session → Redirect to /login?redirect=/orgs/accept-invitation/[id]
   ↓
4. User clicks "Sign up" → Goes to /signup (⚠️ redirect lost)
   ↓
5. User signs up with matching email
   ↓
6. Redirects to /orgs/current (⚠️ should go back to invitation)
   ↓
7. /orgs/current → No org → /orgs/join (⚠️ invitation lost)
```

**After Fix:**
```
1. Click invitation link
   ↓
2. /orgs/accept-invitation/[id]
   ↓
3. No session → Redirect to /login?redirect=/orgs/accept-invitation/[id]
   ↓
4. User clicks "Sign up" → Goes to /signup?redirect=/orgs/accept-invitation/[id]
   ↓
5. User signs up with matching email
   ↓
6. Redirects back to /orgs/accept-invitation/[id]
   ↓
7. Session found → Fetch invitation → Compare emails → ✅ Match
   ↓
8. Accept invitation → Redirect to organization
```

### Flow C: Logged In with Matching Email

```
1. Click invitation link
   ↓
2. /orgs/accept-invitation/[id]
   ↓
3. Session found → Fetch invitation → Compare emails → ✅ Match
   ↓
4. Accept invitation → Redirect to organization
```

### Flow D: Logged In with Different Email

```
1. Click invitation link
   ↓
2. /orgs/accept-invitation/[id]
   ↓
3. Session found → Fetch invitation → Compare emails → ❌ No match
   ↓
4. Show mismatch warning
   ↓
5. User clicks "Sign Out and Sign In with [email]"
   ↓
6. Signs out → Redirects to /login?redirect=/orgs/accept-invitation/[id]
   ↓
7. User signs in with correct email
   ↓
8. Redirects back to /orgs/accept-invitation/[id]
   ↓
9. Session found → Fetch invitation → Compare emails → ✅ Match
   ↓
10. Accept invitation → Redirect to organization
```

### Flow E: Not Logged In → Sign Up with Different Email

```
1. Click invitation link
   ↓
2. /orgs/accept-invitation/[id]
   ↓
3. No session → Redirect to /login?redirect=/orgs/accept-invitation/[id]
   ↓
4. User clicks "Sign up" → Goes to /signup?redirect=/orgs/accept-invitation/[id]
   ↓
5. User signs up with DIFFERENT email
   ↓
6. Redirects back to /orgs/accept-invitation/[id]
   ↓
7. Session found → Fetch invitation → Compare emails → ❌ No match
   ↓
8. Show mismatch warning
   ↓
9. User clicks "Sign Out and Sign In with [email]"
   ↓
10. Signs out → Redirects to /login?redirect=/orgs/accept-invitation/[id]
   ↓
11. User signs in with correct email (or creates new account)
   ↓
12. Redirects back to /orgs/accept-invitation/[id]
   ↓
13. Session found → Fetch invitation → Compare emails → ✅ Match
   ↓
14. Accept invitation → Redirect to organization
```

## Testing Checklist

### Scenario 1: Not Logged In
- [ ] Click invitation link → Redirects to login with redirect parameter
- [ ] Sign in with matching email → Redirects back to invitation → Accepts
- [ ] Sign in with different email → Shows mismatch warning
- [ ] Click "Sign up" from login → Preserves redirect parameter
- [ ] Sign up with matching email → Redirects back to invitation → Accepts
- [ ] Sign up with different email → Shows mismatch warning

### Scenario 2: Logged In with Matching Email
- [ ] Click invitation link → Shows invitation details
- [ ] Automatically accepts invitation
- [ ] Redirects to organization dashboard

### Scenario 3: Logged In with Different Email
- [ ] Click invitation link → Shows mismatch warning
- [ ] Shows both email addresses
- [ ] "Sign Out" button preserves invitation ID
- [ ] After sign out → Redirects to login with redirect
- [ ] Sign in with correct email → Redirects back → Accepts

### Scenario 4: Social Signup/Signin
- [ ] Google signup from invitation link → Preserves redirect
- [ ] Microsoft signup from invitation link → Preserves redirect
- [ ] Google signin from invitation link → Preserves redirect
- [ ] Microsoft signin from invitation link → Preserves redirect

## Summary

**Current Status:**
- ✅ Not logged in → Login flow works
- ✅ Logged in with matching email → Works perfectly
- ✅ Logged in with different email → Works perfectly
- ⚠️ Not logged in → Signup flow loses redirect parameter
- ⚠️ Signup form doesn't use redirect parameter

**Priority Fixes:**
1. **HIGH**: Update signup page to handle redirect parameter
2. **HIGH**: Update signup form to use redirect parameter
3. **MEDIUM**: Update signup link on login page to preserve redirect

