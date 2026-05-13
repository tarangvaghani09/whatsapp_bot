-- Example: create/update a business_admin and grant access to exactly one business.
-- Run after 00_all_tables.sql.
--
-- Usage:
-- psql -U postgres -d whatsapp_bot -f ".\setup\setup\05_business_admin_access_example.sql"

-- 1) Ensure business exists (change id/name as needed)
INSERT INTO businesses (id, name, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_verify_token)
VALUES (2, 'Salon Owner Business', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- 2) Create or upgrade admin user role = business_admin
-- Password hash below is for: Owner@123
INSERT INTO admin_users (email, password_hash, role, name)
VALUES (
  'owner@salon.com',
  '$2a$10$WfE7pEes8N8J7L4f6g9ZluAOQY2r4L16SQ6Q8nFiW2Jkk58I.4gci',
  'business_admin',
  'Salon Owner'
)
ON CONFLICT (email) DO UPDATE
SET
  role = 'business_admin',
  name = EXCLUDED.name,
  updated_at = NOW();

-- 3) Map this user to one business only
INSERT INTO user_business_access (user_id, business_id)
SELECT u.id, 2
FROM admin_users u
WHERE u.email = 'owner@salon.com'
ON CONFLICT (user_id, business_id) DO NOTHING;
