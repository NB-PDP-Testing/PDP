# ADR-VN2-001: Capability URL Authentication for Coach Review Microsite

**Date:** 2026-02-06
**Status:** Accepted
**Context:** Phase 2 - Coach Quick Review Microsite, Stories US-VN-007, US-VN-008

## Context and Problem Statement

The Coach Quick Review Microsite at `/r/[code]` needs to provide zero-friction access for coaches to review and action voice note insights. Coaches currently interact with the system via WhatsApp -- a zero-friction channel -- so the review experience must match that frictionlessness. The question is: how do we authenticate microsite access without introducing login friction?

## Decision Drivers

- **Zero friction is paramount**: coaches send voice notes via WhatsApp in seconds; the review UX must match
- **Mobile-first**: coaches tap links from WhatsApp on their phones; any login wall dramatically reduces engagement
- **Research data**: magic links show 28% higher conversion and 2.4x mobile engagement vs password auth
- **Scoped data exposure**: the microsite only exposes coaching insights (player names + observations), not medical records or sensitive personal data
- **Time-limited**: links are inherently ephemeral (48h), reducing the window of exposure

## Considered Options

### Option 1: Capability URL (8-char code = token, no auth)

The URL path `/r/[code]` where `code` is a cryptographically random 8-character alphanumeric string (excluding ambiguous chars 0/O/I/l). The code itself IS the authentication. No login, no redirect, no session.

**Pros:**
- Zero friction -- one tap from WhatsApp
- No cookie/session management needed
- Natural expiry (48h) limits exposure window
- Well-established pattern (Google Docs "anyone with the link", Stripe payment links, Doodle polls)
- Works across devices without session transfer

**Cons:**
- Link can be shared/forwarded
- Visible in browser history on shared devices
- No identity verification (anyone with the code can access)

**Mitigations:**
- 48h automatic expiry
- Cryptographic randomness: 8 chars from `[A-Za-z1-9]` excluding `0OIl` = 58^8 = ~128 trillion combinations (unguessable by brute force)
- Soft device binding via cookie-based fingerprint (warn, don't block)
- Access audit log (IP, user-agent, timestamp on every access)
- Access count monitoring (flag > 20 accesses for admin review)
- HTTPS only (code encrypted in transit)
- Scoped data: only coaching observations, no medical/contact data

### Option 2: Magic Link with PIN

Email or WhatsApp a one-time link, then require last 4 digits of phone number as a PIN on the microsite.

**Pros:**
- Adds a knowledge factor (something the coach knows)
- Stops casual forwarding

**Cons:**
- Adds friction (PIN entry, possible errors)
- Phone number is easily guessable (visible to anyone who has the coach's number)
- Doesn't meaningfully improve security for the threat model
- Increases drop-off rate

### Option 3: Session-Based Auth (login required)

Redirect to Better Auth login, then redirect back to the review page.

**Pros:**
- Full identity verification
- Standard security model
- Reuses existing auth infrastructure

**Cons:**
- Destroys the zero-friction value proposition
- Requires password/OAuth on mobile (high friction)
- Many coaches may not have app accounts yet
- Research shows significant drop-off at login walls on mobile

## Decision Outcome

**Chosen option: Option 1 (Capability URL)**, because:

1. The threat model is low-severity (coaching observations, not medical/financial data)
2. The 48h expiry creates a naturally closing window
3. The defense-in-depth controls (device binding, audit log, access counting) provide adequate monitoring
4. PIN-based auth (Option 2) adds friction without meaningfully improving security
5. Full auth (Option 3) is antithetical to the product's core value of zero-friction coaching

**Future escalation path:** If an organization requires higher security, a per-org toggle can enable 4-digit PIN verification. This is documented as a Phase 3 candidate and can be added without architectural changes.

## Implementation Notes

- Code generation: use `crypto.randomBytes(6).toString('base64url').slice(0, 8)` or equivalent, filtered to exclude `0OIl`
- All public queries validate the code on EVERY call (not just on initial load)
- The code must be validated against both existence AND expiry on every query
- Never cache or store the code client-side beyond the URL
- Rate limit code lookups at the Convex level (prevent brute force enumeration)

## Consequences

**Positive:**
- Coaches can review insights in seconds with one tap
- No need to manage user sessions for the microsite
- Naturally integrates with WhatsApp flow

**Negative:**
- Must enforce discipline: every public query validates the code
- Must monitor access patterns for abuse
- Cannot identify which individual accessed the link (only that it was accessed)
- Cannot revoke access to a specific individual (only expire the entire link)

## References

- [OWASP: Unguessable URLs](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [Capability-based security](https://en.wikipedia.org/wiki/Capability-based_security)
- Phase 2 PRD: `scripts/ralph/prds/voice-gateways-v2/phases/PHASE2_PRD.json`
- Phase 2 Context: `scripts/ralph/prds/voice-gateways-v2/context/PHASE2_MOBILE_REVIEW.md`
