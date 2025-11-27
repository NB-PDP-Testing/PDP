import { getToken as getTokenNextjs } from "@convex-dev/better-auth/nextjs";
import { createAuth } from "@pdp/backend/convex/auth";

export const getToken = () => getTokenNextjs(createAuth);
