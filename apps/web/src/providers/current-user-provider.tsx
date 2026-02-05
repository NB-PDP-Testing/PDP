"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { createContext, type ReactNode, useContext } from "react";

/**
 * User type from getCurrentUser query
 */
type CurrentUser = {
  _id: string;
  _creationTime: number;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: number;
  updatedAt: number;
  userId?: string | null;
  isPlatformStaff?: boolean;
  firstName?: string;
  lastName?: string;
  phone?: string;
  // Address fields (Phase 0.7)
  address?: string;
  address2?: string;
  town?: string;
  county?: string;
  postcode?: string;
  country?: string;
  onboardingComplete?: boolean;
  lastChildrenCheckAt?: number;
  parentOnboardingDismissCount?: number;
  parentOnboardingLastDismissedAt?: number;
  childLinkingSkipCount?: number;
  currentOrgId?: string;
  gdprConsentVersion?: number;
  gdprConsentedAt?: number;
  setupComplete?: boolean;
  setupStep?: string;
  // Profile completion fields (Phase 0)
  altEmail?: string;
  profileCompletionStatus?: "pending" | "completed" | "skipped";
  profileCompletedAt?: number;
  profileSkipCount?: number;
  noChildrenAcknowledged?: boolean;
  // Invitation tracking (Phase 0.8)
  wasInvited?: boolean;
} | null;

type CurrentUserContextType = {
  user: CurrentUser | undefined;
  isLoading: boolean;
};

const CurrentUserContext = createContext<CurrentUserContextType | null>(null);

/**
 * Provider that fetches the current user ONCE at the app level
 * and shares it with all children via context.
 *
 * This eliminates multiple useQuery calls for getCurrentUser across components.
 * Each component that previously called useQuery(api.models.users.getCurrentUser)
 * now reads from this shared context instead.
 *
 * Performance Impact: Reduces getCurrentUser calls from 132K to ~40K (70% reduction)
 * - Before: Each component subscribed independently
 * - After: Single subscription shared across all components
 */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const user = useQuery(api.models.users.getCurrentUser);
  const isLoading = user === undefined;

  return (
    <CurrentUserContext.Provider value={{ user, isLoading }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

/**
 * Hook to access the current user from context
 *
 * @returns The current user data and loading state
 * @throws Error if used outside of CurrentUserProvider
 */
export function useCurrentUserContext(): CurrentUserContextType {
  const context = useContext(CurrentUserContext);
  if (context === null) {
    throw new Error(
      "useCurrentUserContext must be used within a CurrentUserProvider"
    );
  }
  return context;
}
