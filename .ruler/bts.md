## PDP

Helps to organise sports clubs.

## Main app structure

This is a monorepo with the following structure:

- **`apps/web/`** - Frontend application (Next.js)
- **`packages/backend/`** - Convex backend functions

## MVP

There is also may be an MVP version of the app in the `./mvp-app` folder. This is only for reference.
The MVP used vite and clerk auth. We are using Next.js and better-auth in the main app.
We are trying to rebuild features from it into apps/web and packages/backend in a structured way.
Don't ever write to this folder. Only read from it when we specficially mention using the mvp as a reference for building the main app.

## Running the app

We generally are running the dev server so don't try to run the dev server because there will be a port conflict. It's generally running on port 3000. If not, ask the user about it.
If you want to type check or build, there are commands in package.json for that.

## Authentication

Authentication is enabled in this project using better-auth.

## Key Points

- This is a Turborepo monorepo using npm workspaces
- Each app has its own `package.json` and dependencies
- Run commands from the root to execute across all workspaces
- Run workspace-specific commands with `npm run command-name`
- Turborepo handles build caching and parallel execution

## Important Rules for apps/web

- If building a complex react page or component, create components in the folder as siblings of the page.tsx for that feature. If the component is reused in multiple places, create it in the `apps/web/src/components` folder.
- In apps/web/src/components/ui you have access to all shadcn/ui components. Don't create new components in that folder.

## Important Rules for packages/backend

- Queries and mutations that the frontend will call should be created in the `packages/backend/convex/models/<model-name>.ts` folder.
- Complex reusable functions for the backend should be created in the `packages/backend/convex/client/<model-name>.ts` folder.
-
