import { useCurrentUserContext } from "@/providers/current-user-provider";

/**
 * Hook to get the current authenticated user with all custom fields
 * Returns user with isPlatformStaff, approvalStatus, and other custom fields
 *
 * PERFORMANCE: This hook reads from context instead of creating a new Convex subscription.
 * The CurrentUserProvider fetches the user data ONCE at the app level and shares it
 * with all components via context, reducing getCurrentUser calls by ~70%.
 *
 * @returns The current user data, or undefined if loading, or null if not authenticated
 */
export function useCurrentUser() {
  const { user } = useCurrentUserContext();
  return user;
}
