import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { PostHog } from "posthog-node";

/**
 * PostHog Feature Flag Bootstrapping Proxy
 *
 * This proxy fetches feature flags server-side and passes them to the client
 * via a cookie. This ensures flags are available immediately on first render,
 * eliminating the race condition where components render before flags load.
 *
 * How it works:
 * 1. Proxy runs on every request (filtered by matcher)
 * 2. Fetches all feature flags from PostHog server-side
 * 3. Stores flags in a cookie
 * 4. PHProvider reads cookie and bootstraps PostHog with pre-fetched flags
 * 5. Components get correct flag values on first render
 *
 * @see https://posthog.com/tutorials/nextjs-bootstrap-flags
 */

// Initialize PostHog server-side client
// Note: We use the same project API key for server-side
const posthogApiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

// Create PostHog client only if configured
const posthog = posthogApiKey
  ? new PostHog(posthogApiKey, {
      host: posthogHost || "https://eu.i.posthog.com",
      // Disable automatic flushing in proxy (we flush manually)
      flushAt: 1,
      flushInterval: 0,
    })
  : null;

// Cookie name for storing bootstrapped flags
const POSTHOG_FLAGS_COOKIE = "ph-bootstrap-flags";
// Cookie name for distinct ID (to maintain consistency between server and client)
const POSTHOG_DISTINCT_ID_COOKIE = "ph-distinct-id";

/**
 * Generate or retrieve a distinct ID for the user
 * This ensures the same user gets the same flag values
 */
function getDistinctId(request: NextRequest): string {
  // Try to get existing distinct ID from cookie
  const existingId = request.cookies.get(POSTHOG_DISTINCT_ID_COOKIE)?.value;
  if (existingId) {
    return existingId;
  }

  // Generate a new anonymous ID
  // In production, you might want to use the user's actual ID if logged in
  return `anon_${crypto.randomUUID()}`;
}

export async function proxy(request: NextRequest) {
  // Skip if PostHog is not configured
  if (!posthog) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const distinctId = getDistinctId(request);

  try {
    // Fetch all feature flags for this user
    const flags = await posthog.getAllFlags(distinctId);

    // Store flags in cookie for client-side bootstrap
    // Using JSON.stringify and encoding to handle special characters
    response.cookies.set(POSTHOG_FLAGS_COOKIE, JSON.stringify(flags), {
      httpOnly: false, // Client needs to read this
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 5, // 5 minutes - flags refresh on next page load
      path: "/",
    });

    // Set distinct ID cookie if it's new
    if (!request.cookies.get(POSTHOG_DISTINCT_ID_COOKIE)?.value) {
      response.cookies.set(POSTHOG_DISTINCT_ID_COOKIE, distinctId, {
        httpOnly: false, // Client needs to read this for PostHog
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: "/",
      });
    }
  } catch (error) {
    // Log error but don't block the request
    // Client-side PostHog will fetch flags as fallback
    console.error("[Proxy] PostHog flag fetch error:", error);
  }

  return response;
}

// Configure which paths the proxy runs on
// We want it on all app routes but skip static files and API routes
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     * - API routes (they don't need client-side flags)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|api/).*)",
  ],
};
