-- Auto-create User Profile Trigger
-- Automatically creates a user_profile record when a new user is added to auth.users
-- This handles both manual user creation in Supabase and invitation flows

-- =====================================================
-- FUNCTION TO CREATE USER PROFILE FOR NEW USERS
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id uuid;
BEGIN
  -- Only create profile if one doesn't exist (safety check)
  IF NOT EXISTS (SELECT 1 FROM public.user_profile WHERE id = NEW.id) THEN
    
    -- Get the first active branch as default
    -- You can modify this logic to select a specific branch
    SELECT id INTO default_branch_id
    FROM public.church_branch
    WHERE is_active = true
    ORDER BY created_at
    LIMIT 1;
    
    -- If no active branch exists, log warning but don't fail
    IF default_branch_id IS NULL THEN
      RAISE WARNING 'No active branch available for new user %. Profile not created.', NEW.id;
      RETURN NEW;
    END IF;
    
    -- Create user profile with default branch
    INSERT INTO public.user_profile (id, church_branch_id, full_name)
    VALUES (
      NEW.id,
      default_branch_id,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',  -- Try to get name from metadata
        NEW.email,                               -- Fall back to email
        'User ' || substring(NEW.id::text, 1, 8) -- Last resort: User + ID prefix
      )
    );
    
    RAISE NOTICE 'Created user profile for % (%) in branch %', 
      NEW.email, NEW.id, default_branch_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CREATE TRIGGER
-- =====================================================

-- Check if trigger already exists before creating
-- This is safer than DROP TRIGGER as it won't remove other developers' triggers
DO $$
BEGIN
  -- Only create trigger if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
    
    RAISE NOTICE 'Created trigger: on_auth_user_created';
  ELSE
    RAISE NOTICE 'Trigger on_auth_user_created already exists, skipping creation';
  END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.handle_new_user() IS 
  'Automatically creates user_profile for new auth.users with default branch assignment. Triggered on user creation via Supabase dashboard, invitation, or API.';

-- Note: COMMENT ON TRIGGER is not supported in PostgreSQL
-- The trigger comment is documented in the migration file itself

-- =====================================================
-- VERIFICATION
-- =====================================================

-- You can verify the trigger exists with:
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Test the trigger by creating a test user in Supabase dashboard
-- The user_profile should be created automatically

