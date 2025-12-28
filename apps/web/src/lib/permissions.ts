/**
 * Permission Helper Functions
 *
 * Utilities for checking user permissions related to team management
 * and player eligibility overrides
 */

/**
 * Check if user has permission to remove players from their core team
 * Only admins can remove players from core teams
 *
 * @param userFunctionalRoles - Array of user's functional roles
 * @returns True if user can remove from core team
 */
export function canRemoveFromCoreTeam(userFunctionalRoles: string[]): boolean {
  return userFunctionalRoles.includes("admin");
}

/**
 * Check if user has permission to manage team rosters
 * Both admins and coaches can manage teams
 *
 * @param userFunctionalRoles - Array of user's functional roles
 * @returns True if user can manage teams
 */
export function canManageTeams(userFunctionalRoles: string[]): boolean {
  return (
    userFunctionalRoles.includes("admin") ||
    userFunctionalRoles.includes("coach")
  );
}

/**
 * Check if user has permission to grant eligibility overrides
 * Only admins can grant overrides
 *
 * @param userFunctionalRoles - Array of user's functional roles
 * @returns True if user can grant overrides
 */
export function canGrantOverrides(userFunctionalRoles: string[]): boolean {
  return userFunctionalRoles.includes("admin");
}

/**
 * Check if user has permission to configure sport eligibility rules
 * Only admins can configure sport rules
 *
 * @param userFunctionalRoles - Array of user's functional roles
 * @returns True if user can configure sport rules
 */
export function canConfigureSportRules(userFunctionalRoles: string[]): boolean {
  return userFunctionalRoles.includes("admin");
}

/**
 * Check if user has permission to update team enforcement settings
 * Only admins can update enforcement settings
 *
 * @param userFunctionalRoles - Array of user's functional roles
 * @returns True if user can update enforcement settings
 */
export function canUpdateEnforcementSettings(
  userFunctionalRoles: string[]
): boolean {
  return userFunctionalRoles.includes("admin");
}

/**
 * Check if user is an admin (has functional admin role)
 *
 * @param userFunctionalRoles - Array of user's functional roles
 * @returns True if user has admin role
 */
export function isAdmin(userFunctionalRoles: string[]): boolean {
  return userFunctionalRoles.includes("admin");
}

/**
 * Check if user is a coach (has functional coach role)
 *
 * @param userFunctionalRoles - Array of user's functional roles
 * @returns True if user has coach role
 */
export function isCoach(userFunctionalRoles: string[]): boolean {
  return userFunctionalRoles.includes("coach");
}

/**
 * Check if user is a parent (has functional parent role)
 *
 * @param userFunctionalRoles - Array of user's functional roles
 * @returns True if user has parent role
 */
export function isParent(userFunctionalRoles: string[]): boolean {
  return userFunctionalRoles.includes("parent");
}
