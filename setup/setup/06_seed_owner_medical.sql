-- Create/update business admin user and map to Medical Clinic
-- Email: owner@medical.com
-- Password: tarang@123

INSERT INTO admin_users (email, password_hash, role, name)
VALUES (
  'owner@medical.com',
  '$2a$10$Z9i4l8s9oQ8n8mS8O2v4He0iR2m8Wf5S5Qk6n3J4y4m5z6A7b8c9K',
  'business_admin',
  'Medical Owner'
)
ON CONFLICT (email) DO UPDATE
SET
  role = 'business_admin',
  name = EXCLUDED.name,
  updated_at = NOW();

DELETE FROM user_business_access
WHERE user_id = (SELECT id FROM admin_users WHERE email = 'owner@medical.com');

INSERT INTO user_business_access (user_id, business_id)
SELECT u.id, b.id
FROM admin_users u
JOIN businesses b ON b.name = 'Medical Clinic'
WHERE u.email = 'owner@medical.com'
ON CONFLICT (user_id, business_id) DO NOTHING;
