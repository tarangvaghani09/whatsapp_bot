-- Grant owner@salon.com access to all businesses

DELETE FROM user_business_access
WHERE user_id = (SELECT id FROM admin_users WHERE email = 'owner@salon.com');

INSERT INTO user_business_access (user_id, business_id)
SELECT u.id, b.id
FROM admin_users u
CROSS JOIN businesses b
WHERE u.email = 'owner@salon.com'
ON CONFLICT (user_id, business_id) DO NOTHING;
