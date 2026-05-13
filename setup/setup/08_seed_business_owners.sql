-- Add business owners and map each to one business
-- Password for all below users: tarang@123

INSERT INTO admin_users (email, password_hash, role, name)
VALUES
  ('owner@fitnes.com', '$2a$10$Z9i4l8s9oQ8n8mS8O2v4He0iR2m8Wf5S5Qk6n3J4y4m5z6A7b8c9K', 'business_admin', 'Fitness Owner'),
  ('owner@restaurant.com', '$2a$10$Z9i4l8s9oQ8n8mS8O2v4He0iR2m8Wf5S5Qk6n3J4y4m5z6A7b8c9K', 'business_admin', 'Restaurant Owner'),
  ('owner@coaching.com', '$2a$10$Z9i4l8s9oQ8n8mS8O2v4He0iR2m8Wf5S5Qk6n3J4y4m5z6A7b8c9K', 'business_admin', 'Coaching Owner')
ON CONFLICT (email) DO UPDATE
SET
  role = 'business_admin',
  name = EXCLUDED.name,
  updated_at = NOW();

DELETE FROM user_business_access
WHERE user_id IN (
  SELECT id FROM admin_users
  WHERE email IN ('owner@fitnes.com', 'owner@restaurant.com', 'owner@coaching.com')
);

INSERT INTO user_business_access (user_id, business_id)
SELECT u.id, b.id
FROM admin_users u
JOIN businesses b ON b.name = 'Fitness Gym'
WHERE u.email = 'owner@fitnes.com'
ON CONFLICT (user_id, business_id) DO NOTHING;

INSERT INTO user_business_access (user_id, business_id)
SELECT u.id, b.id
FROM admin_users u
JOIN businesses b ON b.name = 'Restaurant'
WHERE u.email = 'owner@restaurant.com'
ON CONFLICT (user_id, business_id) DO NOTHING;

INSERT INTO user_business_access (user_id, business_id)
SELECT u.id, b.id
FROM admin_users u
JOIN businesses b ON b.name = 'Coaching Center'
WHERE u.email = 'owner@coaching.com'
ON CONFLICT (user_id, business_id) DO NOTHING;
