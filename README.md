# pdp

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Next.js, Convex, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Full-stack React framework
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Convex** - Reactive backend-as-a-service platform
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system
- **Biome** - Linting and formatting

## Getting Started

First, install the dependencies:

```bash
npm install
```

## Convex Setup

This project uses Convex as a backend. You'll need to set up Convex before running the app:

```bash
npm run dev:setup
```

Follow the prompts to create a new Convex project and connect it to your application.

## Authentication Setup

This project supports multiple authentication providers:

- **Email/Password**: Built-in, no additional setup required
- **Google OAuth**: Requires Google OAuth credentials
- **Microsoft OAuth**: Requires Microsoft Azure Entra ID credentials

For Microsoft authentication setup, see [MICROSOFT_AUTH_SETUP.md](./MICROSOFT_AUTH_SETUP.md) for detailed instructions on:
- Creating a Microsoft Azure app registration
- Configuring environment variables
- Testing and deployment

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the web application.
Your app will connect to the Convex cloud backend automatically.

## Project Structure

```
pdp/
├── apps/
│   ├── web/         # Frontend application (Next.js)
├── packages/
│   ├── backend/     # Convex backend functions and schema
```

## Available Scripts

- `npm run dev`: Start all applications in development mode
- `npm run build`: Build all applications
- `npm run dev:web`: Start only the web application
- `npm run dev:setup`: Setup and configure your Convex project
- `npm run check-types`: Check TypeScript types across all apps
- `npm run check`: Run Biome formatting and linting
