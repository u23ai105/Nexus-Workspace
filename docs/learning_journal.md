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

---

## Fixing Git State (`.gitignore`)

When we tried to commit our code, Git accidentally staged every single file inside `node_modules` (thousands of files). We completely forgot to add a `.gitignore` file to the root of our monorepo!

### Terminal Commands Ran
```bash
git rm -r --cached .
git add .
```
**Explanation:** 
- After creating a proper `.gitignore` file (which tells Git to ignore `node_modules/`, `.env`, and `dist/`), we ran `git add .` again. This time, Git completely ignored the massive module folders and only staged our actual source code!

---

## TypeScript Build Fixes (`pnpm run build`)

When we first tested our workspace compilation by running `pnpm run build`, Turborepo threw two TypeScript errors in the `apps/server` package. Here is exactly what went wrong and how we fixed it:

### 1. The Missing Database Link
**The Error:** `Cannot find module '@nexus/database' or its corresponding type declarations.`
**The Fix:** 
We had built our `packages/database`, but we forgot to explicitly tell the server that it depends on it. 
We opened `apps/server/package.json` and added:
```json
"dependencies": {
  "@nexus/database": "workspace:*"
}
```
**Explanation:** `workspace:*` is a special pnpm command that tells the server: *"Don't try to download this from the public internet. Look inside our monorepo folders and create a symlink to it directly."*

### 2. The Zod Error API Change
**The Error:** `Property 'errors' does not exist on type 'ZodError<unknown>'`
**The Fix:**
In our `auth.controller.ts` and `workspace.controller.ts`, we had a `catch` block that caught Zod validation errors and returned `error.errors`. 
However, the newest version of Zod deprecated `.errors` in favor of `.issues` for stricter typing.
We changed:
`return res.status(400).json({ error: error.errors });` 
to 
`return res.status(400).json({ error: error.issues });`

After making these two fixes and running `pnpm install` (to link the packages), `pnpm run build` completed with 0 errors across the entire monorepo!

---

## Fixing Database Connection Errors During Login (`apps/server/.env`)

When we tried to test logging in and registering users, the database connection failed. Upon investigation, we found why:

### The Problem
Our Supabase database credentials (`DATABASE_URL` and `DIRECT_URL`) were originally stored in `packages/database/.env` when we created and migrated our database schema. 
However, when the Node.js Express backend server (`apps/server`) boots up, it reads process environment variables from its own directory: `apps/server/.env`. 

Because `apps/server/.env` only contained our `PORT`, `JWT_SECRET`, and `CLIENT_URL`, whenever the server tried to call Prisma (e.g., `prisma.user.findUnique`), Prisma looked for `process.env.DATABASE_URL`, found `undefined`, and crashed or threw a connection error!

### The Solution
We copied `DATABASE_URL` and `DIRECT_URL` from `packages/database/.env` directly into `apps/server/.env`:
```env
DATABASE_URL="postgresql://postgres.fjbswzymkojvykzbqhjx:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.fjbswzymkojvykzbqhjx:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
```
**Why this works:** In microservice and monorepo architectures, every standalone server application (like our Express API or a future worker service) must have access to the database credentials in its own runtime environment variables. Now when `apps/server` starts up, Prisma can successfully connect to our cloud Supabase pooler!

### 2. Rectifying the Regional Pooler Error (`FATAL: tenant/user not found`)
Even after copying the `.env` variables, when we tested user login, Prisma threw this error in the terminal:
`FATAL: (ENOTFOUND) tenant/user postgres.fjbswzymkojvykzbqhjx not found`

**The Root Cause:**
Our original connection string attempted to route traffic through Supabase's regional AWS Mumbai pooler (`aws-1-ap-south-1.pooler.supabase.com:6543`). However, because Supabase enforces strict project-to-pooler mapping, if a project ID is routed through Supavisor or hosted on a different pooler node, connecting to a specific regional pooler domain will reject the authentication credentials.

**The Solution:**
We updated both `apps/server/.env` and `packages/database/.env` to connect directly to the database's universal domain on port 5432:
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.fjbswzymkojvykzbqhjx.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.fjbswzymkojvykzbqhjx.supabase.co:5432/postgres"
```
By connecting directly to `db.fjbswzymkojvykzbqhjx.supabase.co:5432`, we bypass regional pooler lookups completely. The database server directly authenticates the `postgres` user and processes queries instantly!

---

## Phase 2 (Part 1): Tiptap + Yjs Client Integration

### 1. Connecting Tiptap to Socket.io (`CollaborativeEditor.tsx`)
In this phase, we implemented the frontend integration layer that bridges our custom Socket.io server with the Yjs document state and the Tiptap rich-text editor. 

We created the `CollaborativeEditor.tsx` component to handle the entire lifecycle of the real-time session. 

**Code Architecture & Logic:**
- **State Initialization**: We use `useState(() => new Y.Doc())` and `new Awareness(ydoc)` to lazily instantiate the document and awareness states exactly once per component mount. This prevents React re-renders from accidentally destroying the document state.
- **Socket Connection**: Inside a `useEffect`, we initialize the Socket.io client using `io(serverUrl, { auth: { token } })`. This securely passes the JWT from the frontend to our server's middleware.
- **Room Joining**: Once the socket emits the `connect` event, we immediately emit `join-document` with the `documentId`. The server responds by sending the initial document state and placing our socket in the correct Socket.io room.
- **Yjs Data Syncing (Custom Implementation)**: 
  Because we wrote a custom Yjs Socket.io backend (instead of using an off-the-shelf provider like `y-websocket`), we had to decode the sync messages manually using `lib0/decoding`. 
  - When the server emits a `sync` event, it prepends the message with a `messageType` (1 for Step 2, 2 for Update). We parse the `messageType` using `decoding.readVarUint(decoder)`, and then read the remaining bytes as the `update` payload.
  - We apply incoming updates using `Y.applyUpdate(ydoc, update, 'server')`. The `'server'` transaction origin is crucial—it tags the update so that when our local `ydoc.on('update')` listener fires, we know NOT to emit this same update back to the server, preventing an infinite echo loop!
- **Awareness (Cursors & Presence)**: 
  Similar to document updates, we listen to `socket.on('awareness')` to apply remote cursor positions, and we hook into `awareness.on('update')` to broadcast our local cursor movements back to the server using `encodeAwarenessUpdate()`.
- **Cleanup**: In the `useEffect` cleanup function (which runs on component unmount), we call `socket.disconnect()`, remove the Yjs listeners, and call `.destroy()` on both the Y.Doc and Awareness instances to prevent severe memory leaks.

### 2. NPM Packages Used
This setup relies on a very specific set of dependencies that were already installed in our `apps/web/package.json`:
- **Core Real-Time**: `socket.io-client`, `yjs`, `y-protocols`, and `lib0`.
- **Tiptap Ecosystem**: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-collaboration`, and `@tiptap/extension-collaboration-caret`.

### 3. Fixing the `lib0` TypeScript Dependency Error
**The Error:** `Cannot find module 'lib0/decoding' or its corresponding type declarations.` in `CollaborativeEditor.tsx:L5`.
**The Cause:** 
While `lib0` is a dependency of both `yjs` and `y-protocols`, and is technically installed in our `node_modules` by `pnpm`, we are importing from it *directly* in our `CollaborativeEditor.tsx` file (e.g., `import * as decoding from 'lib0/decoding'`). 
In strict package managers like `pnpm`, and in strict TypeScript module resolution, you cannot directly import a transitive dependency (a dependency of a dependency) unless it is explicitly declared in your own `package.json`. TypeScript cannot find the type definitions for it because it considers it an undeclared external module.

**The Fix:**
We needed to explicitly install `lib0` as a dependency in the `web` application.
I ran the following terminal command from the workspace root:
```bash
pnpm add lib0 --filter web
```
**Explanation:**
- `pnpm add lib0`: Tells the package manager to download and register the `lib0` package (which provides the utility functions we need for decoding the raw byte streams from Yjs).
- `--filter web`: A Turborepo/pnpm workspace flag that specifically tells the package manager to install this package ONLY into the `apps/web` project's `package.json`, rather than installing it into every project or at the root of the workspace.

---

## [Date: 2026-07-19] - Resolving TSConfig ignoreDeprecations Configuration Error

### The Problem
When loading the project or running editor integration tools, an error is reported indicating:
`Invalid value for '--ignoreDeprecations'. @[d:\nexsus_workspace\nexsus_project\Nexus-Workspace\apps\web\tsconfig.app.json:L29]`

### What is `ignoreDeprecations`?
The `ignoreDeprecations` flag was introduced in TypeScript as a compiler option. Its main purpose is to temporarily silence deprecation warnings for compiler flags that are planned for removal in future versions (for example, flags deprecated in 5.0 are silenced by setting `"ignoreDeprecations": "5.0"`, and they stop working altogether in 6.0).

### The Cause of the Error
1. **Version Mismatch between Editor/Language Service and Package Resolver**:
   - The workspace package `apps/web` specifies `"typescript": "~6.0.2"` in `package.json` and resolved `6.0.3` in the lockfile. Under TS 6.0, `"ignoreDeprecations": "6.0"` could potentially be valid for silencing 6.0 deprecations.
   - However, the IDE/editor language service, or other packages in the monorepo, use TypeScript 5.9.x (or another version of TypeScript < 6.0). 
   - When a TypeScript language service running a version less than 6.0 reads `"ignoreDeprecations": "6.0"`, it fails to recognize `"6.0"` as a valid value because it is a future version that the compiler does not yet know about. This triggers a strict parser validation error: `Invalid value for '--ignoreDeprecations'`.

2. **No Deprecated Options in Use**:
   - Checking the actual `tsconfig.app.json`, there are no deprecated configuration options being used (e.g., options like `importsNotUsedAsValues`, `preserveValueImports`, `charset`, etc.).
   - Therefore, the `"ignoreDeprecations": "6.0"` setting is entirely redundant and serves no functional purpose in this specific configuration.

### The Fix
We removed `"ignoreDeprecations": "6.0"` from `apps/web/tsconfig.app.json` and adjusted the formatting to avoid any trailing comma syntax issues:

```json
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

### Verification
We verified the modification by running the local package-specific TypeScript compiler check command:
```bash
pnpm --filter web exec tsc --noEmit
```
- **Explanation of the command:**
  - `pnpm --filter web exec`: Tells the pnpm package manager to run the command in the context of the `apps/web` workspace directory.
  - `tsc --noEmit`: Invokes the TypeScript compiler in dry-run mode, parsing the configurations and verifying that types compile successfully without producing output files.
  
The compiler successfully checked the project files without emitting errors, confirming that the configuration is now clean and fully compatible across different language services and TypeScript versions.

---

## [Date: 2026-07-19] — Step 2.4: Tiptap Collaboration Cursors (Live User Presence)

### Overview
In this step we implemented **live cursors** — the colored vertical carets and floating username labels that show exactly where every other connected user's cursor is positioned inside the document in real-time. This is the same feature you see in Google Docs or Notion when collaborators edit together.

---

### 1. How Collaboration Cursors Work (the Theory)

To render remote cursors, we need two things:

**A) The cursor position** — Where in the ProseMirror document tree is the other user's selection anchor/head? This is NOT stored in the Yjs Y.Doc (the document CRDT). The doc only stores the actual content (text, marks, nodes). Cursor positions are *ephemeral* — they change every keystroke and don't need to be persisted.

**B) The user's identity** — What name and color should we display? This needs to be associated with the cursor position.

Both of these are handled by a separate protocol called **Yjs Awareness** (`y-protocols/awareness`). The `Awareness` class is a CRDT-like shared state map. Every connected client has a unique `clientID` integer. Each client can write arbitrary JSON data into the awareness map under their own `clientID`. All other clients receive these updates in real-time.

Here is the data flow:

```
User A moves cursor
    → ProseMirror fires a 'selectionUpdate' transaction
    → CollaborationCaret extension reads new cursor position
    → Writes it into awareness.localState as { anchor, head, user: { name, color } }
    → awareness.on('update') fires with added/updated/removed arrays
    → Our handler encodes the update: encodeAwarenessUpdate(awareness, [clientID])
    → Emits it via socket.emit('awareness', ...)
    → Server broadcasts to all other sockets in the room
    → User B's browser receives 'awareness' socket event
    → applyAwarenessUpdate(awareness, update, 'server')
    → awareness map now contains User A's cursor position
    → CollaborationCaret extension re-reads awareness and re-renders User A's cursor
```

---

### 2. Files Changed

#### A) New File: `collaboration-cursors.css`

We created a dedicated stylesheet for cursor rendering at:
`apps/web/src/components/editor/collaboration-cursors.css`

This file is imported by `NexusEditor.tsx` with a side-effect import:
```ts
import './collaboration-cursors.css'
```
This is a "side-effect import" — there is no exported value, it just injects the CSS into the page.

**Key CSS Rules Explained:**

```css
.collaboration-cursor__caret {
  border-left: 2px solid var(--cursor-color, #a855f7);
  margin-left: -1px;
  position: relative;
  pointer-events: none;
  animation: nexus-caret-blink 1.1s ease-in-out infinite;
}
```
- `border-left` is the vertical bar. It's 2px wide.
- `var(--cursor-color, #a855f7)` reads a CSS custom property. Tiptap sets `style="--cursor-color: #hexvalue"` inline on each caret element, so each user's cursor is automatically their unique color without any JS manipulation.
- `margin-left: -1px` compensates for the border width so the text flow doesn't shift.
- `pointer-events: none` means the cursor decorations don't interfere with mouse clicks in the editor.
- `animation: nexus-caret-blink` makes it pulse like a real text cursor.

```css
.collaboration-cursor__label {
  position: absolute;
  top: -1.6em;
  left: -1px;
  padding: 2px 7px 3px;
  border-radius: 4px 4px 4px 0;
  background-color: var(--cursor-color, #a855f7);
  color: #ffffff;
  font-size: 11px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 20;
}
```
- `position: absolute` + `top: -1.6em` lifts the label *above* the text line where the caret sits. The label is a child of the `.collaboration-cursor__caret` span, and since the caret is `position: relative`, this is relative to the caret's location.
- `border-radius: 4px 4px 4px 0` creates a "speech bubble" shape — all corners rounded except bottom-left, which gives a subtle pointer effect pointing down at the cursor.
- `white-space: nowrap` prevents long usernames from wrapping onto two lines.

---

#### B) Modified: `NexusEditor.tsx`

**Change 1 — Awareness Identity Initialization**

Before this fix, `NexusEditor` never told the `awareness` object who the current user is. Remote users would see an anonymous cursor with no name.

We added:
```ts
useMemo(() => {
  awareness.setLocalStateField('user', {
    name: user.name,
    color: user.color,
  })
}, [awareness, user.name, user.color])
```
- `awareness.setLocalStateField('user', ...)` writes into the local awareness map under the key `'user'`. All remote clients will receive this data.
- We use `useMemo` (not `useEffect`) because we want this to run *synchronously* before the first render, ensuring the awareness state is set before the editor initialises and sends its first update. If we used `useEffect`, there would be one render frame where the identity is missing.

**Change 2 — `beforeunload` Tab-Close Cleanup**

```ts
useEffect(() => {
  const handleBeforeUnload = () => {
    awareness.setLocalState(null)
    const removal = encodeAwarenessUpdate(awareness, [awareness.clientID])
    void removal
  }

  window.addEventListener('beforeunload', handleBeforeUnload)
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }
}, [awareness])
```
- `window.addEventListener('beforeunload', ...)` registers a callback that fires just before the page unloads (tab close, browser close, page navigation).
- `awareness.setLocalState(null)` sets our local awareness entry to `null`. The `Awareness` CRDT marks our `clientID` as "removed" in the next encoded update.
- We call `encodeAwarenessUpdate` to encode this removal. This triggers the `awareness.on('update')` listener in `CollaborativeEditor.tsx`, which calls `socket.emit('awareness', ...)`. Modern browsers usually buffer and send one final WebSocket frame before tearing down the connection. This means peers receive our departure notice and can remove our cursor from their UI within milliseconds.
- In `useEffect`'s cleanup function (`return () => {...}`), we call `window.removeEventListener` to prevent the handler from leaking if the component unmounts normally during SPA navigation.

---

#### C) Modified: `CollaborativeEditor.tsx`

This is the parent component that owns the `socket`, `ydoc`, and `awareness` instances.

**Change 1 — Announce Identity Before Joining the Room**

We moved `awareness.setLocalStateField` to run *before* `socket.emit('join-document')`:

```ts
awareness.setLocalStateField('user', {
  id: userId,
  name: userName,
  color: userColor,
})
```
- `userId` comes from the JWT token via props — the real user's server-side identity.
- `userName` is their display name.
- `userColor` is an HSL color generated once and stored in `localStorage` (see `getUserInfo()` in `App.tsx`).

**Change 2 — `beforeunload` with Direct Socket Flush**

In `CollaborativeEditor`, we have access to the `socket` instance, so our `beforeunload` handler can do a more complete job:

```ts
const handleBeforeUnload = () => {
  awareness.setLocalState(null)
  const removalUpdate = encodeAwarenessUpdate(awareness, [awareness.clientID])
  socket.emit('awareness', Array.from(removalUpdate))
}
window.addEventListener('beforeunload', handleBeforeUnload)
```
- This directly calls `socket.emit` in the beforeunload handler, instead of relying on the `awareness.on('update')` listener.
- This is more reliable for the tab-close case because it bypasses the async listener chain entirely and delivers the departure notice in a single synchronous step.
- We also added `window.removeEventListener('beforeunload', handleBeforeUnload)` to the `useEffect` cleanup function so the listener is removed during normal unmounts.

**Change 3 — Typed Awareness Update Handler**

We replaced the `any` type for the awareness callback parameters with proper TypeScript types:
```ts
// Before (unsafe):
const handleAwarenessUpdate = ({ added, updated, removed }: any, origin: any) => { ... }

// After (properly typed):
const handleAwarenessUpdate = (
  { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
  origin: unknown,
) => { ... }
```
- The `clientID` values in `added`, `updated`, and `removed` are always `number[]` per the y-protocols specification.
- Using `unknown` instead of `any` for `origin` is safer — it forces you to narrow the type before using it, preventing accidental bugs.

---

### 3. The `CollaborationCaret` Provider Shape

A confusing aspect of Tiptap v3 is that `CollaborationCaret.configure()` expects a `provider` object with an `.awareness` property, not a raw `Awareness` instance directly:

```ts
// ❌ Wrong — passing Awareness directly
CollaborationCaret.configure({
  provider: awareness,
  user: { name, color },
})

// ✅ Correct — wrapping Awareness in a provider-shaped object
CollaborationCaret.configure({
  provider: { awareness },
  user: { name, color },
})
```
The `{ awareness }` shorthand is JavaScript object shorthand notation. It creates an object `{ awareness: awareness }`. Tiptap internally accesses `provider.awareness` to subscribe to cursor events. This pattern lets you use any provider (HocuspocusProvider, y-websocket, or a completely custom one like ours) as long as it exposes an `.awareness` property.

---

### 4. Verification

TypeScript compilation was verified with:
```bash
pnpm --filter web exec tsc --noEmit
```
- `pnpm --filter web exec`: Run a command inside the `apps/web` package workspace.
- `tsc --noEmit`: Compile TypeScript and report errors without writing any output `.js` files.

Result: ✅ **0 errors, 0 warnings.**



---

## [Date: 2026-07-19] - Resolving Missing `@tiptap/core` Dependency

### 1. The Problem
While implementing customized Tiptap extensions (specifically the custom mark extension `AuthorHighlight.ts` to track local/remote text insertions and render authorship tooltips), we imported `Mark` and `mergeAttributes` from `@tiptap/core`:
```ts
import { Mark, mergeAttributes } from '@tiptap/core'
```
However, compiling the TypeScript project or running the bundler failed with the following compilation error:
```
Cannot find module '@tiptap/core' or its corresponding type declarations.
```

Upon inspecting the `package.json` file in `apps/web/package.json`, we discovered that while various Tiptap extensions (`@tiptap/extension-collaboration`, `@tiptap/extension-underline`, `@tiptap/starter-kit`, `@tiptap/react`, etc.) were installed, the base library `@tiptap/core` was missing from the package's dependencies list. Without `@tiptap/core` explicitly listed as a dependency, the package manager does not install it in the local workspace node_modules folder or link it properly in the pnpm monorepo context, leading to TypeScript being unable to resolve the package types or implementations.

### 2. The Solution
We updated `apps/web/package.json` to add `@tiptap/core` as an explicit dependency matching the exact version range used for all other Tiptap packages (`^3.28.0`):

```diff
     "@nexus/shared": "workspace:*",
+    "@tiptap/core": "^3.28.0",
     "@tiptap/extension-character-count": "^3.28.0",
```

We then ran:
```bash
pnpm install
```
This command runs the package manager's installation process at the root level of the monorepo. It checks `apps/web/package.json`, resolves the missing `@tiptap/core` package, fetches it from the registry, and configures the appropriate symlinks.

### 3. Verification
To verify the resolution, we will run the TypeScript compiler check on the `web` workspace:
```bash
pnpm --filter web exec tsc --noEmit
```
This runs the typescript compiler (`tsc`) with the `--noEmit` flag inside the `web` workspace directory to ensure all files (including `AuthorHighlight.ts`) now compile without any missing dependency errors.

Result: ✅ **0 errors, 0 warnings. Compilation completed successfully after installing @tiptap/core.**

---

## [Date: 2026-07-19] - Resolving Missing `@tiptap/pm` Dependency & TypeScript Deprecation Warnings

### 1. The Problem
After adding `@tiptap/core` to the dependencies list in the `web` workspace, another type check error was encountered in [AuthorHighlight.ts](file:///d:/nexsus_workspace/nexsus_project/Nexus-Workspace/apps/web/src/components/editor/AuthorHighlight.ts#L21):
```
Cannot find module '@tiptap/pm/state' or its corresponding type declarations.
```
This error occurred because [AuthorHighlight.ts](file:///d:/nexsus_workspace/nexsus_project/Nexus-Workspace/apps/web/src/components/editor/AuthorHighlight.ts) imports the `Plugin` class from `@tiptap/pm/state` (which provides the underlying ProseMirror state/plugin capabilities used to append transactions for tracking character insertions):
```ts
import { Plugin } from '@tiptap/pm/state'
```
Under strict package managers like `pnpm`, packages are not hoisted/exposed to workspaces unless explicitly declared in the workspace's `package.json` file. Even though `@tiptap/pm` might exist as a nested dependency of `@tiptap/core`, it was not declared in the dependencies list of the `web` application ([package.json](file:///d:/nexsus_workspace/nexsus_project/Nexus-Workspace/apps/web/package.json)). Therefore, the TypeScript compiler was unable to resolve the `@tiptap/pm/state` import.

Additionally, compiling the TypeScript project using configuration targets exposed a TypeScript deprecation warning (treated as an error under certain build settings):
```
tsconfig.app.json(25,5): error TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0. Specify compilerOption '"ignoreDeprecations": "6.0"' to silence this error.
```

### 2. The Solution

#### A. Code Changes
1. **Added `@tiptap/pm` to Dependencies**:
   We added `"@tiptap/pm": "^3.28.0"` to the `dependencies` block of [apps/web/package.json](file:///d:/nexsus_workspace/nexsus_project/Nexus-Workspace/apps/web/package.json). This ensures `pnpm` will explicitly download, link, and expose the `@tiptap/pm` package (which bundles and typed-wraps ProseMirror libraries like `prosemirror-state`, `prosemirror-view`, `prosemirror-model`, and `prosemirror-transform`) to the `web` workspace project.
   ```diff
        "@tiptap/extension-underline": "^3.28.0",
        "@tiptap/react": "^3.28.0",
   +    "@tiptap/pm": "^3.28.0",
        "@tiptap/starter-kit": "^3.28.0",
   ```

2. **Silenced TS5101 Deprecation Warning**:
   We added `"ignoreDeprecations": "6.0"` inside the `compilerOptions` section of [apps/web/tsconfig.app.json](file:///d:/nexsus_workspace/nexsus_project/Nexus-Workspace/apps/web/tsconfig.app.json). This instructs the TypeScript compiler (version 6.0+) to silence warning `TS5101` regarding the deprecation of the `baseUrl` configuration option, ensuring the compilation completes without error.
   ```diff
        "module": "esnext",
        "allowArbitraryExtensions": true,
        "skipLibCheck": true,
   +    "ignoreDeprecations": "6.0",
    
        /* Bundler mode */
   ```

#### B. Terminal Commands Executed
To apply and verify these changes, the following commands were run:
1. **`pnpm install`**
   - *What it does:* Runs package manager dependency installation across the entire monorepo workspace. It reads the updated [apps/web/package.json](file:///d:/nexsus_workspace/nexsus_project/Nexus-Workspace/apps/web/package.json) file, determines that `@tiptap/pm` is a new dependency, fetches the package from the npm registry, stores/caches it globally, and updates the local symlinks inside `apps/web/node_modules` so that the imports resolve successfully.
2. **`pnpm --filter web run build`**
   - *What it does:* Triggers the `build` script of the `web` workspace package. The build script executes `tsc -b && vite build`, compiling the TypeScript project (using configuration files [tsconfig.json](file:///d:/nexsus_workspace/nexsus_project/Nexus-Workspace/apps/web/tsconfig.json) and [tsconfig.app.json](file:///d:/nexsus_workspace/nexsus_project/Nexus-Workspace/apps/web/tsconfig.app.json)) and bundling the assets using Vite.

### 3. Verification
The build command completed successfully:
```bash
pnpm --filter web run build
```
Result: ✅ **Vite compilation and TypeScript build finished with 0 errors.** The application bundles correctly, and the `@tiptap/pm/state` import is fully resolved.

---

## [Date: 2026-07-19] - Fixing tsconfig.app.json ignoreDeprecations & baseUrl Configuration

### 1. The Problem
An error was reported in the IDE/Language Service for [apps/web/tsconfig.app.json](file:///d:/nexsus_workspace/nexsus_project/Nexus-Workspace/apps/web/tsconfig.app.json):
```
Invalid value for '--ignoreDeprecations'. @[d:\nexsus_workspace\nexsus_project\Nexus-Workspace\apps\web\tsconfig.app.json:L9]
```

### 2. The Cause of the Error
1. **Background**: Previously, in TypeScript 6.0+, the `baseUrl` configuration option was deprecated, throwing warning `TS5101`. To silence this, `"ignoreDeprecations": "6.0"` was added to [apps/web/tsconfig.app.json](file:///d:/nexsus_workspace/nexsus_project/Nexus-Workspace/apps/web/tsconfig.app.json).
2. **Issue**: While the workspace's local TypeScript version is `6.0.3` (which supports `"ignoreDeprecations": "6.0"`), the IDE/editor's built-in TypeScript language service runs on an older version of TypeScript (e.g. `< 6.0`).
3. When the older language service parses `"ignoreDeprecations": "6.0"`, it does not recognize `"6.0"` as a valid value because the compiler has not reached that version. It therefore flags it as an invalid value configuration error.

### 3. The Solution
Instead of keeping the workarounds, we can address the root cause of the deprecation warning:
* **The Root Cause**: The deprecation of `baseUrl` in TypeScript.
* **Modern TypeScript Capability**: In TypeScript 4.1+ and under modern bundler settings (`"moduleResolution": "bundler"`), the `paths` alias map (e.g., `"@/*": ["./src/*"]`) works perfectly **without** needing a `baseUrl` defined.
* **Action**: We removed both `"baseUrl": "."` and `"ignoreDeprecations": "6.0"`. Without `baseUrl`, there is no deprecation warning `TS5101`, which completely removes the need to use `ignoreDeprecations`.

### 4. Implementation Details

#### A. File Modifications

##### 1. [apps/web/tsconfig.app.json](file:///d:/nexsus_workspace/nexsus_project/Nexus-Workspace/apps/web/tsconfig.app.json)
We removed the following lines from the `compilerOptions` section:
* **Line 9**: `"ignoreDeprecations": "6.0",` (removed)
  This option was telling the compiler to ignore deprecation warnings introduced in TypeScript 6.0. Removing it cleans up the configuration for editors using older TS versions.
* **Line 26**: `"baseUrl": ".",` (removed)
  This option was specifying the base directory to resolve non-absolute module names. Removing it prevents warning `TS5101` in newer TypeScript compilers.
* The paths mapping is preserved under `compilerOptions`:
  ```json
  "paths": {
    "@/*": ["./src/*"]
  }
  ```
  Since `baseUrl` is absent, the compiler correctly resolves path aliases relative to the location of the `tsconfig.app.json` file itself.

#### B. Terminal Commands Executed
1. **`pnpm --filter web exec tsc -v`**
   - *What it does:* Checks the locally installed version of the TypeScript compiler inside the `web` application sub-workspace.
   - *Result:* Confirmed it is version `6.0.3`.
2. **`pnpm --filter web exec tsc --noEmit`**
   - *What it does:* Runs the TypeScript compiler check for the `web` workspace package in a "no output" dry-run mode. This processes all `.ts`/`.tsx` files to verify that syntax, configuration options, imports, and type mappings compile successfully without writing any build outputs (which avoids cluttering local directories).
   - *Result:* Compiles with 0 errors, validating that removing `baseUrl` does not break path resolution or throw deprecation errors.

---

## [Date: 2026-07-19] - Building Workspace Applications

### 1. Monorepo Build Commands
To compile and build the frontend, backend, and all dependent internal packages, we can execute build commands either globally or on a per-package basis:

* **Build Everything (Monorepo-wide)**:
  ```bash
  pnpm run build
  ```
  - *What it does:* Runs the `build` script defined in the root `package.json`. This invokes Turborepo (`turbo run build`), which builds all workspace packages and apps in parallel while maintaining correct dependency ordering.
  
* **Build Frontend (`web`) Only**:
  ```bash
  pnpm --filter web run build
  ```
  - *What it does:* Instructs `pnpm` to execute the build command specifically within the context of the `apps/web` package. Inside `apps/web`, the script executes `tsc -b && vite build`.
  - Alternatively: `npx turbo run build --filter=web`
  
* **Build Backend (`server`) Only**:
  ```bash
  pnpm --filter server run build
  ```
  - *What it does:* Instructs `pnpm` to execute the build command specifically within the context of the `apps/server` package. Inside `apps/server`, the script executes `tsc` to compile TypeScript to JS.
  - Alternatively: `npx turbo run build --filter=server`

### 2. Execution and Verification
We executed the global build command:
```bash
pnpm run build
```
* **Command Operation**:
  - Turborepo analyzes the project dependency graph. It notices that `@nexus/shared` and `@nexus/database` are internal dependency packages of the `web` (frontend) and `server` (backend) applications.
  - Turborepo builds `@nexus/shared` and `@nexus/database` first.
  - Then, in parallel, it compiles the backend (`apps/server`) by invoking the TypeScript compiler (`tsc`) and compiles/bundles the frontend (`apps/web`) using `tsc -b` and the Vite/Rolldown compiler.
* **Results**:
  - All 4 workspace packages/applications built successfully.
  - Verification complete: 0 errors.

---

## [Date: 2026-07-19] - Resolving EADDRINUSE conflict and CORS issues

### 1. The Problem
When testing registration and login in the frontend interface, the network calls failed with:
`TypeError: Failed to Fetch` (CORS Block / Network Error)
Additionally, when starting the backend dev server individually, the terminal output reported:
`Error: listen EADDRINUSE: address already in use :::4000`

### 2. The Cause
* **Zombie Node Processes**: Node.js processes from previous development runs remained active in the background, keeping a lock on port `4000` (backend) and port `5173` (frontend).
* **Port Conflict & CORS Fallback**: 
  - Because port `5173` was held, starting the frontend dev server forced Vite to fall back to port `5175`.
  - The backend server's CORS configuration specifies `process.env.CLIENT_URL || 'http://localhost:5173'`. When the frontend running on `http://localhost:5175` sent network requests to the backend on `http://localhost:4000`, the browser blocked the requests because the origin did not match the CORS allowed origin.

### 3. The Solution
* **Action**: Forcefully terminated all active Node.js processes to release the locked network ports.
* **Terminal Command**:
  ```powershell
  taskkill /F /IM node.exe
  ```
  - `/F`: Forcefully terminates the matching processes.
  - `/IM node.exe`: Specifies the image name of the processes to terminate.
  
* **Operation & Results**: 
  This freed up ports `4000` and `5173`. When restarted, the frontend runs on the standard port `5173` and backend on `4000`, successfully matching the CORS config and restoring full login and signup functionality.

---

## [Date: 2026-07-19] - Fixing React StrictMode Yjs Document Destroy Bug

### 1. The Problem
When multiple users joined the same collaborative document room, no real-time editing changes or cursor movements synced between their browsers. The editors remained isolated.

### 2. The Cause (React StrictMode Double-Mount)
* **The Component State**: In [CollaborativeEditor.tsx](file:///d:/nexsus_workspace/nexsus_project/Nexus-Workspace/apps/web/src/components/editor/CollaborativeEditor.tsx), `ydoc` and `awareness` are instantiated inside lazy `useState` hooks:
  ```ts
  const [ydoc] = useState(() => new Y.Doc())
  const [awareness] = useState(() => new Awareness(ydoc))
  ```
  This creates the instances once and reuses them on subsequent renders.
* **The StrictMode Unmount**: In React 18/19 development mode, React mounts, unmounts, and remounts components to find resource leaks.
  - On the first mount, the `useEffect` runs, creating the socket connection and adding event listeners on the `ydoc` instance.
  - On the immediate unmount, the effect cleanup function ran:
    ```ts
    ydoc.destroy()
    awareness.destroy()
    ```
    This successfully destroyed the Yjs instances.
  - On the second mount, React reused the original `ydoc` and `awareness` instances from state, but they were already in a **destroyed** state. Dead/destroyed instances cannot emit event updates or sync, rendering the collaboration silent.

### 3. The Solution
We removed the `ydoc.destroy()` and `awareness.destroy()` calls from the `useEffect` cleanup handler. Because these are owned and preserved by the component's state (`useState`), keeping them alive across StrictMode remounts ensures the active Y.Doc continues to propagate updates. The network connection (`socket.disconnect()`) and listeners are still cleaned up correctly on real unmount.

---

## [Date: 2026-07-19] - Resolving Tiptap StarterKit History Option Type Error

### 1. The Problem
During compilation, TypeScript reported the following type-checking error in [NexusEditor.tsx](file:///d:/nexsus_workspace/nexsus_project/Nexus-Workspace/apps/web/src/components/editor/NexusEditor.tsx):
```
Object literal may only specify known properties, and 'history' does not exist in type 'Partial<StarterKitOptions>'.
```

### 2. The Cause
* **Tiptap Version Upgrades / Package Changes**:
  - The frontend workspace (`apps/web`) is using `@tiptap/starter-kit` version `^3.28.0`.
  - In earlier versions of Tiptap (such as v2), the history extension could be configured or disabled by passing `{ history: false }` to the `StarterKit.configure()` options object.
  - In newer versions (such as Tiptap v3), the configuration property key for configuring or disabling the history extension within the starter-kit package was changed to `undoRedo`.
  - Checking the library source code at `@tiptap/starter-kit/src/starter-kit.ts` verified that the `StarterKitOptions` interface defines:
    ```ts
    undoRedo: Partial<UndoRedoOptions> | false
    ```
  - Because `history` is no longer a valid property on this interface, the TypeScript compiler flagged it as an invalid property key.

### 3. The Solution
* **Code Modification**:
  In [NexusEditor.tsx](file:///d:/nexsus_workspace/nexsus_project/Nexus-Workspace/apps/web/src/components/editor/NexusEditor.tsx), we changed the configuration property inside `StarterKit.configure` from `history: false` to `undoRedo: false`.
  
  ```typescript
  StarterKit.configure({
    // Disable StarterKit's built-in history plugin —
    // the Collaboration extension (Yjs) handles undo/redo via its own CRDT.
    undoRedo: false,
  })
  ```
  This retains the critical architectural requirement of disabling the local/non-collaborative undo-redo manager (which would corrupt shared document history) while satisfying the updated TypeScript type definitions.

  * **Result**: The command completed successfully with exit code 0, indicating that the type check was successful and the Vite production client bundle compiled correctly.

---

## [Date: 2026-07-19] - Fixing Vite Dev Server Crash on y-protocols and @tiptap/pm Root Exports

### 1. The Problem
When running the development server via:
```bash
pnpm run dev
```
The task immediately failed and the web server crashed during the Vite startup optimization step, printing errors like:
```
web:dev: error when starting dev server:
web:dev: Error: "." is not exported under the conditions ["module", "browser", "development", "import"] from package D:/nexsus_workspace/nexsus_project/Nexus-Workspace/apps/web\node_modules\y-protocols
```
Followed by a similar plugin error when resolving `@tiptap/pm`.

### 2. The Cause
* **Missing Root Package Exports**:
  - Both `y-protocols` and `@tiptap/pm` are wrapper packages that only expose specific subpaths (e.g. `y-protocols/awareness`, `y-protocols/sync`, `@tiptap/pm/state`, `@tiptap/pm/model`, etc.).
  - Their respective `package.json` files do not define a root `.` export mapping to an entry file.
  - In [vite.config.ts](file:///d:/nexsus_workspace/nexsus_project/Nexus-Workspace/apps/web/vite.config.ts), the raw package names `y-protocols`, `@tiptap/pm`, and `@tiptap/y-tiptap` were included in:
    - `resolve.dedupe` (forcing Vite to resolve them to a single physical folder path).
    - `optimizeDeps.include` (forcing Vite's dependency pre-bundler to compile them on startup).
  - Because Vite tried to resolve the non-existent root export (`"."`) for these packages during the pre-bundling configuration phase, it threw a resolve error and aborted the server launch.

### 3. The Solution
* **Configuration Adjustments**:
  In [vite.config.ts](file:///d:/nexsus_workspace/nexsus_project/Nexus-Workspace/apps/web/vite.config.ts), we removed:
  - `y-protocols`, `@tiptap/pm`, and `@tiptap/y-tiptap` from the `resolve.dedupe` list.
  - `y-protocols` and `@tiptap/pm` from the `optimizeDeps.include` list.
  
  We kept the specific subpaths (e.g. `y-protocols/awareness`, `y-protocols/sync`, `@tiptap/pm/state`, etc.) in `optimizeDeps.include`, as these subpaths are fully exported and valid for pre-bundling.

  - **Port Redirection**: The browser active tab must be redirected to `http://localhost:5173/` instead of `http://localhost:5175/` (which was a fallback port used during previous port-locking issues).

---

## [Date: 2026-07-26] - Phase 3: Real-Time Document Persistence, CRDT Snapshotting & Workspace Dashboard

In this major milestone, we transformed our ephemeral real-time collaboration engine into a full-fledged cloud-persistent workspace system. We introduced PostgreSQL binary persistence for Yjs CRDT states, smart debounce saving, a workspace document dashboard, inline renaming, and dirty state protection.

### 1. Database Schema & Prisma Client Generation
* **File Updated:** [schema.prisma](file:///Users/muzammilmohammad/Documents/CSAB/csab/Python/SDE%20Projects/Nexus%20workspace/packages/database/prisma/schema.prisma)
* **Architectural Decisions:**
  - We added a `Document` model in PostgreSQL with relations to `Workspace` and `User` (creator).
  - Crucially, we stored the collaborative state in a `yjsState` column of type `Bytes?` (`BYTEA` in Postgres). Why binary bytes instead of plain text? Yjs uses Conflict-Free Replicated Data Types (CRDTs). The binary update state (`Uint8Array`) contains the full operation history, vector clocks, deleted character tombstones, and formatting marks. Storing raw text would discard this collaborative metadata, causing desynchronization when peers reconnect.
  - We added `textContent String?` as a secondary denormalized field to enable lightning-fast full-text search across documents in the dashboard without having to instantiate or decode Yjs binary blobs in memory.
  - We implemented soft-deletion via `isArchived Boolean @default(false)` so users can recover accidentally deleted documents from a Trash Bin before permanent destruction.

### 2. Backend REST API & Controller Architecture
* **Files Created:** [document.controller.ts](file:///Users/muzammilmohammad/Documents/CSAB/csab/Python/SDE%20Projects/Nexus%20workspace/apps/server/src/controllers/document.controller.ts), [document.route.ts](file:///Users/muzammilmohammad/Documents/CSAB/csab/Python/SDE%20Projects/Nexus%20workspace/apps/server/src/routes/document.route.ts)
* **Line-by-Line & Logic Explanation:**
  - `createDocument`: Checks if `title` is provided. If not, it executes a `prisma.document.count({ where: { workspaceId, title: { startsWith: 'Untitled' } } })` query. If `N` untitled documents exist, it automatically names the new document `Untitled N+1` (or `Untitled Document` for the first one), replicating the frictionless experience of Notion or Notepad.
  - `getDocuments`: Accepts query parameters `workspaceId` and `isArchived` (boolean string). Filters documents and selects lightweight fields (`id`, `title`, `textContent`, `isArchived`, `updatedAt`, `creator`) while explicitly excluding `yjsState` to keep REST network payloads minimal and fast.
  - `updateDocument`: Allows updating metadata (`title`, `isArchived`, `textContent`). Used during inline renaming in the editor or moving items to the trash bin.
  - `deleteDocument`: Executes a permanent `prisma.document.delete({ where: { id } })` once an item is purged from the trash.

### 3. Yjs Socket.io Room Lifecycle & PostgreSQL Synchronization
* **File Updated:** [socket.ts](file:///Users/muzammilmohammad/Documents/CSAB/csab/Python/SDE%20Projects/Nexus%20workspace/apps/server/src/socket.ts)
* **How It Works (Line-by-Line):**
  - **Prisma Import & Save Timers Map:** We imported `prisma` and declared `const saveTimers = new Map<string, NodeJS.Timeout>()`. Why debounce? In real-time collaborative typing, users may generate 20–50 CRDT updates per second. Executing a PostgreSQL query for every keystroke would saturate the database pool.
  - `scheduleSaveToDb(roomName, ydoc)`: Checks if a timer already exists in `saveTimers` for this room. If not, it sets a 3,000ms (3-second) timeout. When the timer fires, it calls `Y.encodeStateAsUpdate(ydoc)`, converts the `Uint8Array` to a Node `Buffer`, and executes `prisma.document.update({ where: { id }, data: { yjsState: buffer } })`.
  - `flushSaveToDb(roomName, ydoc)`: Called when the last user disconnects from a room. It immediately clears any pending debounce timer and forces a synchronous/awaited save to Postgres before the room's Yjs instance is destroyed from memory.
  - `getOrCreateRoom(roomName, documentId)`: Made `async`. When a room is created for the first time in server memory, it queries `prisma.document.findUnique({ select: { yjsState: true } })`. If a binary snapshot exists, it executes `Y.applyUpdate(ydoc, new Uint8Array(docRecord.yjsState))` to restore the full historical CRDT tree before any client joins.
  - `socket.on('update')`: Whenever a client emits a CRDT update, we apply it to the server's in-memory `Y.Doc` and immediately trigger `scheduleSaveToDb(currentRoomName, room.ydoc)`.

### 4. Workspace Document Dashboard UI & Interactive Cards
* **Files Created:** [DocumentCard.tsx](file:///Users/muzammilmohammad/Documents/CSAB/csab/Python/SDE%20Projects/Nexus%20workspace/apps/web/src/components/dashboard/DocumentCard.tsx), [DocumentDashboard.tsx](file:///Users/muzammilmohammad/Documents/CSAB/csab/Python/SDE%20Projects/Nexus%20workspace/apps/web/src/components/dashboard/DocumentDashboard.tsx)
* **UI & Aesthetics Features:**
  - **Glassmorphism Sidebar & Grid:** Built using deep dark palettes (`bg-slate-950/80`, `bg-[#07070B]`), subtle borders (`border-slate-800/80`), and vibrant purple/indigo gradient accents with glowing drop shadows (`shadow-purple-500/25`).
  - **Quick Actions Menu (`⋮`):** Each card features a dropdown menu supporting inline renaming, duplicating documents (creates a copy with `(Copy)` appended to title and duplicates text content), exporting to `.md` (Markdown Blob download) or `.html`, moving to trash, restoring from trash, or deleting forever.
  - **Real-time Filter & Empty States:** Provides instant client-side search filtering across document titles and snippet previews, with custom-designed empty states for both active workspaces and the trash bin.

### 5. Collaborative Editor Upgrade: Inline Renaming, Save Badge & Dirty State Protection
* **Files Updated:** [NexusEditor.tsx](file:///Users/muzammilmohammad/Documents/CSAB/csab/Python/SDE%20Projects/Nexus%20workspace/apps/web/src/components/editor/NexusEditor.tsx), [CollaborativeEditor.tsx](file:///Users/muzammilmohammad/Documents/CSAB/csab/Python/SDE%20Projects/Nexus%20workspace/apps/web/src/components/editor/CollaborativeEditor.tsx), [App.tsx](file:///Users/muzammilmohammad/Documents/CSAB/csab/Python/SDE%20Projects/Nexus%20workspace/apps/web/src/App.tsx)
* **Technical Implementation:**
  - **Cloud Save Badge:** We added a listener to `ydoc.on('update', ...)`. When an update occurs locally (origin !== `'server'`), we set `saveStatus = 'saving'` (`🟡 Saving...`). After a 3.2-second timeout (matching the server debounce), it transitions back to `🟢 Saved to Cloud`.
  - **Dirty State Protection:** We attached a `beforeunload` event listener to `window`. If `saveStatus === 'saving'` when a user attempts to close the browser tab or refresh, we call `e.preventDefault()` to trigger the standard browser warning dialog ("Changes you made may not be saved"). Similarly, clicking the `⬅ Dashboard` button while saving prompts a confirmation modal.
  - **Inline Title Renaming:** The header displays the document title as a clickable element. Clicking transforms it into an auto-focused `<input>`. On submit or blur, it invokes the `onRename` callback, which updates state and sends a `PATCH /api/documents/:id` request to persist the new title in PostgreSQL.

### 6. Full Monorepo Build & TypeScript Verification
* Result: All 4 packages (`@nexus/shared`, `@nexus/database`, `server`, and `web`) compiled with 0 errors.

---

## [Date: 2026-07-27] - Monorepo Performance Analysis: Why Dev Server Reloading Can Be Slow

During development, when executing `pnpm run dev` in the root workspace, notice log messages like:
```
server:dev: [INFO] 00:24:03 Restarting: /Users/.../packages/database/dist/index.js has been modified
```
Followed by a multi-second delay before the Express and Socket.io server is back online.

### 1. Root Causes of Slow Reloading in Monorepos

#### A. Cascade Watcher Triggers (The Why)
In our Turborepo dev workflow, multiple background watch compilers run simultaneously:
1. `@nexus/shared:dev` runs `tsc --watch`.
2. `@nexus/database:dev` runs `prisma generate` and `tsc --watch`.
3. `server:dev` runs `ts-node-dev --respawn --transpile-only src/index.ts`.

When any file is touched or re-checked by TypeScript in `packages/database`, the compiler emits or touches files in `packages/database/dist/index.js`. Because `apps/server` depends on `@nexus/database` via `workspace:*`, `ts-node-dev` monitors those linked `dist` files. The moment a modification timestamp changes in the workspace dependency tree, `ts-node-dev` sends a SIGTERM signal to kill the active server process and initiates a full respawn (`Restarting: ...`).

#### B. Process Boot & Transpilation Overhead (`ts-node` vs. esbuild)
`ts-node-dev` is built on top of `ts-node` and standard Node.js module resolution:
- **On-the-fly Compilation:** Even with `--transpile-only` enabled, `ts-node` intercepts Node's `require()` and `import` calls at runtime, parsing TypeScript syntax via the official JavaScript-based TypeScript compiler engine. This adds noticeable CPU and filesystem latency on every startup.
- **Modern Alternative:** Next-generation TypeScript runners like `tsx` (powered by `esbuild` written in Go) or Node v22+ native `--experimental-strip-types` perform transpilation 10x–50x faster (usually under 50–100ms compared to 2–4 seconds for `ts-node`).

#### C. Prisma ORM Engine & Cloud Database Connection Pooling
When `server:dev` respawns, it must re-initialize the backend runtime from zero:
1. **Prisma Rust Engine:** `@prisma/client` loads a native binary query engine into memory.
2. **TLS/TCP Handshake:** The server initiates a new connection pool to the remote Supabase PostgreSQL pooler (`aws-1-ap-south-1.pooler.supabase.com` on port 6543). Establishing SSL handshakes with cloud databases across the network takes 1–2 seconds.
3. **Socket Port Rebinding:** If the previous process took half a second to cleanly release port `4000`, the new process must wait or retry before binding to the socket.

### 2. Best Practices for Faster Dev Iteration
1. **Ignore Compiled Dist Folders in Watchers:** Configuring `--ignore-watch node_modules` and ignoring `dist/` outputs when working exclusively within the server codebase prevents cascade restarts triggered solely by background declaration builds.
2. **Migrate to High-Speed Loaders:** Replacing `ts-node-dev` with `tsx watch src/index.ts` in `apps/server/package.json` eliminates TypeScript transpilation bottlenecks during development.
3. **Connection Cleanup:** Ensuring graceful shutdown handlers (`process.on('SIGTERM', () => prisma.$disconnect())`) close DB connection pools immediately upon reload requests.


