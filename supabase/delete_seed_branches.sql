-- =====================================================
-- ALIC Inventory Management System
-- Stage 2: Delete Test/Seed Branches
-- =====================================================
--
-- PURPOSE: Remove test branches with hardcoded UUIDs after
--          all users have been reassigned to ALIC MD
--
-- ⚠️  PREREQUISITE: Run reassign_users_to_alic_md.sql FIRST
--
-- =====================================================
-- ⚠️  IMPORTANT: BACKUP YOUR DATABASE BEFORE RUNNING
-- =====================================================

-- =====================================================
-- STEP 1: PRE-DELETION VERIFICATION
-- =====================================================

SELECT '=== PRE-DELETION VERIFICATION ===' as info;

-- Check which branches will be deleted
SELECT 
  id,
  name,
  location,
  is_active,
  'WILL BE DELETED' as status
FROM public.church_branch
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
)
ORDER BY name;

-- Verify no users are in these branches
SELECT '=== USERS IN BRANCHES TO DELETE ===' as info;

SELECT 
  cb.name as branch_name,
  COUNT(up.id) as user_count
FROM public.church_branch cb
LEFT JOIN public.user_profile up ON up.church_branch_id = cb.id
WHERE cb.id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
)
GROUP BY cb.id, cb.name;

-- Expected: Should show 0 users for both branches

-- Show ministries that will be deleted (CASCADE)
SELECT '=== MINISTRIES TO BE DELETED (CASCADE) ===' as info;

SELECT 
  cb.name as branch_name,
  m.name as ministry_name,
  m.id as ministry_id
FROM public.ministry m
JOIN public.church_branch cb ON cb.id = m.church_branch_id
WHERE cb.id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
)
ORDER BY cb.name, m.name;

-- Check for assets in these branches (CRITICAL - will block deletion)
SELECT '=== ASSETS IN BRANCHES TO DELETE ===' as info;

SELECT 
  cb.name as branch_name,
  COUNT(a.id) as asset_count
FROM public.church_branch cb
LEFT JOIN inventory.asset a ON a.church_branch_id = cb.id
WHERE cb.id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
)
GROUP BY cb.id, cb.name;

-- ⚠️ Expected: Should show 0 assets for both branches
-- If assets exist, you MUST delete them first or reassign to ALIC MD

-- =====================================================
-- STEP 2: DELETE TEST BRANCHES
-- =====================================================

BEGIN;

DO $$
DECLARE
  branch1_id uuid := '11111111-1111-1111-1111-111111111111';
  branch2_id uuid := '22222222-2222-2222-2222-222222222222';
  users_in_test_branches integer;
  assets_in_test_branches integer;
  deleted_count integer := 0;
BEGIN
  -- Safety check: Ensure no users are in these branches
  SELECT COUNT(*) INTO users_in_test_branches
  FROM public.user_profile
  WHERE church_branch_id IN (branch1_id, branch2_id);
  
  IF users_in_test_branches > 0 THEN
    RAISE EXCEPTION 'SAFETY CHECK FAILED: % users still in test branches. Run Stage 1 first!', 
      users_in_test_branches;
  END IF;
  
  -- Safety check: Ensure no assets are in these branches
  SELECT COUNT(*) INTO assets_in_test_branches
  FROM inventory.asset
  WHERE church_branch_id IN (branch1_id, branch2_id);
  
  IF assets_in_test_branches > 0 THEN
    RAISE EXCEPTION 'SAFETY CHECK FAILED: % assets still in test branches. Delete or reassign assets first!', 
      assets_in_test_branches;
  END IF;
  
  RAISE NOTICE '=== STARTING BRANCH DELETION ===';
  
  -- Delete first test branch
  DELETE FROM public.church_branch WHERE id = branch1_id;
  IF FOUND THEN
    deleted_count := deleted_count + 1;
    RAISE NOTICE 'Deleted branch: Test MD branch (11111111-...)';
  END IF;
  
  -- Delete second test branch
  DELETE FROM public.church_branch WHERE id = branch2_id;
  IF FOUND THEN
    deleted_count := deleted_count + 1;
    RAISE NOTICE 'Deleted branch: Test branch (Delete) (22222222-...)';
  END IF;
  
  RAISE NOTICE 'Total branches deleted: %', deleted_count;
  RAISE NOTICE '=== DELETION COMPLETE ===';
END $$;

COMMIT;

-- =====================================================
-- STEP 3: POST-DELETION VERIFICATION
-- =====================================================

SELECT '=== REMAINING BRANCHES ===' as info;

SELECT 
  id,
  name,
  location,
  is_active,
  (SELECT COUNT(*) FROM public.user_profile WHERE church_branch_id = cb.id) as user_count,
  (SELECT COUNT(*) FROM public.ministry WHERE church_branch_id = cb.id) as ministry_count
FROM public.church_branch cb
ORDER BY name;

-- Expected: Should only show ALIC MD and ALIC VA

-- Verify all users are in remaining branches
SELECT '=== USER DISTRIBUTION ===' as info;

SELECT 
  cb.name as branch_name,
  COUNT(up.id) as user_count
FROM public.church_branch cb
LEFT JOIN public.user_profile up ON up.church_branch_id = cb.id
GROUP BY cb.id, cb.name
ORDER BY user_count DESC;

-- =====================================================
-- COMPLETION
-- =====================================================

SELECT '✅ STAGE 2 COMPLETE - Test branches deleted' as status;
SELECT 'Database is now clean with production branches only' as result;

-- =====================================================
-- NOTES
-- =====================================================
--
-- After running this script:
-- 1. Only ALIC MD and ALIC VA branches should remain
-- 2. All users should be in ALIC MD (or other production branches)
-- 3. Test ministries under deleted branches are auto-removed (CASCADE)
-- 4. You can now create production ministries under ALIC MD
-- 5. Remember to recreate "Finance Ministry" under ALIC MD for asset creation
--
-- What was deleted:
-- - Test branches: 11111111-1111... and 22222222-2222...
-- - All ministries under those branches (CASCADE)
-- - No assets deleted (they were already cleared or reassigned)
-- - No users deleted (they were already reassigned)
--
-- To ROLLBACK if issues occur (must be done before COMMIT):
--   ROLLBACK;
--
-- =====================================================

