<div align="center">

# ⚡ NextFlow

### AI Workflow Builder

Build, connect, and run AI-powered workflows visually.

[![Next.js](https://img.shields.io/badge/Next.js_16-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Trigger.dev](https://img.shields.io/badge/Trigger.dev-000?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTE0LjYgMS42YS43NS43NSAwIDAgMSAuNC44NUwxMyA5Ljc1aDcuM2EuNzUuNzUgMCAwIDEgLjU1IDEuMjZsLTEwLjUgMTEuMjVhLjc1Ljc1IDAgMCAxLTEuMjctLjcxbDItNy4zSDMuNzVhLjc1Ljc1IDAgMCAxLS41NS0xLjI2bDEwLjUtMTEuMjVhLjc1Ljc1IDAgMCAxIC45MS0uMTRaIi8+PC9zdmc+)](https://trigger.dev)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)](https://prisma.io)

</div>

---

## What is NextFlow?

NextFlow is a **visual AI workflow builder** that lets you create automated pipelines by dragging and connecting nodes on a canvas. Chain together LLM prompts, image processing, video frame extraction, and more — then execute the entire workflow with a single click.

**Think Zapier meets ComfyUI, but for AI tasks.**

### Key Features

- 🧩 **Visual Node Editor** — Drag-and-drop interface built on React Flow
- 🤖 **LLM Integration** — Run prompts through Groq (GPT-OSS, Qwen vision) with markdown-rendered responses
- 🎨 **AI Image Generation** — Generate high-quality images using Pollinations.ai with style presets and aspect ratio control
- ✨ **Prompt Enhancement** — Automatically optimize simple prompts into high-fidelity image generation instructions
- 🪄 **NL Workflow Builder** — Describe a workflow in plain English and let AI build the nodes and connections for you
- 🖼️ **Image Processing** — Upload, crop, and transform images
- 🎬 **Video Processing** — Upload videos and extract frames at specific timestamps
- ⚡ **Background Execution** — Workflows run on Trigger.dev with real-time status tracking
- 🎯 **Selective Execution** — Run full workflows, single nodes, or execute paths up to a specific node
- ⏪ **Undo/Redo History** — Robust history stack for all workflow canvas modifications
- 📊 **Run History** — Full execution history with per-node status, outputs, and timing
- 🚀 **Sample Workflows** — Includes pre-built templates for marketing and product demo use cases
- 🔐 **Authentication** — Clerk-based auth with Google SSO
- 💾 **Auto-Save** — Workflows save automatically to a Postgres database
- 🌙 **Dark UI** — Premium dark theme with purple accent design system

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router, Server Components) |
| **Language** | [TypeScript 5](https://typescriptlang.org) |
| **UI Library** | [React 19](https://react.dev) |
| **Canvas** | [React Flow (@xyflow/react)](https://reactflow.dev) |
| **State Management** | [Zustand](https://zustand-demo.pmnd.rs) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com) + Inline styles |
| **Auth** | [Clerk](https://clerk.com) (with dark theme) |
| **Database** | [PostgreSQL](https://postgresql.org) via [Neon](https://neon.tech) |
| **ORM** | [Prisma](https://prisma.io) |
| **Background Jobs** | [Trigger.dev v4](https://trigger.dev) |
| **LLM** | [Groq API](https://groq.com) (GPT-OSS, Qwen vision) |
| **Image Generation** | [Pollinations.ai](https://pollinations.ai) |
| **Image/Video** | [Transloadit](https://transloadit.com) |
| **Icons** | [Lucide React](https://lucide.dev) |
| **Validation** | [Zod](https://zod.dev) |
| **Deployment** | [Vercel](https://vercel.com) (Frontend) + [Trigger.dev Cloud](https://trigger.dev) (Background Jobs) |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Vercel (Frontend)               │
│  Next.js App Router + React Flow Canvas + Clerk  │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │LeftSidebar│  │  Canvas  │  │ RightSidebar  │  │
│  │(Node List)│  │(Workflow)│  │(Run History)  │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
│                       │                           │
│              API Routes (run workflow)            │
└───────────────────────┬─────────────────────────┘
                        │ HTTP
          ┌─────────────▼──────────────┐
          │     Trigger.dev Cloud       │
          │   (Background Task Runner)  │
          │                             │
          │  ┌─────┐ ┌──────┐ ┌─────┐  │
          │  │ LLM │ │Upload│ │Crop │  │
          │  │Task │ │ Task │ │Task │  │
          │  └──┬──┘ └──┬───┘ └──┬──┘  │
          │     │       │        │      │
          └─────┼───────┼────────┼──────┘
                │       │        │
         ┌──────▼┐  ┌───▼────┐ ┌─▼────────┐
         │ Groq  │  │ Neon   │ │Transloadit│
         │  API  │  │Postgres│ │  (Media)  │
         └───────┘  └────────┘ └───────────┘
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database
- [Clerk](https://clerk.com) account (for auth)
- [Groq](https://console.groq.com) API key
- [Transloadit](https://transloadit.com) account (for media processing)
- [Trigger.dev](https://trigger.dev) account (for background jobs)

### 1. Clone & Install

NextFlow is an npm-workspaces monorepo: `apps/web` (the Next.js app, deploys to Vercel) and `apps/worker` (Trigger.dev task definitions, deploys to Trigger.dev Cloud) each have their own dependencies and env vars, and share code through `packages/db` (Prisma) and `packages/shared` (types, cycle-detection graph logic). One install at the root sets up everything:

```bash
git clone https://github.com/IshanMaheshwari-777/NextFlow.git
cd NextFlow
npm install
```

### 2. Environment Variables

Each app has its own env file — copy the `.env.example` in each and fill it in:

```bash
cp apps/web/.env.example apps/web/.env
cp apps/worker/.env.example apps/worker/.env
```

`apps/web/.env` needs `DATABASE_URL`, the Clerk vars, and `TRIGGER_SECRET_KEY` (used to trigger/poll runs — not to execute them). `apps/worker/.env` needs `DATABASE_URL`, `GROQ_API_KEY`, `TRANSLOADIT_AUTH_KEY`/`TRANSLOADIT_AUTH_SECRET`, and both `TRIGGER_SECRET_KEY`/`TRIGGER_PROJECT_REF` — it's the one that actually executes tasks. Both point at the same database.

### 3. Database Setup

Prisma lives in `packages/db`; `npm install` at the root already ran `prisma generate` via its `postinstall`. Push the schema:

```bash
npm run build --workspace=packages/db
npx prisma db push --schema packages/db/prisma/schema.prisma
```

### 4. Run Development Server

Both the Next.js app and the Trigger.dev worker need to be running at the same time — workflow runs won't execute otherwise. One command starts both:

```bash
npm run dev:all
```

Open [http://localhost:3000](http://localhost:3000). Or run them separately in two terminals with `npm run dev` and `npm run dev:trigger`.

---

## Deploying

### Vercel (frontend + API)

1. Go to **Vercel → New Project → Import your GitHub repo**
2. Set **Root Directory** to `apps/web`
3. Since `apps/web` imports from `packages/db`/`packages/shared` outside its own directory, explicitly verify Vercel's "include files outside Root Directory" setting is on rather than assuming auto-detection catches it
4. Framework Preset will auto-detect **Next.js**
5. Add `apps/web/.env`'s variables to the Vercel dashboard
6. Deploy

### Trigger.dev Cloud (background tasks)

Deployed separately from `apps/worker`, and needs its **own** copy of env vars set in the [Trigger.dev dashboard](https://cloud.trigger.dev) (Project Settings → Environment Variables) — Vercel's env vars aren't visible to it:

```bash
cd apps/worker
npx trigger.dev deploy
```

Redeploy the worker any time task code under `apps/worker/src/trigger/` changes — pushing to GitHub alone only redeploys the Vercel side.

---

## Project Structure

```
NextFlow/
├── apps/
│   ├── web/                        # Next.js app — deploys to Vercel
│   │   └── src/
│   │       ├── app/                # App Router: pages + API routes (workflow CRUD, run)
│   │       ├── components/
│   │       │   ├── canvas/         # WorkflowEditor, WorkflowCanvas
│   │       │   ├── layout/         # TopBar, LeftSidebar, RunHistoryPanel
│   │       │   └── nodes/          # BaseNode, TextNode, LLMNode, etc.
│   │       ├── store/              # Zustand workflow store (undo/redo, etc.)
│   │       ├── lib/                # Web-only: nodeRegistry, rateLimit, sampleWorkflow, etc.
│   │       └── middleware.ts       # Clerk auth
│   └── worker/                     # Trigger.dev tasks — deploys to Trigger.dev Cloud
│       ├── src/
│       │   ├── trigger/
│       │   │   ├── llmTask.ts          # Groq LLM execution
│       │   │   ├── uploadTasks.ts      # Image/Video upload to Transloadit
│       │   │   ├── cropImageTask.ts    # Image cropping
│       │   │   ├── extractFrameTask.ts # Video frame extraction
│       │   │   └── runWorkflowTask.ts  # Orchestrates a full workflow run
│       │   └── lib/env.ts          # Worker-only env validation
│       └── trigger.config.ts
├── packages/
│   ├── db/                         # Prisma schema + client, shared by both apps
│   └── shared/                     # Types, cycle-detection graph logic, shared by both apps
├── .github/workflows/ci.yml
└── package.json                    # npm workspaces root
```

---

## Available Node Types

| Node | Description | Input | Output |
|------|------------|-------|--------|
| **Text** | Static text input | — | `text` |
| **Upload Image** | Upload image file | — | `imageUrl` |
| **Upload Video** | Upload video file | — | `videoUrl` |
| **Run LLM** | Execute AI prompt | `text`, `image` | `text` |
| **Generate Image**| AI Image Generation | `prompt`, `style`, `ratio` | `imageUrl` |
| **Enhance Prompt** | Optimize prompts | `prompt` | `text` |
| **Crop Image** | Crop image by % | `imageUrl` | `imageUrl` |
| **Extract Frame** | Extract video frame | `videoUrl` | `imageUrl` |

---



<div align="center">
  <p><strong>Built by <a href="https://github.com/IshanMaheshwari-777">Ishan Maheshwari</a></strong></p>
</div>
