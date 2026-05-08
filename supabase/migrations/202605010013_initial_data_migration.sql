-- Initial data migration: insert default roles, first library, and migrate existing users

-- Insert default roles
INSERT INTO user_roles (role_name, description) VALUES
  ('admin', 'Administrator - Full access to all features and locations'),
  ('manager', 'Manager - Can create/edit/read records but cannot delete or modify seat/floor configurations'),
  ('staff', 'Staff - Can create and read records only, no edit or delete permissions')
ON CONFLICT (role_name) DO NOTHING;

-- Create the default "Main Library" location if it doesn't exist
INSERT INTO libraries (name, location, settings) 
SELECT 'Main Library', 'Default Location', '{"seats": {"firstFloor": 40, "secondFloor": 40}, "pricing": {"firstFloor": 4000, "secondFloor": 3000}}'
WHERE NOT EXISTS (SELECT 1 FROM libraries WHERE name = 'Main Library')
RETURNING id;

-- Get the admin role id
WITH admin_role AS (
  SELECT id FROM user_roles WHERE role_name = 'admin'
),
-- Get the main library id
main_library AS (
  SELECT id FROM libraries WHERE name = 'Main Library'
)
-- Migrate existing auth users to user_profiles as admins with access to all libraries
INSERT INTO user_profiles (id, library_id, role_id, full_name, email, is_active)
SELECT 
  au.id,
  NULL, -- NULL means can see all libraries
  ar.id,
  au.email,
  au.email,
  TRUE
FROM auth.users au, admin_role ar
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles WHERE id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Migrate existing records to main library if library_id is null
WITH main_library AS (
  SELECT id FROM libraries WHERE name = 'Main Library'
)
UPDATE library_members SET library_id = (SELECT id FROM main_library) WHERE library_id IS NULL;

WITH main_library AS (
  SELECT id FROM libraries WHERE name = 'Main Library'
)
UPDATE payment_history SET library_id = (SELECT id FROM main_library) WHERE library_id IS NULL;

WITH main_library AS (
  SELECT id FROM libraries WHERE name = 'Main Library'
)
UPDATE expenses SET library_id = (SELECT id FROM main_library) WHERE library_id IS NULL;

WITH main_library AS (
  SELECT id FROM libraries WHERE name = 'Main Library'
)
UPDATE todos SET library_id = (SELECT id FROM main_library) WHERE library_id IS NULL;

-- Create default seat floor configurations for the main library
WITH main_library AS (
  SELECT id FROM libraries WHERE name = 'Main Library'
)
INSERT INTO seat_floors (library_id, floor_name, seat_count, price, is_active)
SELECT ml.id, 'First Floor', 40, 4000, TRUE FROM main_library ml
WHERE NOT EXISTS (SELECT 1 FROM seat_floors WHERE floor_name = 'First Floor')
UNION ALL
SELECT ml.id, 'Second Floor', 40, 3000, TRUE FROM main_library ml
WHERE NOT EXISTS (SELECT 1 FROM seat_floors WHERE floor_name = 'Second Floor')
ON CONFLICT DO NOTHING;
