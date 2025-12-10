-- =====================================================
-- ALIC Inventory Management System
-- Production Data Cleanup Script
-- =====================================================
--
-- PURPOSE: Remove all test/mock asset-related data before production deployment
--
-- WHAT WILL BE REMOVED:
--   - All assets from inventory.asset
--   - All verification records from inventory.verification_history
--   - All transfer records from inventory.transfer_history
--   - All disposal records from inventory.disposal_history
--   - All ministries from public.ministry
--
-- WHAT WILL BE PRESERVED:
--   - System roles (asset_manager, ministry_leader, system_admin)
--   - User accounts and profiles (ministry_id will be set to NULL)
--   - Church branches
--   - User role assignments
--
-- =====================================================
-- ⚠️  IMPORTANT: BACKUP YOUR DATABASE BEFORE RUNNING
-- =====================================================
-- 
-- Run in Supabase Dashboard SQL Editor, or via CLI:
--   supabase db execute -f supabase/cleanup_prod.sql
--
-- =====================================================

-- =====================================================
-- STEP 1: PRE-CLEANUP VERIFICATION (DRY RUN)
-- =====================================================
-- Review these counts BEFORE running the cleanup
-- Copy this section and run it separately first

SELECT '=== PRE-CLEANUP DATA COUNTS ===' as info;

SELECT 'Assets to be deleted' as table_name, COUNT(*) as count 
FROM inventory.asset
UNION ALL
SELECT 'Verification records to be deleted', COUNT(*) 
FROM inventory.verification_history
UNION ALL
SELECT 'Transfer records to be deleted', COUNT(*) 
FROM inventory.transfer_history
UNION ALL
SELECT 'Disposal records to be deleted', COUNT(*) 
FROM inventory.disposal_history
UNION ALL
SELECT 'Ministries to be deleted', COUNT(*) 
FROM public.ministry;

SELECT '=== DATA TO BE PRESERVED ===' as info;

SELECT 'System roles (preserved)' as table_name, COUNT(*) as count 
FROM public.roles
UNION ALL
SELECT 'User profiles (preserved)', COUNT(*) 
FROM public.user_profile
UNION ALL
SELECT 'User role assignments (preserved)', COUNT(*) 
FROM public.user_roles
UNION ALL
SELECT 'Church branches (preserved)', COUNT(*) 
FROM public.church_branch;

-- Show user profiles that will have ministry_id set to NULL
SELECT '=== USER PROFILES WITH MINISTRY ASSIGNMENTS ===' as info;
SELECT 
  up.full_name,
  m.name as current_ministry,
  cb.name as branch
FROM public.user_profile up
LEFT JOIN public.ministry m ON m.id = up.ministry_id
LEFT JOIN public.church_branch cb ON cb.id = up.church_branch_id
WHERE up.ministry_id IS NOT NULL;

SELECT 'Note: Above users will have ministry_id set to NULL after cleanup' as warning;

-- =====================================================
-- STEP 2: CLEANUP WITHIN TRANSACTION
-- =====================================================
-- This ensures all deletions succeed or none do

BEGIN;

-- Store counts before deletion for final report
DO $$
DECLARE
    asset_count integer;
    verification_count integer;
    transfer_count integer;
    disposal_count integer;
    ministry_count integer;
BEGIN
    SELECT COUNT(*) INTO asset_count FROM inventory.asset;
    SELECT COUNT(*) INTO verification_count FROM inventory.verification_history;
    SELECT COUNT(*) INTO transfer_count FROM inventory.transfer_history;
    SELECT COUNT(*) INTO disposal_count FROM inventory.disposal_history;
    SELECT COUNT(*) INTO ministry_count FROM public.ministry;
    
    RAISE NOTICE '=== STARTING CLEANUP ===';
    RAISE NOTICE 'Assets to delete: %', asset_count;
    RAISE NOTICE 'Verification records to delete: %', verification_count;
    RAISE NOTICE 'Transfer records to delete: %', transfer_count;
    RAISE NOTICE 'Disposal records to delete: %', disposal_count;
    RAISE NOTICE 'Ministries to delete: %', ministry_count;
END $$;

-- Delete in order respecting foreign key dependencies
-- Note: transfer_history and asset have ON DELETE RESTRICT with ministries
-- So we must delete them before deleting ministries

DO $$
DECLARE
    deleted_count integer;
BEGIN
    -- 1. Delete disposal history (references assets with CASCADE)
    DELETE FROM inventory.disposal_history;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % disposal history records', deleted_count;

    -- 2. Delete transfer history (references assets with CASCADE, ministries with RESTRICT)
    DELETE FROM inventory.transfer_history;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % transfer history records', deleted_count;

    -- 3. Delete verification history (references assets with CASCADE)
    DELETE FROM inventory.verification_history;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % verification history records', deleted_count;

    -- 4. Delete all assets (references ministries with RESTRICT)
    DELETE FROM inventory.asset;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % asset records', deleted_count;

    -- 5. Delete all ministries (now safe - no assets or transfers reference them)
    DELETE FROM public.ministry;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % ministry records', deleted_count;
    
    RAISE NOTICE '=== CLEANUP DELETIONS COMPLETE ===';
END $$;

COMMIT;

-- =====================================================
-- STEP 3: POST-CLEANUP VERIFICATION
-- =====================================================

SELECT '=== POST-CLEANUP VERIFICATION ===' as info;

SELECT 'Assets remaining' as table_name, COUNT(*) as count 
FROM inventory.asset
UNION ALL
SELECT 'Verification records remaining', COUNT(*) 
FROM inventory.verification_history
UNION ALL
SELECT 'Transfer records remaining', COUNT(*) 
FROM inventory.transfer_history
UNION ALL
SELECT 'Disposal records remaining', COUNT(*) 
FROM inventory.disposal_history
UNION ALL
SELECT 'Ministries remaining', COUNT(*) 
FROM public.ministry;

-- Verify preserved data is intact
SELECT '=== PRESERVED DATA VERIFICATION ===' as info;

SELECT 'System roles (should be 3)' as table_name, COUNT(*) as count 
FROM public.roles
UNION ALL
SELECT 'User profiles', COUNT(*) 
FROM public.user_profile
UNION ALL
SELECT 'User role assignments', COUNT(*) 
FROM public.user_roles
UNION ALL
SELECT 'Church branches', COUNT(*) 
FROM public.church_branch;

-- Show preserved roles
SELECT '=== SYSTEM ROLES (PRESERVED) ===' as info;
SELECT name, description FROM public.roles ORDER BY name;

-- Verify user profiles have ministry_id set to NULL
SELECT '=== USER PROFILES - MINISTRY ASSIGNMENTS ===' as info;
SELECT 
  COUNT(CASE WHEN ministry_id IS NULL THEN 1 END) as users_without_ministry,
  COUNT(CASE WHEN ministry_id IS NOT NULL THEN 1 END) as users_with_ministry
FROM public.user_profile;

SELECT 'Expected: All users should have NULL ministry_id after cleanup' as note;

-- =====================================================
-- CLEANUP COMPLETE
-- =====================================================

SELECT '✅ CLEANUP COMPLETE - Database is ready for production data' as status;

-- =====================================================
-- NOTES
-- =====================================================
--
-- After running this script:
-- 1. Verify all asset and ministry counts are 0
-- 2. Verify system roles are intact (should be 3)
-- 3. Verify your branches are preserved
-- 4. User profiles will have ministry_id set to NULL
-- 5. You can now add production ministries and assets through the application
--
-- To ROLLBACK if issues occur (must be done before COMMIT):
--   ROLLBACK;
--
-- =====================================================

