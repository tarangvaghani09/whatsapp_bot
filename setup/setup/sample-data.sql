-- ============================================================
-- WhatsApp AI Business Bot — Sample Data (Hair Salon)
-- Run AFTER schema.sql:
--   psql -U postgres -d whatsapp_bot -f setup/sample-data.sql
-- ============================================================

-- Create a sample business
INSERT INTO "businesses" ("name", "whatsapp_phone_number_id", "verify_token")
VALUES ('Glamour Studio', NULL, 'my-verify-token')
ON CONFLICT DO NOTHING;

-- Settings for the business
INSERT INTO "settings" (
  "business_id", "business_name", "business_type",
  "phone", "address", "opening_hours", "currency", "description"
)
SELECT
  id,
  'Glamour Studio',
  'salon',
  '+1-555-0101',
  '45 Main Street, City Center',
  'Mon–Sat: 9:00 AM – 8:00 PM' || chr(10) || 'Sunday: 10:00 AM – 6:00 PM' || chr(10) || 'Public Holidays: Closed',
  'USD',
  'Premium hair salon specialising in colour treatments, keratin smoothing, and bridal packages. Our stylists are certified and experienced.'
FROM "businesses"
WHERE "name" = 'Glamour Studio'
LIMIT 1
ON CONFLICT ("business_id") DO NOTHING;

-- FAQs
INSERT INTO "faqs" ("business_id", "question", "answer", "keywords", "active")
SELECT b.id, q.question, q.answer, q.keywords::text[], true
FROM "businesses" b,
(VALUES
  ('What are your opening hours?',
   'We are open Monday to Saturday, 9:00 AM – 8:00 PM, and Sunday 10:00 AM – 6:00 PM.',
   '{hours,timing,open,close,time,when,schedule}'),
  ('Where are you located?',
   'We are located at 45 Main Street, City Center. Easy parking available. Landmark: next to the post office.',
   '{location,address,where,directions,map,place}'),
  ('How do I book an appointment?',
   'You can book by replying with ''book'', calling us at +1-555-0101, or visiting our salon. We recommend booking 1 day in advance.',
   '{book,appointment,reserve,slot,schedule,visit}'),
  ('Do you accept walk-ins?',
   'Yes, we do accept walk-ins depending on availability! To avoid waiting, we recommend booking in advance.',
   '{walk in,walkin,without appointment,drop in,no booking}'),
  ('What payment methods do you accept?',
   'We accept cash, all major credit/debit cards, and mobile payments (Apple Pay, Google Pay).',
   '{payment,pay,cash,card,credit,debit,upi,online}'),
  ('Do you offer home service?',
   'Yes! We offer home service for groups of 3 or more. Extra charges apply. Contact us to arrange.',
   '{home,home service,house,home visit,at home,doorstep}'),
  ('Do you have parking?',
   'Yes, free parking is available right outside our salon.',
   '{parking,park,car,vehicle}'),
  ('Do you have offers or discounts?',
   'We offer 20% off on your first visit! We also have special weekend packages. Ask our staff for current offers.',
   '{offer,discount,deal,promo,promotion,coupon,package,combo}')
) AS q(question, answer, keywords)
WHERE b.name = 'Glamour Studio'
ON CONFLICT DO NOTHING;

-- Services
INSERT INTO "services" ("business_id", "name", "description", "price", "duration", "category", "keywords", "active")
SELECT b.id, s.name, s.description, s.price::numeric, s.duration::integer, s.category, s.keywords::text[], true
FROM "businesses" b,
(VALUES
  ('Haircut (Men)',       'Classic men''s haircut with styling',              '20',  '30',  'Hair',   '{haircut,cut,men,gents,male,trim}'),
  ('Haircut (Women)',     'Women''s haircut with blow-dry',                   '35',  '45',  'Hair',   '{haircut,cut,women,ladies,female,trim}'),
  ('Hair Coloring',       'Full hair coloring with premium dyes',             '80',  '90',  'Hair',   '{color,colour,dye,highlights,balayage,ombre}'),
  ('Keratin Treatment',   'Smoothing keratin treatment for silky hair',       '150', '120', 'Hair',   '{keratin,smoothing,rebond,straighten,treatment}'),
  ('Hair Spa',            'Deep conditioning hair spa treatment',             '45',  '60',  'Hair',   '{spa,conditioning,hair spa,deep condition,nourish}'),
  ('Facial',              'Deep cleansing and moisturizing facial',           '55',  '60',  'Skin',   '{facial,face,skin,glow,cleansing}'),
  ('Waxing (Full Body)',  'Full body waxing service',                         '70',  '90',  'Body',   '{wax,waxing,full body,body wax}'),
  ('Manicure',            'Classic manicure with nail polish',                '25',  '45',  'Nails',  '{manicure,nails,hand,nail polish,mani}'),
  ('Pedicure',            'Relaxing pedicure with nail care',                 '30',  '45',  'Nails',  '{pedicure,feet,foot,pedi,toenail}'),
  ('Bridal Package',      'Complete bridal makeup and hair styling',          '300', '180', 'Bridal', '{bridal,bride,wedding,makeup,bridal package}')
) AS s(name, description, price, duration, category, keywords)
WHERE b.name = 'Glamour Studio'
ON CONFLICT DO NOTHING;

-- Sample customers (with tags support)
INSERT INTO "customers" ("business_id", "phone", "name", "tags")
SELECT id, '+1-555-9001', 'Sarah Johnson', ARRAY['VIP', 'Regular']
FROM "businesses" WHERE "name" = 'Glamour Studio'
ON CONFLICT DO NOTHING;

INSERT INTO "customers" ("business_id", "phone", "name", "tags")
SELECT id, '+1-555-9002', 'Emma Wilson', ARRAY['New']
FROM "businesses" WHERE "name" = 'Glamour Studio'
ON CONFLICT DO NOTHING;

INSERT INTO "customers" ("business_id", "phone", "name", "tags")
SELECT id, '+1-555-9003', 'James Lee', ARRAY[]::text[]
FROM "businesses" WHERE "name" = 'Glamour Studio'
ON CONFLICT DO NOTHING;

-- Sample conversation messages
INSERT INTO "bot_messages" ("business_id", "customer_id", "direction", "content", "reply_type")
SELECT
  b.id,
  c.id,
  m.direction,
  m.content,
  m.reply_type
FROM "businesses" b
JOIN "customers" c ON c.business_id = b.id AND c.phone = '+1-555-9001'
CROSS JOIN (VALUES
  ('inbound',  'Hi! What are your opening hours?',                                              'none'),
  ('outbound', 'We are open Monday to Saturday, 9:00 AM – 8:00 PM, and Sunday 10:00 AM – 6:00 PM.', 'faq'),
  ('inbound',  'How much does a haircut cost?',                                                 'none'),
  ('outbound', 'Haircut (Women) – Women''s haircut with blow-dry: $35 (45 min)',               'service'),
  ('inbound',  'I want to book an appointment',                                                 'none'),
  ('outbound', 'Sure! Please reply with your preferred date, time, and the service you''d like. We''ll confirm shortly.', 'booking')
) AS m(direction, content, reply_type)
WHERE b.name = 'Glamour Studio'
ON CONFLICT DO NOTHING;

-- Sample bookings (with rating support)
INSERT INTO "bookings" ("business_id", "customer_id", "service", "requested_date", "requested_time", "notes", "status", "rating", "rating_asked_at")
SELECT b.id, c.id, 'Haircut (Women)', '2026-05-15', '2:00 PM', 'First visit', 'completed', 5, now() - interval '2 days'
FROM "businesses" b
JOIN "customers" c ON c.business_id = b.id AND c.phone = '+1-555-9001'
WHERE b.name = 'Glamour Studio'
ON CONFLICT DO NOTHING;

INSERT INTO "bookings" ("business_id", "customer_id", "service", "requested_date", "requested_time", "notes", "status")
SELECT b.id, c.id, 'Hair Coloring', '2026-05-22', '10:00 AM', '', 'pending'
FROM "businesses" b
JOIN "customers" c ON c.business_id = b.id AND c.phone = '+1-555-9002'
WHERE b.name = 'Glamour Studio'
ON CONFLICT DO NOTHING;

SELECT 'Sample data loaded successfully!' AS status;
