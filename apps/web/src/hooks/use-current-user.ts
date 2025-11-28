import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";

/**
 * Hook to get the current authenticated user with all custom fields
 * Returns user with isPlatformStaff, approvalStatus, and other custom fields
 */
export function useCurrentUser() {
  return useQuery(api.models.users.getCurrentUser);
}
