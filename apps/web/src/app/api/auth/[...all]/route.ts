import { nextJsHandler } from "@convex-dev/better-auth/nextjs";

/**
 * Better Auth API Routes
 *
 * This handler proxies authentication requests to the Convex HTTP backend
 * (packages/backend/convex/http.ts), where our custom configuration
 * (including sendInvitationEmail callback) is registered via authComponent.
 *
 * Routes:
 * - POST /api/auth/sign-in/email
 * - POST /api/auth/organization/invite-member
 * - GET  /api/auth/google/callback
 * - etc.
 */
export const { GET, POST } = nextJsHandler();

// http://localhost:3000/api/auth/google/callback
