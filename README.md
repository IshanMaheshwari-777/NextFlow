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
- 🤖 **LLM Integration** — Run prompts through Groq (Llama, Mixtral models) with markdown-rendered responses
- 🖼️ **Image Processing** — Upload, crop, and transform images via Transloadit
- 🎬 **Video Processing** — Upload videos and extract frames at specific timestamps
- 📝 **Text Nodes** — Input text and pipe it between nodes
- ⚡ **Background Execution** — Workflows run on Trigger.dev with real-time status tracking
- 🎯 **Selective Execution** — Run full workflows, single nodes, or execute paths up to a specific node
- ⏪ **Undo/Redo History** — Robust history stack for all workflow canvas modifications
- 📊 **Run History** — Full execution history with per-node status, outputs, and timing
- 🚀 **Sample Workflows** — Includes pre-built templates like the "Product Launch Kit Generator"
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
| **LLM** | [Groq API](https://groq.com) (Llama 3.1, Mixtral) |
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

```bash
git clone https://github.com/IshanMaheshwari-777/NextFlow.git
cd NextFlow/nextflow
npm install
```

### 2. Environment Variables

Create a `.env` file inside the `nextflow/` directory:

```env
# Database (Neon Postgres)
DATABASE_URL="postgresql://..."

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/"

# Groq LLM
GROQ_API_KEY="gsk_..."

# Transloadit (Image/Video processing)
TRANSLOADIT_AUTH_KEY="..."
TRANSLOADIT_AUTH_SECRET="..."

# Trigger.dev (Background jobs)
TRIGGER_SECRET_KEY="tr_dev_..."
TRIGGER_PROJECT_REF="proj_..."
```

### 3. Database Setup

```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To run Trigger.dev tasks locally (in a separate terminal):

```bash
npx trigger.dev dev
```

---

## Deploying to Vercel

### Important: Set Root Directory

Since the Next.js app lives inside `nextflow/`, you **must** configure Vercel:

1. Go to **Vercel → New Project → Import your GitHub repo**
2. Set **Root Directory** to `nextflow`
3. Framework Preset will auto-detect **Next.js**
4. Add all environment variables from `.env` to the Vercel dashboard
5. Deploy

### Trigger.dev (Backend)

Trigger.dev is deployed separately on [Trigger.dev Cloud](https://cloud.trigger.dev). Deploy tasks with:

```bash
cd nextflow
npx trigger.dev deploy
```

---

## Project Structure

```
nextflow/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Sign-in / Sign-up pages
│   │   ├── api/                # API routes (workflow CRUD, run)
│   │   ├── dashboard/          # Workflow management dashboard
│   │   ├── workflow/[id]/      # Workflow editor page
│   │   ├── layout.tsx          # Root layout (Clerk + theme)
│   │   ├── page.tsx            # Landing page / Entry
│   │   └── globals.css         # Design system tokens
│   ├── components/
│   │   ├── canvas/             # WorkflowEditor, WorkflowCanvas
│   │   ├── layout/             # TopBar, LeftSidebar, RunHistoryPanel
│   │   └── nodes/              # BaseNode, TextNode, LLMNode, etc.
│   ├── store/                  # Zustand workflow store (undo/redo, etc.)
│   ├── trigger/                # Trigger.dev task definitions
│   │   ├── llmTask.ts          # Groq LLM execution
│   │   ├── uploadTasks.ts      # Image/Video upload to Transloadit
│   │   ├── cropImageTask.ts    # Image cropping
│   │   └── extractFrameTask.ts # Video frame extraction
│   ├── lib/                    # Prisma DB client, utils, sample workflows
│   └── types/                  # TypeScript types, node definitions
├── prisma/
│   └── schema.prisma           # Database schema
├── trigger.config.ts           # Trigger.dev config
├── next.config.js              # Next.js config
├── tailwind.config.js          # Tailwind config
└── package.json
```

---

## Available Node Types

| Node | Description | Input | Output |
|------|------------|-------|--------|
| **Text** | Static text input | — | `text` |
| **Upload Image** | Upload image file | — | `imageUrl` |
| **Upload Video** | Upload video file | — | `videoUrl` |
| **Run LLM** | Execute AI prompt | `text`, `image` | `text` |
| **Crop Image** | Crop image by % | `imageUrl` | `imageUrl` |
| **Extract Frame** | Extract video frame | `videoUrl` | `imageUrl` |

---

## License

MIT

---

<div align="center">
  <p><strong>Built by <a href="https://github.com/IshanMaheshwari-777">Ishan Maheshwari</a></strong></p>
</div>
