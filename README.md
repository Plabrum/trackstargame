# trackstargame

A music guessing game built with Next.js, Supabase, and Spotify.

## Development Setup

### Prerequisites

- Node.js 18+ and pnpm
- Spotify Developer account (for Spotify OAuth)
- Docker (for local Supabase)

### Option 1: Local Supabase (Recommended for Development)

1. Clone the repository and install dependencies:
```bash
pnpm install
```

2. Copy the environment file and configure for local development:
```bash
cp .env.local.example .env.local
```

The default values in `.env.local.example` are already configured for local Supabase. You only need to add your Spotify credentials.

3. Start Supabase locally:
```bash
pnpm supabase:start
```

This will start all Supabase services in Docker containers:
- PostgreSQL database on port 54322
- API server on port 54321
- Studio (web interface) on http://127.0.0.1:54323
- Inbucket (email testing) on port 54324

4. Start the development server:
```bash
pnpm dev
```

The app will be available at http://localhost:3000

### Option 2: Remote Supabase

1. Create a project at https://supabase.com

2. Copy `.env.local.example` to `.env.local` and update with your remote credentials:
```bash
cp .env.local.example .env.local
```

3. In `.env.local`, comment out the local settings and uncomment the remote settings:
```env
# NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

4. Start the development server:
```bash
pnpm dev
```

## Useful Commands

### Supabase Local Development

- `pnpm supabase:start` - Start local Supabase
- `pnpm supabase:stop` - Stop local Supabase
- `pnpm supabase:restart` - Restart local Supabase
- `pnpm supabase:status` - Check status and get connection details
- `pnpm supabase:reset` - Reset database (reapply all migrations)
- `pnpm db:generate-types` - Generate TypeScript types from local database

### Development

- `pnpm dev` - Start Next.js dev server
- `pnpm build` - Build for production
- `pnpm type-check` - Run TypeScript type checking
- `pnpm lint` - Run ESLint
- `pnpm test` - Run tests
- `pnpm test:ui` - Run tests with UI

## Project Structure

- `/app` - Next.js app router pages and API routes
- `/components` - React components
- `/lib` - Utility functions and shared code
- `/hooks` - React hooks
- `/supabase` - Supabase migrations and configuration

## Database Migrations

When using local Supabase, migrations in `/supabase/migrations` are automatically applied on startup.

To create a new migration:
```bash
npx supabase migration new migration_name
```

To reset the database and reapply all migrations:
```bash
pnpm supabase:reset
```

### Production Deployments

Migrations are automatically deployed to production when you push to `main`. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for:
- Setting up required GitHub secrets
- How automated deployments work
- Monitoring and troubleshooting
- Manual deployment as a backup