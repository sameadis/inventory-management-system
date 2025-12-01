# Admin Module Guide

## Overview

The Admin Module provides tools for designated admin/asset manager users to manage church branches, ministries, and user roles. All changes are branch-aware and support the existing branch-scoped security model.

## Roles and Permissions

### System Admin
- **Full access** across all branches and all administrative functions
- Can create, edit, and deactivate branches
- Can manage ministries in any branch
- Can manage users across all branches
- Can assign any role to any user, including `system_admin`

### Asset Manager (Branch Admin)
- **Branch-scoped access** - can only manage data within their assigned branch
- Can view all branches (for reference) but cannot edit them
- Can create and manage ministries within their branch only
- Can manage users within their branch only
- Can assign `asset_manager` and `ministry_leader` roles to users in their branch
- **Cannot** assign `system_admin` role
- **Cannot** move users to another branch

### Ministry Leader
- No admin module access (future: may view their ministry's users)

## Features

### 1. Branch Management (`/admin/branches`)

**Purpose**: Maintain accurate master data for church branches

**Actions**:
- **Create Branch** (System Admin only)
  - Name (required, unique)
  - Location (optional)
  - Contact Info (optional)
  - Status: Active by default

- **Edit Branch** (System Admin only)
  - Update name, location, contact info
  - Toggle active/inactive status

- **Deactivate Branch**
  - Soft delete - prevents new users or assets from being assigned
  - Existing data and history are preserved
  - Can be reactivated later

**Key Points**:
- Branch names must be unique
- Inactive branches cannot have new users, ministries, or assets assigned
- Deleting a branch is not recommended (use deactivation instead)

### 2. Ministry Management (`/admin/ministries`)

**Purpose**: Organize ministries within church branches

**Actions**:
- **Create Ministry**
  - Name (required)
  - Branch (required, must be active)
  - Contact Info (optional)
  - Names must be unique within a branch

- **Edit Ministry**
  - Update name and contact info
  - **Cannot change branch** after creation
  - Toggle active/inactive status

- **Filter by Branch**
  - View ministries for a specific branch or all branches

**Key Points**:
- Ministry names must be unique within their branch
- Inactive ministries cannot have new users or assets assigned
- System admins can manage ministries in any branch
- Asset managers can only manage ministries in their own branch

### 3. User & Role Management (`/admin/users`)

**Purpose**: Control which users belong to which branch and ministry, and assign application roles

**Actions**:
- **Edit User Profile**
  - Update full name
  - Change branch assignment (System Admin only)
  - Change ministry assignment (within same branch)
  - Asset managers cannot move users to another branch

- **Manage Roles**
  - View current roles
  - Add roles (from available roles list)
  - Remove roles
  - System admins can assign any role
  - Asset managers cannot assign `system_admin` role

- **Filter by Branch**
  - View users for a specific branch or all branches

**Key Points**:
- Users must be assigned to an active branch
- Users can optionally be assigned to an active ministry
- Ministry must belong to the user's branch
- Role assignments are tracked with `assigned_by` for audit purposes

## Database Schema

### Core Tables

#### `public.church_branch`
- `id` (uuid, primary key)
- `name` (text, unique, required)
- `location` (text, optional)
- `contact_info` (text, optional)
- `is_active` (boolean, default true)
- `created_at`, `updated_at` (timestamps)

#### `public.ministry`
- `id` (uuid, primary key)
- `name` (text, required)
- `church_branch_id` (uuid, foreign key, required)
- `contact_info` (text, optional)
- `is_active` (boolean, default true)
- `created_at`, `updated_at` (timestamps)
- Unique constraint: `(church_branch_id, name)`

#### `public.roles`
- `id` (uuid, primary key)
- `name` (text, unique, required)
  - Valid values: `asset_manager`, `ministry_leader`, `system_admin`
- `description` (text, optional)
- `created_at`, `updated_at` (timestamps)

#### `public.user_roles`
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `role_id` (uuid, foreign key to roles)
- `assigned_at` (timestamp)
- `assigned_by` (uuid, foreign key to auth.users)
- Unique constraint: `(user_id, role_id)`

#### `public.user_profile`
- `id` (uuid, primary key, foreign key to auth.users)
- `full_name` (text, optional)
- `church_branch_id` (uuid, foreign key, required)
- `ministry_id` (uuid, foreign key, optional)
- `created_at`, `updated_at` (timestamps)

### Security

#### Row Level Security (RLS)
All admin tables have RLS enabled with policies that enforce:
- System admins can access all data
- Asset managers can only access data in their branch
- Users can view their own profile

#### Active Status Validation
Database triggers prevent:
- Creating users in inactive branches
- Assigning users to inactive ministries
- Creating assets in inactive branches or ministries

## API Endpoints

### Church Branches
- `GET /api/admin/church-branches` - List all branches
- `POST /api/admin/church-branches` - Create branch (System Admin only)
- `PATCH /api/admin/church-branches/{id}` - Update branch (System Admin only)
- `DELETE /api/admin/church-branches/{id}` - Delete branch (not recommended)

### Ministries
- `GET /api/admin/ministries?church_branch_id={id}` - List ministries
- `POST /api/admin/ministries` - Create ministry
- `PATCH /api/admin/ministries/{id}` - Update ministry
- `DELETE /api/admin/ministries/{id}` - Delete ministry (not recommended)

### Users
- `GET /api/admin/users?church_branch_id={id}` - List users with profiles and roles
- `PATCH /api/admin/users/{id}/profile` - Update user profile

### Roles
- `GET /api/admin/roles` - List all roles
- `POST /api/admin/roles` - Create role (System Admin only, future feature)

### User Roles
- `POST /api/admin/user-roles` - Assign role to user
- `DELETE /api/admin/user-roles/{id}` - Remove role assignment

## Setup Instructions

### 1. Apply Database Migrations

Run the following migrations in order:

```bash
# In Supabase SQL Editor or via Supabase CLI
supabase/migrations/007_admin_module_schema.sql
supabase/migrations/008_admin_rls_policies.sql
supabase/migrations/009_seed_admin_roles.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Copy and paste each migration file
3. Click "Run" for each one

### 2. Seed Initial Data

Create at least one branch, one ministry, and assign roles to initial users:

```sql
-- Create a branch
INSERT INTO public.church_branch (name, location, contact_info)
VALUES ('ALIC VA', 'Virginia, USA', 'contact@alic.org');

-- Create a ministry (replace {branch_id} with the ID from above)
INSERT INTO public.ministry (name, church_branch_id)
VALUES ('Asset Management', '{branch_id}');

-- Assign system_admin role to a user (replace {user_id} and {role_id})
INSERT INTO public.user_roles (user_id, role_id)
SELECT '{user_id}', id FROM public.roles WHERE name = 'system_admin';

-- Create user profile (replace {user_id} and {branch_id})
INSERT INTO public.user_profile (id, full_name, church_branch_id)
VALUES ('{user_id}', 'Admin User', '{branch_id}');
```

### 3. Verify Access

1. Log in as a user with `system_admin` role
2. Navigate to `/admin/branches`
3. Verify you can create, edit, and view branches
4. Test ministry and user management

## Best Practices

### Branch Management
- Use descriptive, unique names (e.g., "ALIC VA", "ALIC MD")
- Include location information for clarity
- Deactivate rather than delete branches to preserve history

### Ministry Management
- Use consistent naming across branches (e.g., "Worship", "Youth", "Asset Management")
- Keep contact info up to date
- Deactivate ministries that are no longer active

### User Management
- Assign users to the correct branch from the start
- Only assign roles that users need (principle of least privilege)
- Use `asset_manager` role for branch-level admins
- Reserve `system_admin` for trusted central administrators

### Role Assignment
- Document why users have specific roles
- Review role assignments periodically
- Remove roles when users change positions

## Troubleshooting

### "Cannot assign to inactive branch"
- The target branch has `is_active = false`
- Reactivate the branch or choose a different one

### "Cannot assign to inactive ministry"
- The target ministry has `is_active = false`
- Reactivate the ministry or choose a different one

### "Cannot move users to another branch" (Asset manager)
- Asset managers can only manage users in their own branch
- Contact a system admin to move users between branches

### "Cannot assign system_admin role" (Asset manager)
- Only system admins can assign the `system_admin` role
- Contact a system admin for this operation

### "A branch with this name already exists"
- Branch names must be unique across the entire system
- Choose a different name or edit the existing branch

### "A ministry with this name already exists in this branch"
- Ministry names must be unique within each branch
- Choose a different name or edit the existing ministry

## Migration from Existing Data

If you have existing data in the system:

1. **Backfill branches**: Ensure all existing branches are in `church_branch` table
2. **Backfill ministries**: Ensure all existing ministries are in `ministry` table
3. **Update user profiles**: Ensure all users have a `user_profile` record
4. **Assign roles**: Assign appropriate roles to existing users
5. **Update assets**: Ensure all assets reference valid branches and ministries

Example backfill script:

```sql
-- Backfill user profiles for existing auth users
INSERT INTO public.user_profile (id, church_branch_id)
SELECT 
  au.id,
  (SELECT id FROM public.church_branch LIMIT 1) -- Replace with appropriate branch logic
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profile up WHERE up.id = au.id
);

-- Verify asset_manager role assignments
SELECT 
  up.full_name,
  au.email,
  r.name as role
FROM public.user_roles ur
JOIN auth.users au ON au.id = ur.user_id
JOIN public.user_profile up ON up.id = ur.user_id
JOIN public.roles r ON r.id = ur.role_id
WHERE r.name = 'asset_manager';
```

## Future Enhancements

- Audit log for all admin actions
- Bulk user import/export
- Ministry leader dashboard (view ministry members)
- Branch-level settings and configuration
- Custom role creation (beyond the three core roles)
- User invitation system
- Email notifications for role changes

