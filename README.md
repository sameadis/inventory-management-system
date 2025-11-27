# ALIC Inventory Management System

A comprehensive fixed asset inventory management system for church branches, built with Next.js 15, React 18, and Supabase.

## Features

- 🏢 **Multi-tenant Architecture**: Branch-scoped access with secure data isolation
- 🔐 **Role-Based Access Control**: Finance, Ministry Leader, and System Admin roles
- 📦 **Asset Management**: Track fixed assets with detailed information
- ✅ **Verification Tracking**: Monitor asset verification history
- 🔄 **Transfer Management**: Handle asset transfers between ministries
- 🗑️ **Disposal Workflow**: Manage asset disposal requests and approvals
- 📊 **Reports & Analytics**: Generate inventory reports (coming soon)
- 🎨 **Modern UI**: Beautiful, responsive interface with Tailwind CSS and shadcn/ui

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (via external ALIC-Calendar app)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **State Management**: TanStack Query
- **Forms**: React Hook Form + Zod validation

## Prerequisites

- Node.js 24.x (specified in `.nvmrc`)
- npm 11.x or later
- Supabase account and project

## Getting Started

### 1. Install Dependencies

```bash
# Use the correct Node version
nvm use

# Install dependencies
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file and fill in your Supabase credentials:

```bash
cp env.example .env.local
```

Edit `.env.local` and add your values:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# External Auth App URL (Optional)
# Leave empty for local development to use Supabase Auth
# Set in production to use external ALIC-Calendar auth
# NEXT_PUBLIC_AUTH_URL=http://localhost:3001/auth
```

**For local development**: Just set the Supabase credentials and leave `NEXT_PUBLIC_AUTH_URL` commented out. This will enable the built-in login page.

**For production**: Set `NEXT_PUBLIC_AUTH_URL` to redirect to your external auth application.

### 3. Set Up Database

The database schema is in `supabase/migrations/`. Apply these migrations to your Supabase project:

#### Option A: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste each migration file in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
4. Click **Run** for each migration

#### Option B: Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

See `supabase/README.md` for detailed database setup instructions.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Create Your First User (Development)

In development mode with local Supabase Auth:

1. Navigate to http://localhost:3000
2. You'll be redirected to http://localhost:3000/auth
3. Click "Don't have an account? Sign up"
4. Enter your email and password (min 6 characters)
5. Check your email for the confirmation link
6. Click the confirmation link to activate your account
7. Sign in with your credentials

**Note**: For email confirmation to work, you need to:

- Configure your Supabase email settings, OR
- Disable email confirmation in Supabase dashboard (Settings → Authentication → Email Auth → Disable "Confirm email")

After signing in, you can access the inventory dashboard at `/inventory`.

## Project Structure

```
alic/inventory-management-system/
├── app/                          # Next.js App Router
│   ├── (inventory)/             # Protected inventory routes
│   │   ├── layout.tsx           # Inventory layout with header
│   │   └── inventory/           # Main inventory pages
│   │       ├── page.tsx         # Dashboard
│   │       ├── assets/          # Asset management
│   │       ├── verification/    # Verification tracking
│   │       ├── transfers/       # Transfer requests
│   │       ├── disposals/       # Disposal management
│   │       ├── reports/         # Reports & analytics
│   │       └── settings/        # Branch/ministry settings
│   ├── auth/                    # Auth redirect page
│   ├── api/                     # API routes (coming soon)
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home (redirects to /inventory)
│   └── globals.css              # Global styles
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   └── features/                # Feature-specific components
├── lib/                         # Utilities and helpers
│   ├── supabase/                # Supabase clients
│   │   ├── client.ts            # Browser client
│   │   ├── server.ts            # Server client
│   │   └── middleware.ts        # Auth middleware logic
│   ├── validations/             # Zod schemas (coming soon)
│   └── utils.ts                 # Utility functions
├── types/                       # TypeScript types
│   └── database.ts              # Supabase database types
├── hooks/                       # React hooks (coming soon)
├── supabase/                    # Database migrations
│   ├── migrations/              # SQL migration files
│   │   ├── 001_initial_schema.sql
│   │   └── 002_rls_policies.sql
│   ├── seed.sql                 # Seed data template
│   └── README.md                # Database setup guide
├── middleware.ts                # Next.js middleware (auth)
└── [config files]               # Various config files
```

## Authentication Flow

This application supports **dual authentication modes**:

### Development Mode (Local Supabase Auth)

For local development, the app uses Supabase's built-in authentication:

1. Unauthenticated users trying to access `/inventory` are redirected to `/auth`
2. `/auth` displays a login/signup form
3. Users can sign in with email/password or create new accounts
4. After authentication, users are redirected to `/inventory`
5. Email confirmation is required for new signups

**To enable dev mode**: Leave `NEXT_PUBLIC_AUTH_URL` empty or unset in `.env.local`

### Production Mode (External Auth via ALIC-Calendar)

In production, authentication is handled by an external application:

1. Unauthenticated users are redirected to `/auth`
2. `/auth` redirects to the external ALIC-Calendar app
3. ALIC-Calendar handles login and redirects back with Supabase auth tokens
4. Middleware validates the session and grants access

**To enable production mode**: Set `NEXT_PUBLIC_AUTH_URL` in your environment variables

### Protected Routes

The following routes require authentication:

- `/inventory/*` - All inventory management pages

Middleware automatically:

- Redirects unauthenticated users to `/auth`
- Refreshes expired sessions
- Redirects authenticated users away from `/auth` to `/inventory`

## Database Schema

### Simplified Design

The asset table uses a **single ministry field** (`ministry_assigned`) representing the ministry currently using/possessing the asset. This simplifies the data model while maintaining clear ownership.

### Key Tables

- **public.church_branch**: Church branch information
- **public.ministry**: Ministries within branches
- **public.roles**: System roles (finance, ministry_leader, system_admin)
- **public.user_roles**: User role assignments
- **public.user_profile**: User profiles with branch membership
- **inventory.asset**: Fixed assets
- **inventory.verification_history**: Asset verification records
- **inventory.transfer_history**: Asset transfers between ministries
- **inventory.disposal_history**: Asset disposal records

### Security Model

**Row Level Security (RLS)** enforces:

- Branch scoping: Users only access data from their branch
- Role-based permissions:
  - **Finance**: Full CRUD on assets, approve requests
  - **Ministry Leader**: Create verification/transfer/disposal requests
  - **System Admin**: Full access across all branches

## Development

### Code Style

```bash
# Check formatting
npm run format

# Fix formatting
npm run format:fix

# Run linter
npm run lint
```

### Building for Production

```bash
npm run build
npm run start
```

## API Routes

API routes will be available under `/api/inventory/`:

- `GET /api/inventory/asset` - List assets
- `POST /api/inventory/asset` - Create asset
- `GET /api/inventory/asset/[id]` - Get asset details
- `PATCH /api/inventory/asset/[id]` - Update asset
- `GET /api/inventory/verification_history` - List verifications
- `POST /api/inventory/verification_history` - Create verification
- And more...

See the OpenAPI specification in the project requirements for full API contract.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Manual Deployment

1. Build the application: `npm run build`
2. Set environment variables on your hosting platform
3. Start the server: `npm run start`

## Troubleshooting

### "Permission denied" errors

- Verify your Supabase RLS policies are applied
- Check that user has a `user_profile` record
- Verify user role assignments in `user_roles` table

### Authentication redirect loop

- Ensure `NEXT_PUBLIC_AUTH_URL` points to your auth app
- Verify Supabase credentials are correct
- Check middleware configuration

### Database connection issues

- Verify Supabase URL and keys in `.env.local`
- Check that migrations have been applied
- Ensure Supabase project is active

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

[Specify your license here]

## Support

For issues and questions:

- Create an issue in the repository
- Contact the development team

---

Built with ❤️ for church asset management
