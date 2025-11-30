import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

// Define the access control statement (must match server-side)
const statement = {
  ...defaultStatements,
  // org: ["admin"],
  coach: ["full"],
  player: ["view", "create", "update"],
  training: ["view", "create", "update"],
  report: ["view", "create"],
} as const;

// Create the access control instance
export const ac = createAccessControl(statement);

// Define custom roles with their permissions (must match server-side)
// Owner role - full access including org admin
export const owner = ac.newRole({
  coach: ["full"],
  player: ["view", "create", "update"],
  training: ["view", "create", "update"],
  report: ["view", "create"],
  ...ownerAc.statements,
});

// Admin role - org admin access
export const admin = ac.newRole({
  coach: ["full"],
  player: ["view", "create", "update"],
  training: ["view", "create", "update"],
  report: ["view", "create"],
  ...adminAc.statements,
});

// Member role - basic access (default for all organization members)
export const member = ac.newRole({
  player: ["view"],
  training: ["view"],
  report: ["view"],
  ...memberAc.statements,
});

// Coach role - can manage teams, players, and training sessions
export const coach = ac.newRole({
  coach: ["full"],
  player: ["view", "create", "update"],
  training: ["view", "create", "update"],
  report: ["view", "create"],
  ...memberAc.statements,
});

// Parent role - can view and create reports for their players
export const parent = ac.newRole({
  player: ["view"],
  training: ["view"],
  report: ["view", "create"],
  ...memberAc.statements,
});
