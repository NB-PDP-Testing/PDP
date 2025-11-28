import { createAccessControl } from "better-auth/plugins/access";

// Define the access control statement
// This outlines the resources and actions available in your application
const statement = {
  // Add resources and actions as needed
  // For now, we'll keep it minimal and expand as you define specific permissions
  team: ["view", "manage"],
  player: ["view", "create", "update"],
  training: ["view", "create", "update"],
  report: ["view", "create"],
} as const;

// Create the access control instance
export const ac = createAccessControl(statement);

// Define custom roles with their permissions
// Member role - basic access (default for all organization members)
export const member = ac.newRole({
  team: ["view"],
  player: ["view"],
  training: ["view"],
  report: ["view"],
});

// Coach role - can manage teams, players, and training sessions
export const coach = ac.newRole({
  team: ["view", "manage"],
  player: ["view", "create", "update"],
  training: ["view", "create", "update"],
  report: ["view", "create"],
});

// Parent role - can view and create reports for their players
export const parent = ac.newRole({
  team: ["view"],
  player: ["view"],
  training: ["view"],
  report: ["view", "create"],
});
