# Smart IT Copilot

## Overview
Smart IT Copilot is an AI-powered IT support ticket management system with ServiceNow integration. It helps IT teams manage support tickets efficiently with intelligent categorization, priority prediction, interactive troubleshooting chat, and comprehensive analytics.

## Features

### Core Features
- **Dashboard**: Overview of ticket statistics, recent tickets, and ServiceNow connection status
- **Ticket Management**: Create, view, and update support tickets with AI-powered suggestions
- **AI Analysis**: Automatic category prediction, priority assessment, and resolution suggestions
- **AI Troubleshooting Chat**: Interactive chat assistant with file/photo upload for troubleshooting
- **ServiceNow Integration**: Bidirectional sync with incidents, users, and groups

### New Features
- **Global Copilot Chat**: Get AI help before creating a ticket (accessible from sidebar)
- **Knowledge Base**: Admin-managed internal documentation for AI-powered responses
- **ML Triage**: Machine learning-based categorization with feedback loop
- **Analytics Dashboard**: Track deflected tickets, cost savings, and ROI
- **User Management**: Role-based access control (Admin, Agent, End User)
- **File Attachments**: Upload screenshots and logs in chat for better troubleshooting

## Technology Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js (Node.js)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter

## Project Structure
```
client/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── app-sidebar.tsx # Main navigation sidebar
│   │   ├── theme-provider.tsx
│   │   └── theme-toggle.tsx
│   ├── pages/              # Page components
│   │   ├── dashboard.tsx   # Main dashboard
│   │   ├── tickets.tsx     # Ticket list
│   │   ├── ticket-detail.tsx
│   │   ├── ticket-new.tsx  # Create new ticket
│   │   └── servicenow.tsx  # ServiceNow integration page
│   ├── lib/                # Utilities
│   └── App.tsx             # Main app with routing

server/
├── index.ts                # Server entry point
├── routes.ts               # API routes
├── storage.ts              # In-memory data storage
└── servicenow-client.ts    # ServiceNow API client

shared/
└── schema.ts               # Shared TypeScript types and Zod schemas
```

## ServiceNow Setup

### Environment Variables
To enable ServiceNow integration, set the following environment variables in Replit Secrets:

**Required:**
- `SN_INSTANCE_URL` - Your ServiceNow instance URL (e.g., `https://dev12345.service-now.com`)
- `SN_AUTH_TYPE` - Authentication type: `basic` or `oauth`

**For Basic Authentication:**
- `SN_USERNAME` - ServiceNow username
- `SN_PASSWORD` - ServiceNow password

**For OAuth Authentication:**
- `SN_CLIENT_ID` - OAuth client ID
- `SN_CLIENT_SECRET` - OAuth client secret
- `SN_TOKEN_URL` - (Optional) Custom token URL

**Optional:**
- `SN_DEFAULT_ASSIGNMENT_GROUP_SYSID` - Default assignment group for new incidents
- `SN_DEFAULT_CALLER_SYSID` - Default caller for new incidents

### Testing Steps
1. Check health endpoint: `GET /api/sn/health` - Verify configuration and connectivity
2. Fetch incidents: Navigate to ServiceNow page and click "Refresh"
3. Create incident: Open a ticket and click "Create ServiceNow Incident"

### Data Mapping
| Local Ticket | ServiceNow Incident |
|--------------|---------------------|
| subject | short_description |
| description | description |
| priority (low/medium/high/urgent) | priority (4/3/2/1) |
| category | category |
| requester_email | caller_id |

## API Endpoints

### Tickets
- `GET /api/tickets` - List all tickets
- `GET /api/tickets/:id` - Get single ticket
- `POST /api/tickets` - Create new ticket
- `PATCH /api/tickets/:id` - Update ticket
- `DELETE /api/tickets/:id` - Delete ticket
- `POST /api/tickets/:id/chat` - AI troubleshooting chat (SSE streaming response)

### ServiceNow
- `GET /api/sn/health` - Check ServiceNow connection status
- `GET /api/sn/incidents` - List ServiceNow incidents
- `GET /api/sn/incidents/:sysId` - Get single incident
- `POST /api/sn/incidents/create-from-ticket/:ticketId` - Create incident from ticket
- `PATCH /api/sn/incidents/:sysId/sync-ticket/:ticketId` - Sync ticket to incident
- `POST /api/sn/sync/pull` - Import incidents as local tickets

## Running the Application
The application runs on port 5000. The workflow `npm run dev` starts both frontend and backend.

## Recent Changes
- Added Global Copilot Chat page for pre-ticket troubleshooting
- Added Knowledge Base management for admins
- Added User Management with role-based access (Admin/Agent/End User)
- Added Analytics Dashboard with ROI tracking
- Added ML prediction endpoints with feedback loop
- Added file/photo attachment capability in AI chat
- Added ServiceNow user and group sync
- Added AI Troubleshooting Chat feature on ticket detail page with SSE streaming
- Initial implementation of Smart IT Copilot with ServiceNow integration

## Quick Start

1. Copy `.env.example` to your environment secrets
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start the development server
4. Open http://localhost:5000 in your browser

## Additional API Endpoints

### Copilot Chat
- `POST /api/copilot/chat` - Global AI chat (SSE streaming)

### Conversations
- `GET /api/conversations` - List all conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id` - Get conversation with messages

### Knowledge Base
- `GET /api/kb/documents` - List KB articles
- `POST /api/kb/documents` - Create article
- `PATCH /api/kb/documents/:id` - Update article
- `DELETE /api/kb/documents/:id` - Delete article

### ML
- `POST /api/ml/predict` - Get category/priority prediction
- `POST /api/ml/feedback` - Submit prediction feedback
- `GET /api/ml/status` - Get ML model status
- `POST /api/ml/retrain` - Retrain ML model

### Analytics
- `GET /api/analytics/summary` - Get analytics summary
- `GET /api/analytics/export` - Export as CSV

### Users
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Limitations & Next Steps

1. **Authentication**: Uses simple in-memory auth. Consider JWT for production.
2. **Database**: Uses in-memory storage. Enable PostgreSQL for persistence.
3. **ML Training**: Rule-based classifier. Integrate Python/scikit-learn for real ML.
4. **RAG**: Keyword-based KB search. Add vector embeddings for semantic search.
5. **Rate Limiting**: Add rate limiting for production.
