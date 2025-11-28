import { createAccessControl } from "better-auth/plugins/access";

// Define the access control statement (must match server-side)
const statement = {
  team: ["view", "manage"],
  player: ["view", "create", "update"],
  training: ["view", "create", "update"],
  report: ["view", "create"],
} as const;

// Create the access control instance
export const ac = createAccessControl(statement);

// Define custom roles with their permissions (must match server-side)
export const member = ac.newRole({
  team: ["view"],
  player: ["view"],
  training: ["view"],
  report: ["view"],
});

export const coach = ac.newRole({
  team: ["view", "manage"],
  player: ["view", "create", "update"],
  training: ["view", "create", "update"],
  report: ["view", "create"],
});

export const parent = ac.newRole({
  team: ["view"],
  player: ["view"],
  training: ["view"],
  report: ["view", "create"],
});
