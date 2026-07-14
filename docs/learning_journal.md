# Nexus Workspace - Learning & Architecture Journal

This document tracks all the architectural decisions, technical comparisons, and learning notes throughout the development of Nexus Workspace. It serves as a study guide and a record of *why* we chose certain technologies over others.

---

## [Date: 2026-07-13] - Foundation & Scaffolding Decisions

### 1. Repository Architecture: Monorepo vs. Polyrepo (Multirepo)

When building a system with multiple components (Frontend, Backend, AI Service, Shared libraries), you have two main ways to organize your code:

**Option A: Monorepo (Chosen)**
A single Git repository that contains all of your isolated projects (apps and packages). 
* **Advantages:**
  * **Trivial Code Sharing:** If you have a TypeScript type used by both the backend and frontend, you just import it locally. No need to publish to npm.
  * **Atomic Commits:** You can update the backend API and the frontend code that calls it in a single commit/Pull Request.
  * **Unified Tooling:** You run one `npm install` and one `npm run dev` to start everything.
* **Disadvantages:**
  * Repository can get large over time.
  * Requires specialized tooling (like Turborepo) to ensure build times stay fast.

**Option B: Polyrepo (Multirepo)**
Each project (Frontend, Backend) gets its own separate Git repository.
* **Advantages:**
  * Strict boundaries; teams can work entirely independently.
  * Smaller repository sizes.
* **Disadvantages:**
  * **Dependency Hell:** Sharing code is very difficult. You have to publish shared code to a private npm registry, wait for it to build, and then install the update in the other repos.
  * Harder to test cross-service changes locally.

---

### 2. Package Managers (npm vs. pnpm vs. Yarn)

Package managers download and install the external libraries (like React or Express) your project needs.

* **npm (Node Package Manager):**
  * *What it is:* The default package manager that comes installed with Node.js.
  * *Pros:* Zero setup, everyone knows it, maximum compatibility.
  * *Cons:* Slower installation times, takes up a lot of duplicate disk space if you have multiple projects.
* **pnpm (Performant npm):**
  * *What it is:* A modern alternative designed for speed and efficiency.
  * *Pros:* **Extremely fast.** It uses a global store and "symlinks", meaning if 10 projects use React, it only downloads React once to your hard drive and links it to the projects.
  * *Cons:* Slight learning curve (commands are `pnpm install` / `pnpm add`).
* **Yarn:**
  * *What it is:* Built by Facebook to solve early npm issues. 
  * *Pros:* Historically faster than npm.
  * *Cons:* Yarn v2+ is highly complex to configure.

**Decision:** We will use **`pnpm`** for the absolute best performance and industry-standard modern tooling, as chosen by the user.

---

### 3. Build Orchestration (Turborepo vs. Nx)

Because a Monorepo has multiple apps, you need a "Task Runner" to orchestrate them.

* **Turborepo (Chosen):**
  * *What it is:* Built by Vercel (creators of Next.js). It's a lightweight, blazing-fast build system.
  * *Pros:* **Zero-config caching.** If you run a build and haven't changed any files, Turborepo remembers the output and finishes in 10 milliseconds. Very easy to learn.
* **Nx:**
  * *What it is:* The heavy-weight enterprise alternative.
  * *Pros:* Extremely powerful, supports code generation plugins.
  * *Cons:* Steep learning curve, heavily opinionated.

---

### 4. UI Frameworks (Frontend Styling)

When building the React frontend, we have to decide how to style it.

* **Tailwind CSS (Core):**
  * *What it is:* A utility-first CSS framework. Instead of writing separate `.css` files, you add classes like `bg-blue-500 text-white p-4` directly to your HTML.
  * *Pros:* Ultimate flexibility, you never have to think about naming CSS classes, very fast to write.
  * *Cons:* Your HTML files can get cluttered with long class names. You have to build complex components (like Modals or Dropdowns) from scratch.
* **Shadcn/UI (Recommended):**
  * *What it is:* A collection of beautiful, accessible React components built *on top* of Tailwind CSS. **Crucially, it is NOT an npm package.** You use a CLI tool to copy and paste the raw code of the component directly into your project.
  * *Pros:* You own the code. You get beautiful enterprise-grade components (Buttons, Dialogs, Tables) instantly, but you can tweak the code exactly how you want. It's the current industry gold-standard.
  * *Cons:* Adds more files to your codebase.
* **Material UI (MUI) / Chakra UI:**
  * *What it is:* Traditional component libraries you install via npm.
  * *Pros:* Very fast to get started.
  * *Cons:* Very hard to customize. All MUI apps look exactly the same (like Google apps). High bundle sizes.

**Decision:** We will use **Tailwind CSS** as our styling engine, and integrate **Shadcn/UI** to give us professional, ready-to-use components. This will make the app look like a premium startup product instantly.

---

### 5. Execution: Commands Ran for Phase 1 Setup

To actually build this foundational architecture, here is the sequence of the main terminal commands we executed. This is useful if you ever need to reproduce this setup from scratch:

1. **Scaffold Frontend App**
   ```bash
   mkdir -p apps packages
   cd apps
   npx pnpm create vite web --template react-ts
   ```

2. **Setup Tailwind & Shadcn (Inside `apps/web`)**

   * **`npx pnpm add -D tailwindcss@3 postcss autoprefixer @types/node`**
     Installs the core packages needed for Tailwind CSS as "devDependencies". `tailwindcss@3` is the core CSS engine (we use v3 for Shadcn compatibility). `postcss` transforms styles with JS, and `autoprefixer` adds vendor prefixes (like `-webkit-`) for browser compatibility. `@types/node` provides Node.js types needed for configuration files.

   * **`npx tailwindcss init -p`**
     Scaffolds the configuration files. It creates `tailwind.config.js` (for custom colors/fonts) and `postcss.config.js` (wiring Tailwind and Autoprefixer together so Vite can process them).

   * **`npx pnpm dlx shadcn@latest init -d -f`**
     Initializes the **Shadcn UI** library. `dlx` downloads and executes the CLI temporarily. `-d` bypasses interactive questions and uses industry-standard defaults (Slate/Zinc). `-f` forces it to overwrite existing Tailwind configs with its own required setup.

   * **`npx pnpm add -D tailwindcss-animate`**
     Installs a specific Tailwind plugin required by Shadcn UI. Shadcn components use smooth micro-animations (like fading or sliding), and this plugin provides the CSS math needed to make those animations work perfectly.

3. **Scaffold Backend Server**

   * **`mkdir -p apps/server/src`**
     Creates the directory structure for our backend API. We manually created a `package.json` to define it as a Node.js project, a `tsconfig.json` to configure how TypeScript compiles into JavaScript, and `src/index.ts` as the main entry point for our Express server. We also installed `helmet` (for security headers) and `cors` (to allow our frontend to talk to this backend).

4. **Scaffold Shared Packages**

   * **`mkdir -p packages/shared/src packages/config-typescript`**
     Creates the folders for our internal libraries. Instead of rewriting the exact same TypeScript configuration in every single app, we put a `base.json` inside `config-typescript` and have every app inherit from it. The `shared` package allows us to write a function or a TypeScript type once, and import it as `@nexus/shared` in both the frontend and backend.

5. **Link and Build Monorepo (From the workspace root)**

   * **`npx pnpm install`**
     Reads the `pnpm-workspace.yaml` file. Instead of downloading duplicate copies of React or Express for every app, `pnpm` installs them once globally and creates "symlinks" (shortcuts) to them. It also links our internal `@nexus/shared` package so the apps can see it without us having to publish it to the internet.

   * **`npx pnpm run build`**
     Triggers **Turborepo** (`turbo run build`). Turborepo looks at our `turbo.json` pipeline, realizes that the frontend (`web`) and backend (`server`) both depend on the `@nexus/shared` package, and intelligently builds the shared package *first*, and then builds the web and server apps in parallel. It caches the results, so if we run this command again without changing code, it finishes in milliseconds.

---

### 6. File Architecture: Explaining the Root Configurations

When setting up a monorepo, the root-level configuration files act as the "command center" of the entire project. Here is a breakdown of what the files we created actually do:

#### 1. The Root `package.json`
This is the master configuration file for the entire monorepo.
* **`"private": true`**: Critical for monorepos. It prevents you from accidentally publishing your entire workspace codebase to the public npm registry.
* **`"scripts"`**: These are global commands. When you type `pnpm run build` here, it executes `turbo run build`. Turborepo then looks inside `apps/web` and `apps/server` and runs *their* specific build scripts in parallel.
* **`"devDependencies"`**: Notice how there is no React or Express installed here. The root `package.json` only holds tools needed to *manage* the workspace globally (like `turbo` and code formatters like `prettier`).
* **`"packageManager": "pnpm@9.5.0"`**: Corepack feature. This ensures that if another developer clones the repo and tries to run `npm install`, Node will automatically enforce the use of `pnpm` to prevent broken dependency lockfiles.

#### 2. `pnpm-workspace.yaml`
This file is the reason `pnpm` knows it is dealing with a monorepo.
* **`packages: [ "apps/*", "packages/*" ]`**: It tells `pnpm` that any folder inside `apps/` or `packages/` should be treated as its own independent project, but they should all share a single global `node_modules` cache to save disk space and drastically speed up installations.

#### 3. `turbo.json`
This is the configuration file for Turborepo, dictating exactly how tasks are executed.
* **`"build": { "dependsOn": ["^build"] }`**: The `^` (caret) symbol is magic. It means: *"Before you build an app (like `web`), you MUST build all the internal packages it depends on (like `@nexus/shared`) first."* It automatically maps out the dependency tree.
* **`"outputs": ["dist/**", "build/**"]`**: Tells Turborepo which folders contain the compiled, finished code. This is how Turborepo's caching works: if your code hasn't changed, it just restores the `dist` folder from its cache instantly instead of rebuilding everything.
* **`"dev": { "cache": false, "persistent": true }`**: Tells Turborepo that the `dev` command runs a long-living local server (like the Vite dev server). It should *never* cache this command, and it should keep the terminal output alive continuously.

---

### 7. File Architecture: Apps and Packages

While the root configuration manages the workspace, the actual code lives inside `apps/` and `packages/`. Here is a breakdown of the internal folders and their critical files:

#### `apps/web/` (The Frontend)
This is our Vite + React application.
* **`src/main.tsx`**: The entry point where React mounts to the HTML document.
* **`src/App.tsx`**: The main React component that acts as the root of our user interface.
* **`src/index.css`**: Contains the Tailwind CSS directives (`@tailwind base;`) and Shadcn's CSS variables (like `--background` and `--primary`).
* **`components.json`**: The configuration file created by Shadcn UI to track which components you have installed and where they should be placed (usually in `src/components/ui`).
* **`tailwind.config.js`**: Defines the design system. Shadcn overrides this to map its CSS variables to Tailwind utility classes.
* **`vite.config.ts`**: The configuration for the Vite bundler (handles extremely fast hot-reloading and building the React code for production).

#### `apps/server/` (The Backend)
This is our Node.js + Express API.
* **`src/index.ts`**: The entry point for the backend server. It initializes Express, sets up middleware (like CORS and Helmet for security), and starts listening on a port (e.g., 5000).
* **`tsconfig.json`**: Configures how the backend TypeScript code is compiled into standard JavaScript so Node.js can run it.
* **`package.json`**: Defines the backend-specific dependencies (like `express`) and its own build/dev scripts.

#### `packages/shared/` (The Internal Library)
This is where we put code that both the frontend and backend need to share.
* **`src/index.ts`**: Exports shared constants, utility functions, or TypeScript interfaces (e.g., `export interface User { id: string; name: string; }`).
* **`package.json`**: It has a specific `"main": "./dist/index.js"` and `"types": "./dist/index.d.ts"` field. When `apps/web` imports `@nexus/shared`, it actually reads from this compiled `dist` folder!
* **`tsconfig.json`**: Configures this package to compile its TypeScript into the `dist` folder so the apps can consume it.

#### `packages/config-typescript/` (The Shared Config)
* **`base.json`**: A master TypeScript configuration file containing all the strict compiler rules (like `"strict": true`). Instead of copying these same rules into `apps/web`, `apps/server`, and `packages/shared`, those apps simply use `"extends": "@nexus/config-typescript/base.json"` to inherit them!

---

## Phase 1 (Part 2): Database and Authentication Infrastructure

### 1. Database Scaffolding (`packages/database`)
To keep our code clean, we are storing the entire database schema and connection logic in its own package. This way, if we ever build a second microservice, it can instantly connect to the same database by just importing `@nexus/database`.

#### Terminal Commands Ran
```bash
mkdir -p packages/database/src packages/database/prisma
```
**Explanation**: `mkdir -p` creates nested directories without throwing an error if they already exist. We created the `src` folder for our TypeScript code and the `prisma` folder for our database schema.

#### 1.1 `packages/database/package.json`
**The Code:**
```json
{
  "name": "@nexus/database",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "db:push": "prisma db push"
  },
  "dependencies": {
    "@prisma/client": "^5.16.1"
  }
}
```
**Explanation:**
- `"name": "@nexus/database"`: Names our package. The `@nexus` scope prevents collisions with public npm packages.
- `"main"` and `"types"`: Crucial lines. When the `server` app imports this package, Node reads this file, sees the `main` key, and grabs the compiled JavaScript from the `dist` folder.
- `"db:push"`: A custom script to push our schema changes to Supabase.
- `@prisma/client`: The official database engine that translates JavaScript into SQL.

#### 1.2 `packages/database/tsconfig.json`
**The Code:**
```json
{
  "extends": "@nexus/config-typescript/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```
**Explanation:**
- `"extends"`: Instead of writing 40 lines of strict TypeScript rules, we pull them from our shared config package.
- `"outDir": "./dist"`: Tells the TypeScript compiler (`tsc`) to take our `.ts` files from `rootDir` (`src`) and output the compiled `.js` code into the `dist` folder.

#### 1.3 `packages/database/prisma/schema.prisma`
This is the single most important file in the database package. It defines what our database looks like.
**The Code:**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String      @id @default(uuid())
  email     String      @unique
  password  String
  name      String?
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  workspaces Workspace[]
}

model Workspace {
  id        String   @id @default(uuid())
  name      String
  ownerId   String
  owner     User     @relation(fields: [ownerId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```
**Explanation line-by-line:**
- `generator client`: Tells Prisma to generate the JavaScript/TypeScript client when we run `prisma generate`.
- `datasource db`: Tells Prisma we are using PostgreSQL and securely reads the connection URL from the `.env` file.
- `model User {}`: Maps directly to a `User` table in PostgreSQL.
- `id String @id @default(uuid())`: Creates a primary key column (`id`) and automatically generates a cryptographically secure random UUID for every new user.
- `email String @unique`: Creates an email column and enforces a database-level constraint that no two users can have the same email.
- `password String`: We will store securely hashed passwords here, NEVER plaintext.
- `name String?`: The `?` makes this column optional (can be NULL).
- `createdAt / updatedAt`: Prisma automatically tracks when rows are created and updated.
- `workspaces Workspace[]`: A relationship! It tells Prisma that one User can own many Workspaces (One-to-Many).
- `model Workspace {}`: Maps to a `Workspace` table.
- `ownerId String`: A foreign key column that stores the ID of the User who owns the workspace.
- `owner User @relation(...)`: The actual SQL constraint that links the `Workspace.ownerId` column to the `User.id` column. If the user is deleted, we can enforce rules on the workspaces.

#### 1.4 `packages/database/src/index.ts`
**The Code:**
```typescript
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
export * from '@prisma/client';
```
**Explanation:**
- `import { PrismaClient }`: Imports the raw engine.
- `export const prisma = new PrismaClient()`: Creates a single instance of the database connection. By exporting it here, any app in our monorepo can import `prisma` and instantly talk to Supabase without opening multiple duplicate connections.
- `export *`: Re-exports all the generated TypeScript types (like the `User` interface) so our backend can use them.

### 2. Deploying the Database
After writing the code, we executed the following terminal commands inside `packages/database` to push the schema live to the Supabase cloud:
```bash
npx pnpm install
npx prisma db push
npx prisma generate
```
**Explanation:**
- `pnpm install`: Downloads the `@prisma/client` library.
- `prisma db push`: Reads the `schema.prisma` file, connects to the Supabase URL, looks at the current tables, and runs raw SQL commands (`CREATE TABLE`) to build our `User` and `Workspace` tables perfectly in the cloud.
#### 1.5 The IPv6 Connection Issue and `DIRECT_URL` Fix
When we first ran `npx prisma db push`, it failed with a connection error. This happened because Supabase recently migrated their direct connection port (`5432`) to enforce **IPv6**, which Prisma struggles to resolve on some internet networks.

To fix this, we updated our `.env` and `schema.prisma` to use **Connection Pooling** (PgBouncer).

**The `.env` update:**
```env
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-1-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-1-[REGION].pooler.supabase.com:5432/postgres"
```
**Explanation:** 
- `DATABASE_URL`: Uses port `6543` and adds `?pgbouncer=true`. This tells Prisma to connect to Supabase's built-in connection pooler, which uses IPv4 and handles thousands of simultaneous connections without crashing the database. Our backend will use this URL during normal operation.
- `DIRECT_URL`: Uses port `5432`. Prisma strictly requires a direct, non-pooled connection when it executes structural migrations (like `CREATE TABLE`).

**The `schema.prisma` update:**
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```
**Explanation:** This single line `directUrl = env("DIRECT_URL")` tells Prisma: *"Use the pooled URL for fast, normal queries, but temporarily switch to the Direct URL when I run `prisma db push`."*

After this fix, running `npx prisma db push` successfully created the `User` and `Workspace` tables on the live Supabase cloud!

---

## Phase 1 (Part 3): Backend API and Authentication (`apps/server`)

Now that the database is live in the cloud, we wrote the Node.js Express server to actually talk to it. This server is the secure middleman between the frontend (React) and the database (Supabase).

### Terminal Commands Ran
```bash
npx pnpm add bcrypt jsonwebtoken zod dotenv
npx pnpm add -D @types/bcrypt @types/jsonwebtoken
```
**Explanation:** 
- `bcrypt`: A library used to securely scramble (hash) user passwords so they are never stored as plain text.
- `jsonwebtoken` (JWT): Used to generate a secure digital "ID Card" (token) when a user logs in. The frontend sends this token with every request to prove who they are.
- `zod`: A massive time-saver. It automatically validates incoming data (e.g., ensuring an email looks like an email and a password is long enough).
- `@types/...`: The TypeScript definitions for those libraries so our IDE gives us autocompletion.

### 1. The Security Checkpoint (`auth.middleware.ts`)
We created a custom Express middleware. Think of this as a bouncer at a club.
- Every time a user tries to fetch their workspaces, this code runs *first*.
- It checks the HTTP Headers for a `Bearer <token>`.
- If the token exists, it uses `jwt.verify()` with our secret key to decode it.
- If the token is fake or expired, it immediately kicks the request back with a `403 Forbidden` error.
- If it's real, it attaches the `user.id` to the request so the next function knows exactly whose data to fetch.

### 2. Registration and Login (`auth.controller.ts`)
This file handles the actual logic of letting people into our app.

#### `register` Function
1. **Validate**: We use Zod (`registerSchema.parse()`) to verify the user sent a valid email and password.
2. **Hash**: We run `bcrypt.hash(password, 10)`. The `10` is the "salt rounds" — it intentionally slows down the hashing process to make it mathematically impossible for hackers to brute-force the password.
3. **Database Save**: We call `prisma.user.create()` to actually push the new user to Supabase.
4. **Token Generation**: We call `jwt.sign()` to give the user a token valid for 7 days.

#### `login` Function
1. **Fetch User**: We use `prisma.user.findUnique()` to look them up by email.
2. **Verify Password**: We use `bcrypt.compare()` which magically knows how to compare the plain text password they just typed with the scrambled hash in the database.
3. **Generate Token**: If the password matches, we generate a new JWT token.

### 3. Workspace Logic (`workspace.controller.ts`)
This handles the logic for the workspaces.
- `getWorkspaces`: We use `prisma.workspace.findMany({ where: { ownerId: req.user.id } })`. Because the bouncer (middleware) attached the `req.user.id`, we can fetch *only* the workspaces that belong to the logged-in user. We also sort them by newest first (`createdAt: 'desc'`).
- `createWorkspace`: We validate the name using Zod, and then use `prisma.workspace.create()` to link a new workspace directly to the user's ID.

### 4. Wiring it up (`index.ts` & `routes/`)
- We created specific route files (`auth.route.ts` and `workspace.route.ts`) to keep our URLs organized.
- In `workspace.route.ts`, we applied the `authenticateJWT` bouncer to *every* route, ensuring no one can see or create workspaces without a valid token.
- Finally, in `index.ts`, we loaded our `.env` variables, set up `helmet` (for basic HTTP security), enabled `cors` (so our React frontend running on port `5173` is allowed to talk to the backend on port `4000`), and mounted the API routes at `/auth` and `/api/workspaces`.
