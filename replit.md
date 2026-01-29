# Smart IT Copilot

## Overview
Smart IT Copilot is an AI-powered IT support ticket management system with ServiceNow integration. It helps IT teams manage support tickets efficiently with intelligent categorization, priority prediction, and seamless ServiceNow synchronization.

## Features
- **Dashboard**: Overview of ticket statistics, recent tickets, and ServiceNow connection status
- **Ticket Management**: Create, view, and update support tickets with AI-powered suggestions
- **AI Analysis**: Automatic category prediction, priority assessment, and resolution suggestions
- **ServiceNow Integration**: Pull incidents from ServiceNow, create incidents from local tickets, and sync status updates

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
- Initial implementation of Smart IT Copilot with ServiceNow integration
- Dashboard with ticket statistics and AI insights
- Ticket CRUD operations with AI-powered suggestions
- ServiceNow page with incident listing and import functionality
