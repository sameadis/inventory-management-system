-- =====================================================
-- ALIC Inventory Management System
-- Stage 1: Reassign All Users to ALIC MD Branch
-- =====================================================
--
-- PURPOSE: Move all user profiles to the production ALIC MD branch
--          before deleting test/seed branches
--
-- =====================================================
-- ⚠️  IMPORTANT: VERIFY BRANCH ID BEFORE RUNNING
-- =====================================================

-- =====================================================
-- STEP 1: VERIFY TARGET BRANCH EXISTS
-- =====================================================

SELECT '=== VERIFYING TARGET BRANCH ===' as info;

SELECT 
  id,
  name,
  location,
  is_active,
  created_at
FROM public.church_branch
WHERE name = 'ALIC MD';

-- Expected: Should show ALIC MD branch with id: 9c4c7ccb-cb60-4eb3-969a-768db53eeee3

-- =====================================================
-- STEP 2: PRE-REASSIGNMENT VERIFICATION
-- =====================================================

SELECT '=== USERS BY BRANCH (BEFORE) ===' as info;

SELECT 
  cb.name as branch_name,
  cb.id as branch_id,
  COUNT(up.id) as user_count
FROM public.church_branch cb
LEFT JOIN public.user_profile up ON up.church_branch_id = cb.id
GROUP BY cb.id, cb.name
ORDER BY user_count DESC;

-- =====================================================
-- STEP 3: REASSIGN ALL USERS TO ALIC MD
-- =====================================================

BEGIN;

DO $$
DECLARE
  alic_md_branch_id uuid := '9c4c7ccb-cb60-4eb3-969a-768db53eeee3';
  users_updated integer;
BEGIN
  -- Verify ALIC MD branch exists
  IF NOT EXISTS (SELECT 1 FROM public.church_branch WHERE id = alic_md_branch_id) THEN
    RAISE EXCEPTION 'ALIC MD branch not found with id: %', alic_md_branch_id;
  END IF;
  
  RAISE NOTICE 'Reassigning all users to ALIC MD branch...';
  
  -- Update all user profiles to ALIC MD branch
  UPDATE public.user_profile
  SET church_branch_id = alic_md_branch_id
  WHERE church_branch_id != alic_md_branch_id;
  
  GET DIAGNOSTICS users_updated = ROW_COUNT;
  
  RAISE NOTICE 'Successfully reassigned % users to ALIC MD', users_updated;
END $$;

COMMIT;

-- =====================================================
-- STEP 4: POST-REASSIGNMENT VERIFICATION
-- =====================================================

SELECT '=== USERS BY BRANCH (AFTER) ===' as info;

SELECT 
  cb.name as branch_name,
  cb.id as branch_id,
  COUNT(up.id) as user_count
FROM public.church_branch cb
LEFT JOIN public.user_profile up ON up.church_branch_id = cb.id
GROUP BY cb.id, cb.name
ORDER BY user_count DESC;

-- Expected: All users should now be under ALIC MD

SELECT '=== USER DETAILS IN ALIC MD ===' as info;

SELECT 
  up.id,
  up.full_name,
  cb.name as branch
FROM public.user_profile up
JOIN public.church_branch cb ON cb.id = up.church_branch_id
WHERE cb.name = 'ALIC MD'
ORDER BY up.full_name;

-- =====================================================
-- STEP 5: VERIFY MINISTRIES STATUS
-- =====================================================

SELECT '=== MINISTRIES BY BRANCH ===' as info;

SELECT 
  cb.name as branch_name,
  COUNT(m.id) as ministry_count,
  STRING_AGG(m.name, ', ') as ministries
FROM public.church_branch cb
LEFT JOIN public.ministry m ON m.church_branch_id = cb.id
GROUP BY cb.id, cb.name
ORDER BY cb.name;

-- Note: Ministries are CASCADE deleted with branches,
-- so they'll be removed when we delete test branches in Stage 2

-- =====================================================
-- STEP 6: CHECK ASSETS IN TEST BRANCHES
-- =====================================================

SELECT '=== ASSETS BY BRANCH ===' as info;

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

-- ⚠️ IMPORTANT: If test branches have assets, you must either:
--   1. Delete those assets using cleanup_prod.sql, OR
--   2. Reassign them to ALIC MD (manually or with another script)
-- Otherwise, Stage 2 will fail with RESTRICT constraint violation

-- =====================================================
-- COMPLETION
-- =====================================================

SELECT '✅ STAGE 1 COMPLETE - All users reassigned to ALIC MD' as status;
SELECT 'Next step: Run delete_seed_branches.sql to remove test branches' as next_action;

-- =====================================================
-- NOTES
-- =====================================================
--
-- After running this script:
-- 1. Verify all users are in ALIC MD branch (should see 100% in verification)
-- 2. Check STEP 6 output - if test branches have assets:
--    a. Either run cleanup_prod.sql to delete all assets, OR
--    b. Manually reassign those assets to ALIC MD branch
-- 3. Verify ministries under test branches (they will be auto-deleted in Stage 2)
-- 4. Once assets are cleared, run Stage 2 script to delete test branches
--
-- To ROLLBACK if issues occur (must be done before COMMIT):
--   ROLLBACK;
--
-- =====================================================

