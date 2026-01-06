# SSO Invitation Flow - How Leading Sites Handle It

## Overview

This document explains how leading sites (Slack, Notion, Linear, GitHub, etc.) handle invitations when users sign in with Google/Microsoft accounts, and how our implementation compares.

## How Leading Sites Handle SSO Invitations

### The Standard Pattern

1. **Invitation is Email-Based**
   - Invitation is sent to an email address (e.g., `user@gmail.com`)
   - Invitation is stored with the email address, not a user account
   - The invitation link contains an invitation ID

2. **User Clicks Invitation Link**
   - If user is **not logged in** → Redirect to login page
   - If user is **already logged in** → Check email match

3. **User Signs In with SSO (Google/Microsoft)**
   - User clicks "Sign in with Google" or "Sign in with Microsoft"
   - OAuth flow completes
   - System receives user's email from the SSO provider

4. **Email Matching Validation**
   - **Critical**: The logged-in user's email **must match** the invitation email
   - If emails match → Accept invitation automatically
   - If emails don't match → Show error message

### Examples from Leading Sites

#### Slack
- Invitation sent to `user@gmail.com`
- User clicks link → Redirected to login
- User signs in with Google using `user@gmail.com` → ✅ Match → Invitation accepted
- User signs in with Google using `different@gmail.com` → ❌ No match → Error: "This invitation was sent to a different email address"

#### Notion
- Similar flow
- If email doesn't match, shows: "This invitation was sent to [email]. Please sign in with that account."

#### Linear
- Same pattern
- Clear error message if email mismatch

#### GitHub
- Invitation is email-based
- User must sign in with matching email
- If already signed in with different email, shows error

## Our Current Implementation

### How It Works

1. **Admin sends invitation** → Email sent to `jkobrien@gmail.com`
2. **User clicks invitation link** → `/orgs/accept-invitation/[invitationId]`
3. **If not logged in** → Redirects to `/login?redirect=/orgs/accept-invitation/[invitationId]`
4. **User signs in with Google/Microsoft** → OAuth completes
5. **Better Auth validates**:
   - Checks if logged-in user's email matches invitation email
   - If match → Creates member record with role from invitation
   - If no match → Returns error

### Better Auth Email Matching

Better Auth automatically validates that:
- The logged-in user's email matches the invitation email
- This is a **security feature** to prevent invitation hijacking
- Email comparison is case-insensitive (standard practice)

## Common Issues & Solutions

### Issue 1: Email Mismatch

**Problem**: User signs in with different email than invitation

**Example**:
- Invitation sent to: `jkobrien@gmail.com`
- User signs in with: `john.kobrien@gmail.com` (different account)

**Solution**: 
- Better Auth will reject the invitation
- We should show a clear error message
- User needs to sign in with the correct email

### Issue 2: User Already Has Account with Different Email

**Problem**: User already signed up with email/password using different email

**Example**:
- User previously signed up with: `john@company.com`
- Invitation sent to: `jkobrien@gmail.com`
- User tries to accept invitation

**Solution**:
- User must sign out and sign in with the invited email
- Or user can add the invited email as an additional email (if supported)

### Issue 3: Gmail Aliases

**Problem**: Gmail treats `user@gmail.com` and `user+alias@gmail.com` as the same email

**Example**:
- Invitation sent to: `jkobrien@gmail.com`
- User signs in with: `jkobrien+work@gmail.com`

**Solution**:
- Better Auth should handle this (Gmail aliases are normalized)
- But we should test to ensure it works

## Recommended Improvements

### 1. Better Error Messages

Currently, if email doesn't match, Better Auth returns a generic error. We should:

```typescript
// In accept-invitation page
if (result.error) {
  // Check if error is email mismatch
  if (result.error.message?.includes("email") || result.error.message?.includes("match")) {
    setErrorMessage(
      `This invitation was sent to a different email address. ` +
      `Please sign out and sign in with the email address that received the invitation.`
    );
  } else {
    setErrorMessage(result.error.message || "Failed to accept invitation");
  }
}
```

### 2. Show Invitation Email

Before accepting, show the user which email the invitation was sent to:

```typescript
// Fetch invitation details first
const invitation = await authClient.organization.getInvitation({ invitationId });
const session = await authClient.getSession();

if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) {
  // Show warning: "This invitation was sent to [email]. You're signed in as [current email]."
}
```

### 3. Pre-login Email Check

On the login page, if there's a redirect to an invitation, show a message:

```typescript
// In login page
{redirect?.includes('accept-invitation') && (
  <Alert>
    <AlertDescription>
      You're accepting an invitation. Please sign in with the email address
      that received the invitation.
    </AlertDescription>
  </Alert>
)}
```

### 4. Account Switching

If user is already logged in with different email, offer to sign out:

```typescript
// In accept-invitation page
if (session && invitation.email !== session.user.email) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Mismatch</CardTitle>
        <CardDescription>
          This invitation was sent to <strong>{invitation.email}</strong>.
          You're currently signed in as <strong>{session.user.email}</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => authClient.signOut()}>
          Sign Out and Sign In with {invitation.email}
        </Button>
      </CardContent>
    </Card>
  );
}
```

## Best Practices

1. **Always normalize emails** (lowercase) for comparison
2. **Show clear error messages** when email doesn't match
3. **Display invitation email** before acceptance
4. **Offer account switching** if user is logged in with wrong email
5. **Handle Gmail aliases** correctly (Better Auth should do this)
6. **Test with multiple SSO providers** (Google, Microsoft, etc.)

## Testing Checklist

- [ ] User receives invitation to `user@gmail.com`
- [ ] User clicks link while logged out
- [ ] User signs in with Google using `user@gmail.com` → ✅ Should accept
- [ ] User signs in with Google using `different@gmail.com` → ❌ Should show error
- [ ] User already logged in with different email → Should offer to sign out
- [ ] Gmail alias test: `user@gmail.com` vs `user+alias@gmail.com` → Should work
- [ ] Microsoft account test: Same email → Should work
- [ ] Error messages are clear and helpful

## Summary

**The key insight**: Invitations are email-based, and users must sign in with an account that has the **same email address** as the invitation. This is a security feature, not a bug.

**Our implementation** follows the same pattern as leading sites. The main improvement needed is **better error handling and user messaging** when email mismatches occur.

