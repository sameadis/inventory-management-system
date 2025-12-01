-- Function to get user emails from auth.users
-- This allows the API to fetch emails without needing the service role key

CREATE OR REPLACE FUNCTION public.get_user_emails(user_ids uuid[])
RETURNS TABLE (user_id uuid, email text) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email
  FROM auth.users au
  WHERE au.id = ANY(user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_emails(uuid[]) TO authenticated;

COMMENT ON FUNCTION public.get_user_emails(uuid[]) IS 
  'Returns email addresses for given user IDs. Used by admin API to display user emails without requiring service role key.';

