# BizMeasureUp - Delegation & Flow Management System (FMS)

A SaaS application built with React + Vite + Supabase for managing tasks, checklists, and team performance metrics with role-based access control.

## Features

- **Delegation Module**: Task creation, assignment, and management
- **Checklist & Task Completion Workflow**: Create checklists linked to tasks with progress tracking
- **Scoreboard & FMS**: Performance metrics dashboard and flow management views (Kanban, List, Calendar, Gantt)
- **Role-Based Access Control**: Admin, Owner, Doer, and Viewer roles with granular permissions
- **Authentication**: Secure authentication with Supabase Auth
- **Dark Mode**: Full dark theme support

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Framework**: Windmill React UI + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Routing**: React Router v6

## Prerequisites

- Node.js 18+ and npm
- A Supabase project (get one at [supabase.com](https://supabase.com))

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd bizmeasureup
npm install
```

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy your Project URL and anon/public key

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Setup Database Schema

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `supabase/schema.sql`
4. Run the SQL script to create all tables, policies, and functions

### 5. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
bizmeasureup/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Sidebar/         # Sidebar navigation
│   │   ├── Header.tsx       # Top navigation bar
│   │   └── Typography/      # Typography components
│   ├── pages/               # Route pages
│   │   ├── auth/            # Authentication pages
│   │   ├── delegation/      # Task management
│   │   ├── checklists/      # Checklist workflow
│   │   ├── scoreboard/      # Metrics dashboard
│   │   └── fms/             # Flow management views
│   ├── context/             # React contexts
│   │   ├── AuthContext.tsx  # Authentication state
│   │   ├── ThemeContext.tsx # Theme management
│   │   └── SidebarContext.tsx
│   ├── lib/                 # Utilities
│   │   ├── supabase.ts      # Supabase client
│   │   └── rbac.ts          # Role-based access control
│   ├── routes/              # Route configuration
│   │   ├── AppRoutes.tsx    # Main routing
│   │   ├── ProtectedRoute.tsx
│   │   └── sidebar.tsx      # Sidebar menu config
│   ├── types/               # TypeScript definitions
│   └── icons/               # SVG icons
├── supabase/
│   └── schema.sql           # Database schema
└── public/                  # Static assets
```

## Role Permissions

### Admin
- Full CRUD access on all resources
- Manage organization settings
- Manage team members

### Owner
- Create/edit tasks
- View all tasks and metrics
- Manage team members
- Assign tasks

### Doer
- View assigned tasks
- Update status of assigned tasks
- Complete checklist items

### Viewer
- Read-only access to tasks, checklists, and metrics

## Database Schema

The application uses the following main tables:

- `users` - User profiles (extends Supabase auth.users)
- `organizations` - Organization/workspace data
- `organization_members` - User-organization relationships
- `tasks` - Task management
- `checklists` - Checklist definitions
- `checklist_items` - Individual checklist items
- `scoreboard_metrics` - Performance metrics
- `flow_views` - Flow management view configurations

All tables have Row Level Security (RLS) enabled with policies based on user roles.

## Development

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## License

Private - All rights reserved

