-- Backfill User Profiles for Existing Users
-- Creates user_profile records for all auth.users who don't have one
-- Assigns them to the first active branch

DO $$
DECLARE
  default_branch_id uuid;
  users_created integer := 0;
BEGIN
  -- Get the first active branch
  SELECT id INTO default_branch_id 
  FROM public.church_branch 
  WHERE is_active = true
  ORDER BY created_at
  LIMIT 1;
  
  -- If no active branch exists, create a default one
  IF default_branch_id IS NULL THEN
    INSERT INTO public.church_branch (name, location, is_active)
    VALUES ('Default Branch', 'To Be Assigned', true)
    RETURNING id INTO default_branch_id;
    
    RAISE NOTICE 'Created default branch with ID: %', default_branch_id;
  END IF;
  
  -- Create user profiles for users without one
  INSERT INTO public.user_profile (id, church_branch_id, full_name)
  SELECT 
    au.id,
    default_branch_id,
    COALESCE(
      au.raw_user_meta_data->>'full_name',
      au.email,
      'User ' || substring(au.id::text, 1, 8)
    )
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profile up WHERE up.id = au.id
  );
  
  -- Get count of users created
  GET DIAGNOSTICS users_created = ROW_COUNT;
  
  RAISE NOTICE 'Backfilled % user profiles to branch %', 
    users_created, default_branch_id;
END $$;

-- Verify the results
SELECT 
  'Total users in auth.users' as metric,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'Users with profiles' as metric,
  COUNT(*) as count
FROM public.user_profile
UNION ALL
SELECT 
  'Users without profiles' as metric,
  COUNT(*) as count
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profile up WHERE up.id = au.id
);

-- Show the backfilled users
SELECT 
  au.email,
  up.full_name,
  cb.name as branch,
  up.created_at as profile_created
FROM auth.users au
JOIN public.user_profile up ON up.id = au.id
JOIN public.church_branch cb ON cb.id = up.church_branch_id
ORDER BY up.created_at DESC;

