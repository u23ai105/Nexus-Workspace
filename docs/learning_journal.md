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

**Decision:** We will use **`npm`** for simplicity, but if you want the absolute best performance and industry-standard modern tooling, **`pnpm`** is highly recommended. (We can proceed with `npm` to keep learning simple).

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
