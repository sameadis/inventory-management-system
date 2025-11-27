-- Add updated_by field to track who last modified the asset
ALTER TABLE inventory.asset 
ADD COLUMN IF NOT EXISTS updated_by uuid references auth.users(id) on delete set null;

-- Add comment
COMMENT ON COLUMN inventory.asset.updated_by IS 'User who last updated the asset';

-- Create trigger to automatically update updated_by on updates
CREATE OR REPLACE FUNCTION inventory.set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  -- Get current user from session (if available)
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS set_asset_updated_by ON inventory.asset;

CREATE TRIGGER set_asset_updated_by
  BEFORE UPDATE ON inventory.asset
  FOR EACH ROW
  EXECUTE FUNCTION inventory.set_updated_by();

COMMENT ON FUNCTION inventory.set_updated_by() IS 
  'Automatically sets updated_by to current user on asset updates';

