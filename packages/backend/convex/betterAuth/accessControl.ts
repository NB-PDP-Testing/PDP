import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

/**
 * Better Auth Access Control Configuration
 *
 * ARCHITECTURE DECISION:
 * Better Auth roles define ORGANIZATIONAL HIERARCHY (who can manage the org):
 * - owner: Ultimate authority, can delete org
 * - admin: Can manage members, settings
 * - member: Basic access, default for all new members
 *
 * "coach" and "parent" are NOT Better Auth roles - they are FUNCTIONAL ROLES
 * stored in the member.functionalRoles array. This allows:
 * - Users to have multiple functional roles (coach + parent)
 * - Clear separation: hierarchy (Better Auth) vs capabilities (functional)
 * - Easy extension: add new functional roles without changing Better Auth
 *
 * See: docs/COMPREHENSIVE_AUTH_PLAN.md for full architecture details
 */

// Define the access control statement
const statement = {
  ...defaultStatements,
  // Resource-based permissions for the organization
  player: ["view", "create", "update"],
  training: ["view", "create", "update"],
  report: ["view", "create"],
} as const;

// Create the access control instance
export const ac = createAccessControl(statement);

/**
 * Owner role - full organizational authority
 * - Can manage organization settings
 * - Can delete organization
 * - Can manage all members including other owners/admins
 * - Has all resource permissions
 */
export const owner = ac.newRole({
  player: ["view", "create", "update"],
  training: ["view", "create", "update"],
  report: ["view", "create"],
  ...ownerAc.statements,
});

/**
 * Admin role - delegated organizational management
 * - Can manage organization settings (except delete)
 * - Can invite/remove members (except owner)
 * - Can approve join requests
 * - Has all resource permissions
 */
export const admin = ac.newRole({
  player: ["view", "create", "update"],
  training: ["view", "create", "update"],
  report: ["view", "create"],
  ...adminAc.statements,
});

/**
 * Member role - basic organizational access
 * - Default role for all new members (coaches, parents, etc.)
 * - Cannot manage organization settings
 * - Cannot invite/remove members
 * - Has basic view permissions
 * - Actual capabilities determined by functionalRoles array
 */
export const member = ac.newRole({
  player: ["view"],
  training: ["view"],
  report: ["view"],
  ...memberAc.statements,
});
