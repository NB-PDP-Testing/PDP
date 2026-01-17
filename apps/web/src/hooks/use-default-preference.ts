/**
 * Hook for managing user default preferences
 * TODO: Implement full functionality when userPreferences backend is ready
 */

type FunctionalRole = "admin" | "coach" | "parent" | "player";

type UserPreferences = {
  preferredDefaultOrg?: string;
  preferredDefaultRole?: FunctionalRole;
};

export function useDefaultPreference() {
  // Stub implementation - returns null/undefined for now
  // This will be implemented when backend userPreferences table is ready

  const setDefault = (_orgId: string, _role: FunctionalRole) => {
    // Stub - does nothing
    console.log("[useDefaultPreference] setDefault called (stub)");
    return Promise.resolve();
  };

  const clearDefault = () => {
    // Stub - does nothing
    console.log("[useDefaultPreference] clearDefault called (stub)");
    return Promise.resolve();
  };

  return {
    preferences: null as UserPreferences | null,
    setDefault,
    clearDefault,
    isLoading: false,
  };
}
