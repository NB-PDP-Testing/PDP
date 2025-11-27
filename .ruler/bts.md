# Better-T-Stack Project Rules

This is a pdp project created with Better-T-Stack CLI.

## Project Structure

This is a monorepo with the following structure:

- **`apps/web/`** - Frontend application (Next.js)

- **`packages/backend/`** - Convex backend functions

## Available Scripts

- `npm run dev` - Start all apps in development mode
- `npm run dev:web` - Start only the web app

## Authentication

Authentication is enabled in this project using better-auth.

## Key Points

- This is a Turborepo monorepo using npm workspaces
- Each app has its own `package.json` and dependencies
- Run commands from the root to execute across all workspaces
- Run workspace-specific commands with `npm run command-name`
- Turborepo handles build caching and parallel execution
- Use `npx
create-better-t-stack add` to add more features later
