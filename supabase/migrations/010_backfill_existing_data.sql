-- Backfill Script for Existing Data
-- Run this AFTER applying migrations 007, 008, and 009
-- This script helps migrate existing data to the new admin module schema

-- =====================================================
-- IMPORTANT: CUSTOMIZE THIS SCRIPT FOR YOUR DATA
-- =====================================================
-- This is a template. You'll need to:
-- 1. Replace placeholder values with your actual data
-- 2. Uncomment and modify sections as needed
-- 3. Test in a development environment first

-- =====================================================
-- STEP 1: BACKFILL USER PROFILES
-- =====================================================
-- Create user_profile records for any auth.users that don't have one
-- You'll need to assign them to an appropriate branch

-- Example: Assign all users without profiles to a default branch
-- UNCOMMENT AND MODIFY:
/*
DO $$
DECLARE
  default_branch_id uuid;
BEGIN
  -- Get or create a default branch
  SELECT id INTO default_branch_id 
  FROM public.church_branch 
  WHERE name = 'Default Branch' 
  LIMIT 1;
  
  -- If no default branch exists, create one
  IF default_branch_id IS NULL THEN
    INSERT INTO public.church_branch (name, location, is_active)
    VALUES ('Default Branch', 'To Be Assigned', true)
    RETURNING id INTO default_branch_id;
  END IF;
  
  -- Create user profiles for users without one
  INSERT INTO public.user_profile (id, church_branch_id, full_name)
  SELECT 
    au.id,
    default_branch_id,
    COALESCE(au.email, 'Unknown User')
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profile up WHERE up.id = au.id
  );
  
  RAISE NOTICE 'Backfilled % user profiles', 
    (SELECT COUNT(*) FROM public.user_profile WHERE church_branch_id = default_branch_id);
END $$;
*/

-- =====================================================
-- STEP 2: MIGRATE ROLE NAMES
-- =====================================================
-- If you have existing 'asset_manager' roles, they've been renamed to 'finance'
-- The seed script (009) handles this, but verify:

SELECT 
  r.name,
  COUNT(ur.id) as user_count
FROM public.roles r
LEFT JOIN public.user_roles ur ON ur.role_id = r.id
GROUP BY r.name
ORDER BY r.name;

-- Expected output: finance, ministry_leader, system_admin (no asset_manager)

-- =====================================================
-- STEP 3: ASSIGN INITIAL ADMIN ROLES
-- =====================================================
-- Assign system_admin role to your initial admin user(s)
-- UNCOMMENT AND MODIFY with your actual user email:
/*
DO $$
DECLARE
  admin_user_id uuid;
  system_admin_role_id uuid;
BEGIN
  -- Find user by email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@example.com'; -- REPLACE WITH YOUR ADMIN EMAIL
  
  -- Get system_admin role
  SELECT id INTO system_admin_role_id
  FROM public.roles
  WHERE name = 'system_admin';
  
  -- Assign role if user exists
  IF admin_user_id IS NOT NULL AND system_admin_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (admin_user_id, system_admin_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
    
    RAISE NOTICE 'Assigned system_admin role to user %', admin_user_id;
  ELSE
    RAISE WARNING 'User or role not found. Check email and role name.';
  END IF;
END $$;
*/

-- =====================================================
-- STEP 4: VERIFY BRANCH AND MINISTRY REFERENCES
-- =====================================================
-- Check for any assets referencing non-existent or inactive branches/ministries

-- Check assets with invalid branch references
SELECT 
  a.id,
  a.asset_tag_number,
  a.asset_description,
  a.church_branch_id,
  'Invalid or inactive branch' as issue
FROM inventory.asset a
LEFT JOIN public.church_branch cb ON cb.id = a.church_branch_id
WHERE cb.id IS NULL OR cb.is_active = false;

-- Check assets with invalid ministry references
SELECT 
  a.id,
  a.asset_tag_number,
  a.asset_description,
  a.ministry_assigned,
  'Invalid or inactive ministry' as issue
FROM inventory.asset a
LEFT JOIN public.ministry m ON m.id = a.ministry_assigned
WHERE m.id IS NULL OR m.is_active = false;

-- =====================================================
-- STEP 5: ACTIVATE ALL EXISTING BRANCHES AND MINISTRIES
-- =====================================================
-- Ensure all existing branches and ministries are active
-- (They should be by default, but this is a safety check)

UPDATE public.church_branch
SET is_active = true
WHERE is_active IS NULL OR is_active = false;

UPDATE public.ministry
SET is_active = true
WHERE is_active IS NULL OR is_active = false;

-- =====================================================
-- STEP 6: VERIFICATION QUERIES
-- =====================================================

-- Count users with profiles
SELECT 
  'Users with profiles' as metric,
  COUNT(*) as count
FROM public.user_profile;

-- Count users without profiles (should be 0)
SELECT 
  'Users without profiles' as metric,
  COUNT(*) as count
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profile up WHERE up.id = au.id
);

-- Count role assignments by role
SELECT 
  r.name as role,
  COUNT(ur.id) as user_count
FROM public.roles r
LEFT JOIN public.user_roles ur ON ur.role_id = r.id
GROUP BY r.name
ORDER BY r.name;

-- Count branches and ministries
SELECT 
  'Active branches' as metric,
  COUNT(*) as count
FROM public.church_branch
WHERE is_active = true
UNION ALL
SELECT 
  'Inactive branches' as metric,
  COUNT(*) as count
FROM public.church_branch
WHERE is_active = false
UNION ALL
SELECT 
  'Active ministries' as metric,
  COUNT(*) as count
FROM public.ministry
WHERE is_active = true
UNION ALL
SELECT 
  'Inactive ministries' as metric,
  COUNT(*) as count
FROM public.ministry
WHERE is_active = false;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON SCHEMA public IS 'Backfill script for migrating existing data to admin module schema. Customize before running.';

