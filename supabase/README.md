# Supabase Database Setup

This directory contains the database schema and migrations for the ALIC Inventory Management System.

## Structure

```
supabase/
├── migrations/
│   ├── 001_initial_schema.sql           # Core tables, indexes, triggers
│   ├── 002_rls_policies.sql             # Row Level Security policies
│   ├── 003_disposal_workflow.sql        # Disposal workflow enhancements
│   ├── 004_make_ministry_nullable.sql   # Make ministry nullable
│   ├── 005_disposal_constraints.sql     # Disposal constraints
│   ├── 006_add_updated_by.sql           # Add updated_by tracking
│   ├── 007_admin_module_schema.sql      # Admin module tables & functions
│   ├── 008_admin_rls_policies.sql       # Admin module RLS policies
│   ├── 009_seed_admin_roles.sql         # Seed admin roles
│   └── 010_backfill_existing_data.sql   # Backfill script (template)
└── seed.sql                              # Seed data (optional, for development)
```

## Schema Overview

### Simplified Design
The asset table uses a **single ministry field** (`ministry_assigned`) instead of dual ownership. This simplifies the data model while maintaining clear asset assignments.

### Multi-Tenant Security
- Branch scoping: Users only access data from their `church_branch_id`
- Row Level Security (RLS) enforces access control at the database level

### Role-Based Access Control (RBAC)
- **finance**: Full CRUD on assets, approve transfers/disposals
- **ministry_leader**: Create verification/transfer/disposal requests
- **system_admin**: Full access across all branches

## Applying Migrations

### Option 1: Supabase Dashboard (Recommended for Production)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste each migration file in order:
   - `001_initial_schema.sql`
   - `002_rls_policies.sql`
   - `003_disposal_workflow.sql`
   - `004_make_ministry_nullable.sql`
   - `005_disposal_constraints.sql`
   - `006_add_updated_by.sql`
   - **Admin Module (New):**
   - `007_admin_module_schema.sql`
   - `008_admin_rls_policies.sql`
   - `009_seed_admin_roles.sql`
   - `010_backfill_existing_data.sql` (customize first!)
4. Click **Run** for each migration

### Option 2: Supabase CLI (Recommended for Development)

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

### Option 3: Manual via psql

```bash
# Connect to your database
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run migrations
\i supabase/migrations/001_initial_schema.sql
\i supabase/migrations/002_rls_policies.sql
```

## Admin Module Setup

After applying migrations 007-009:

1. **Verify roles exist**:
```sql
SELECT * FROM public.roles ORDER BY name;
SELECT * FROM public.roles;
```

2. **Create your first church branch**:
```sql
INSERT INTO public.church_branch (name, location, contact_info)
VALUES ('Main Branch', 'City, Country', 'contact@church.org');
```

3. **Create ministries**:
```sql
INSERT INTO public.ministry (name, church_branch_id, contact_info)
VALUES 
  ('Worship', 'branch-uuid-here', 'worship@church.org'),
  ('Youth', 'branch-uuid-here', 'youth@church.org');
```

4. **Assign user roles** (after users sign up):
```sql
-- First, create a user profile
INSERT INTO public.user_profile (id, full_name, church_branch_id)
VALUES ('user-auth-uuid', 'John Doe', 'branch-uuid-here');

-- Then assign role
INSERT INTO public.user_roles (user_id, role_id, assigned_by)
VALUES (
  'user-auth-uuid',
  (SELECT id FROM public.roles WHERE name = 'finance'),
  'admin-user-uuid'
);
```

## Seed Data

For development and testing, you can run the seed data:

```bash
# Edit seed.sql with your test data
# Then run:
psql "your-connection-string" < supabase/seed.sql
```

## Verifying RLS Policies

Test that RLS is working correctly:

```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname IN ('public', 'inventory');

-- View policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname IN ('public', 'inventory');
```

## Helper Functions

The following functions are available for use in policies and queries:

- `public.get_user_branch_id()` - Get current user's branch
- `public.user_has_role(role_name)` - Check if user has role
- `public.is_system_admin()` - Check if user is admin
- `public.is_finance()` - Check if user has finance role
- `public.is_ministry_leader()` - Check if user is ministry leader

## Troubleshooting

### RLS Blocks All Access
If you're getting permission denied errors:
1. Verify user has a `user_profile` record
2. Check `user_roles` assignments
3. Test with a system_admin role first

### Migrations Fail
- Ensure you run migrations in order
- Check for existing tables (drop if needed in development)
- Verify Supabase project permissions

### Testing Without RLS
For debugging only, you can temporarily disable RLS:
```sql
ALTER TABLE inventory.asset DISABLE ROW LEVEL SECURITY;
-- Remember to re-enable after testing!
```

## Schema Updates

When making schema changes:
1. Create a new migration file: `003_your_change_name.sql`
2. Test locally first
3. Apply to production via Supabase dashboard
4. Document changes in this README

