# Smart IT Copilot

## Overview

Smart IT Copilot is an AI-powered IT support ticket management system with ServiceNow integration. It helps IT teams manage support tickets efficiently with intelligent categorization, priority prediction, and resolution suggestions. The application features a dashboard for ticket statistics, CRUD operations for support tickets, AI-powered analysis and troubleshooting chat, bidirectional ServiceNow incident synchronization, knowledge base management, user management with role-based access, ML-based triage with feedback loop, and comprehensive analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, bundled using Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state and caching
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom theme variables supporting light/dark mode
- **Structure**: Pages in `client/src/pages/`, reusable components in `client/src/components/`

### Backend Architecture
- **Runtime**: Node.js with Express.js (v5)
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful JSON API endpoints under `/api/` prefix
- **AI Integration**: OpenAI SDK configured via Replit AI Integrations environment variables
- **Development**: Vite dev server with HMR proxied through Express

### Data Storage
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains all table definitions and Zod validation schemas
- **Current Storage**: In-memory storage implementation in `server/storage.ts` (implements IStorage interface)
- **Database Config**: Drizzle Kit configured in `drizzle.config.ts`, requires `DATABASE_URL` environment variable
- **Migrations**: Output to `./migrations` directory via `npm run db:push`

### Key Data Models
- **Users**: Basic user authentication with username, password, email, role (admin/agent/end_user)
- **Tickets**: Support tickets with subject, description, status, priority, category, AI suggestions, and ServiceNow sync fields
- **Conversations/Messages**: Chat storage for AI troubleshooting sessions with deflection tracking
- **KBDocuments/KBChunks**: Knowledge base articles with version control and tag support
- **MLTrainingExamples/MLModels**: ML training data and model versioning with accuracy metrics
- **AnalyticsEvents**: Event tracking for chat interactions, deflections, and ticket lifecycle

### Application Pages
- `/` - Dashboard with ticket statistics
- `/copilot` - Global AI chat for pre-ticket troubleshooting
- `/tickets` - Ticket list and management
- `/tickets/:id` - Ticket detail with AI assistant
- `/servicenow` - ServiceNow integration management
- `/analytics` - AI insights, deflection metrics, and ROI tracking
- `/knowledge-base` - Admin knowledge base management
- `/users` - User management (Admin only)
- `/settings` - User preferences
- `/help` - Help documentation

### External Integrations
- **ServiceNow**: Client in `server/servicenow-client.ts` supports both Basic and OAuth authentication for pulling incidents, creating incidents from tickets, and syncing status updates
- **OpenAI**: Used for AI-powered ticket categorization, priority prediction, resolution suggestions, and interactive troubleshooting chat

### Build System
- **Client Build**: Vite outputs to `dist/public`
- **Server Build**: esbuild bundles server to `dist/index.cjs` with selective dependency bundling
- **Scripts**: `npm run dev` for development, `npm run build` for production, `npm run db:push` for database migrations

## External Dependencies

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required for database operations)
- `AI_INTEGRATIONS_OPENAI_API_KEY`: OpenAI API key via Replit AI Integrations
- `AI_INTEGRATIONS_OPENAI_BASE_URL`: OpenAI base URL via Replit AI Integrations

### ServiceNow Configuration (Optional)
- `SN_INSTANCE_URL`: ServiceNow instance URL (e.g., https://dev12345.service-now.com)
- `SN_AUTH_TYPE`: Authentication type ("basic" or "oauth")
- For Basic Auth: `SN_USERNAME`, `SN_PASSWORD`
- For OAuth: `SN_CLIENT_ID`, `SN_CLIENT_SECRET`, `SN_TOKEN_URL`
- Optional: `SN_DEFAULT_ASSIGNMENT_GROUP_SYSID`, `SN_DEFAULT_CALLER_SYSID`

### Third-Party Services
- **PostgreSQL**: Primary database (provision via Replit Database tool)
- **ServiceNow Table API**: Integration for incident management
- **OpenAI API**: Powers AI features including GPT for chat and analysis, image generation via gpt-image-1

### Key NPM Packages
- `drizzle-orm` / `drizzle-zod`: Database ORM and schema validation
- `@tanstack/react-query`: Client-side data fetching and caching
- `openai`: Official OpenAI SDK
- `express`: Web server framework
- `zod`: Runtime type validation
- `wouter`: Lightweight React router