# Smart IT Copilot (Extender Copilot)

## Overview

Smart IT Copilot is an AI-powered IT support ticket management system with ServiceNow integration. It helps IT teams manage support tickets efficiently through intelligent categorization, priority prediction, and AI-driven troubleshooting. The application provides a global AI Copilot chat for pre-ticket troubleshooting, a knowledge base for admin-managed documentation, ML-based triage, analytics dashboards, and role-based user management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled with Vite
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack Query (React Query) for server state; local React state for UI state
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support via custom ThemeProvider)
- **Component Library**: shadcn/ui (New York style) built on Radix UI primitives. Components live in `client/src/components/ui/`. Configuration in `components.json`
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`, `@assets/` maps to `attached_assets/`

**Key pages** (in `client/src/pages/`):
- `dashboard.tsx` — Overview with ticket stats and ServiceNow status
- `tickets.tsx`, `ticket-detail.tsx`, `ticket-new.tsx` — Full ticket CRUD
- `copilot.tsx` — Global AI chat with conversation history, file attachments, and deflection prompts
- `servicenow.tsx` — ServiceNow integration management (incidents, users, groups sync)
- `analytics.tsx` — Deflection tracking, cost savings, ROI metrics
- `knowledge-base.tsx` — Admin CRUD for KB documents
- `users.tsx` — Role-based user management (admin/agent/end_user)
- `settings.tsx`, `help.tsx` — Configuration and documentation

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript, executed via `tsx` in development
- **Entry Point**: `server/index.ts` creates HTTP server, registers routes, serves static files in production or sets up Vite dev middleware in development
- **API Routes**: `server/routes.ts` — RESTful API endpoints for tickets, conversations, users, KB documents, analytics, ML triage, and ServiceNow proxy
- **Build**: Custom build script (`script/build.ts`) uses Vite for client and esbuild for server, outputting to `dist/`

### AI Integration
- **Provider**: OpenAI API (via Replit AI Integrations)
- **Environment Variables**: `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`
- **Two-Phase Chat Flow**: 
  - Phase 1 (COLLECT_INFO): AI asks max 2 clarifying questions, then stops. No steps.
  - Phase 2 (DIAGNOSE): AI provides max 1-3 troubleshooting steps, then asks "Did that work?"
  - Phase tracked per Conversation (phase + collectedInfo fields)
  - Structured JSON output enforced via `response_format: { type: "json_object" }` with server-side validation
  - AI helper: `server/ai-chat-helper.ts` — getTwoPhaseResponse(), hasEnoughInfo(), extractInfo()
  - Temperature: 0.2, max_completion_tokens: 220
- **Features**: Ticket categorization/priority prediction, resolution suggestions, multi-turn conversational troubleshooting, knowledge base-augmented responses
- **Audio/Voice**: Server-side speech-to-text and text-to-speech capabilities (`server/integrations/audio/`), client-side voice recording and streaming playback (`client/integrations/audio/`)
- **Image Generation**: Available via `server/integrations/image/` using gpt-image-1 model
- **Batch Processing**: `server/integrations/batch/` provides rate-limited concurrent processing with retries

### Integration Modules (server/integrations/)
- `chat/` — Conversation and message CRUD with database-backed storage via Drizzle
- `audio/` — Voice chat routes, audio format detection, ffmpeg conversion, SSE streaming
- `image/` — Image generation endpoints
- `batch/` — Generic batch processor with concurrency control and retry logic

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema**: Defined in `shared/schema.ts` using Drizzle's `pgTable` definitions with Zod validation schemas via `drizzle-zod`
- **Chat Models**: Additional schema in `shared/models/chat.ts` for conversations and messages tables
- **Migration**: Drizzle Kit with `drizzle-kit push` command; config in `drizzle.config.ts`
- **Storage Layer**: `server/storage.ts` defines an `IStorage` interface covering users, tickets, synced ServiceNow entities, conversations, messages, KB documents/chunks, ML training data, and analytics events. Currently uses in-memory implementation with UUID generation.
- **Required Environment Variable**: `DATABASE_URL` for PostgreSQL connection

**Core Tables**:
- `users` — username, password, email, role
- `tickets` — subject, description, status, priority, category, AI predictions, ServiceNow sync fields
- `conversations` / `messages` — Multi-turn chat history
- KB documents, ML training examples, analytics events (defined in schema types)

### ServiceNow Integration
- **Client**: `server/servicenow-client.ts` — Configurable client supporting both basic auth and OAuth
- **Environment Variables**: `SN_INSTANCE_URL`, `SN_AUTH_TYPE`, `SN_USERNAME`, `SN_PASSWORD` (basic) or `SN_CLIENT_ID`, `SN_CLIENT_SECRET`, `SN_TOKEN_URL` (OAuth), plus optional `SN_DEFAULT_ASSIGNMENT_GROUP_SYSID` and `SN_DEFAULT_CALLER_SYSID`
- **Features**: Bidirectional sync of incidents, users, and groups; graceful degradation when not configured
- **API**: ServiceNow Table API for CRUD operations on incidents

### Key Design Decisions

1. **Monorepo with shared types**: The `shared/` directory contains schema definitions and types used by both client and server, ensuring type safety across the stack.

2. **In-memory storage with database schema ready**: The storage interface is defined for all entities, with Drizzle schema ready for PostgreSQL. The `db:push` command will create tables from the schema.

3. **AI-first ticket workflow**: Tickets get AI analysis (category prediction, priority assessment, resolution suggestions) automatically on creation. The Copilot chat aims to deflect tickets by resolving issues before they become formal tickets.

4. **SSE streaming for AI responses**: Chat and voice responses use Server-Sent Events for real-time streaming from the AI provider to the client.

5. **Modular integration architecture**: AI capabilities (chat, audio, image, batch) are organized as independent integration modules that can be registered with the Express app independently.

## External Dependencies

### Required Services
- **PostgreSQL**: Primary database (connection via `DATABASE_URL` environment variable)
- **OpenAI API** (via Replit AI Integrations): Powers all AI features — `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`

### Optional Services
- **ServiceNow**: IT service management platform integration — configured via `SN_*` environment variables. App functions fully without it, showing "not configured" messages.
- **ffmpeg**: Required on the system for audio format conversion (voice chat features)

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit` / `drizzle-zod` — ORM, migrations, and schema validation
- `openai` — OpenAI API client
- `express` (v5) — HTTP server
- `@tanstack/react-query` — Server state management
- `wouter` — Client routing
- `zod` — Runtime validation
- `react-hook-form` / `@hookform/resolvers` — Form handling
- `recharts` — Chart components (analytics page)
- `react-day-picker` / `date-fns` — Date handling
- `multer` — File upload handling
- `nanoid` / `uuid` — ID generation
- `connect-pg-simple` / `express-session` — Session management
- `p-limit` / `p-retry` — Batch processing utilities