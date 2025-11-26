# Authentication Setup Guide

This document explains how authentication works in the ALIC Inventory Management System and how to set it up for development and production.

## Architecture Overview

The application supports **two authentication modes**:

### 1. Development Mode (Local Supabase Auth)
- Uses Supabase's built-in email/password authentication
- Login page hosted at `/auth` within this application
- Suitable for local development and testing
- No external dependencies

### 2. Production Mode (External ALIC-Calendar Auth)
- Redirects to external ALIC-Calendar application for authentication
- ALIC-Calendar handles login and redirects back with auth tokens
- Suitable for production deployment
- Requires ALIC-Calendar to be running

## Configuration

The authentication mode is determined by the `NEXT_PUBLIC_AUTH_URL` environment variable:

```env
# Leave empty or unset = Development Mode (local Supabase Auth)
# NEXT_PUBLIC_AUTH_URL=

# Set to external URL = Production Mode (ALIC-Calendar)
# NEXT_PUBLIC_AUTH_URL=http://localhost:3001/auth
```

## Development Setup (Recommended for Local Testing)

### Step 1: Set Up Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to finish setting up
3. Go to **Settings** → **API**
4. Copy your:
   - Project URL (e.g., `https://xyz.supabase.co`)
   - Anon/Public Key

### Step 2: Configure Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Leave commented for development mode:
# NEXT_PUBLIC_AUTH_URL=
```

### Step 3: Apply Database Migrations

Follow the instructions in `supabase/README.md` to apply the database schema.

### Step 4: Configure Email Settings (Optional)

For email confirmation to work:

**Option A: Use Supabase Email Service**
1. Go to **Authentication** → **Email Templates** in Supabase
2. Customize templates as needed
3. Supabase will send confirmation emails automatically

**Option B: Disable Email Confirmation (Easier for Dev)**
1. Go to **Authentication** → **Providers** → **Email**
2. Disable "Confirm email"
3. Users can sign in immediately without confirmation

### Step 5: Create Test User

1. Start the dev server: `npm run dev`
2. Visit http://localhost:3000
3. You'll be redirected to http://localhost:3000/auth
4. Click "Don't have an account? Sign up"
5. Enter email and password (min 6 chars)
6. If email confirmation is enabled, check your email
7. Sign in and start testing!

### Step 6: Create User Profile (Required for Full Access)

After creating a user in Supabase Auth, you need to create a user profile:

```sql
-- Replace these UUIDs with your actual values
INSERT INTO public.user_profile (id, full_name, church_branch_id)
VALUES (
  'your-auth-user-id',  -- Get from auth.users table
  'Test User',
  'your-branch-id'      -- Get from church_branch table
);

-- Assign a role
INSERT INTO public.user_roles (user_id, role_id)
VALUES (
  'your-auth-user-id',
  (SELECT id FROM public.roles WHERE name = 'finance')
);
```

## Production Setup (External Auth via ALIC-Calendar)

### Step 1: Configure External Auth URL

Set the environment variable to point to ALIC-Calendar:

```env
NEXT_PUBLIC_AUTH_URL=https://your-calendar-app.com/auth
```

### Step 2: Configure ALIC-Calendar

Ensure ALIC-Calendar:
1. Uses the same Supabase project
2. Redirects back to this app after successful login
3. Passes Supabase auth tokens correctly

### Step 3: Test the Flow

1. Visit your inventory app
2. Should redirect to ALIC-Calendar auth page
3. Log in via ALIC-Calendar
4. Should redirect back to `/inventory` with valid session

## Protected Routes

The following routes require authentication:

- `/inventory` - Main dashboard
- `/inventory/assets` - Asset management
- `/inventory/verification` - Verification tracking
- `/inventory/transfers` - Transfer requests
- `/inventory/disposals` - Disposal management
- `/inventory/reports` - Reports
- `/inventory/settings` - Settings

**Middleware behavior:**
- Unauthenticated users → redirected to `/auth`
- Authenticated users accessing `/auth` → redirected to `/inventory`
- Session automatically refreshed on each request

## API Routes

### Sign Out

```
POST /api/auth/signout
```

Clears the user's session and redirects to `/auth`.

### OAuth Callback

```
GET /api/auth/callback?code=xxx
```

Handles OAuth and email confirmation callbacks from Supabase.

## Troubleshooting

### "User not found" after signup

**Problem**: New users can sign up but get errors when accessing the app.

**Solution**: Create a user profile record:
```sql
INSERT INTO public.user_profile (id, full_name, church_branch_id)
VALUES ('user-auth-id', 'Name', 'branch-id');
```

### Email confirmation not working

**Problem**: Users don't receive confirmation emails.

**Solutions**:
1. Check Supabase email settings
2. Verify email templates are configured
3. Temporarily disable email confirmation for development

### Redirect loop

**Problem**: App keeps redirecting between `/auth` and `/inventory`.

**Solutions**:
1. Clear browser cookies
2. Check `.env.local` configuration
3. Verify Supabase credentials are correct
4. Check middleware is working correctly

### "Invalid session" errors

**Problem**: Users get logged out frequently.

**Solutions**:
1. Check Supabase session timeout settings
2. Verify middleware is refreshing sessions
3. Check for clock skew on your system

## Security Considerations

### Development Mode
- ✅ Uses Supabase's secure authentication
- ✅ HTTPS enforced by Supabase
- ✅ JWT tokens for session management
- ⚠️ Email/password only - no OAuth providers configured

### Production Mode
- ✅ Delegates to ALIC-Calendar for authentication
- ✅ Centralized authentication across multiple apps
- ✅ Same security guarantees as development
- ✅ Supports additional OAuth providers via ALIC-Calendar

## Next Steps

After authentication is working:

1. **Create seed data** - Add sample branches, ministries, and roles
2. **Test RLS policies** - Verify users can only access their branch data
3. **Implement API routes** - Build the backend endpoints
4. **Build UI components** - Create forms and tables for asset management

## Support

For authentication issues:
- Check Supabase logs in the dashboard
- Review middleware logs in the terminal
- Verify environment variables are set correctly
- Test with Supabase SQL Editor to check user records

