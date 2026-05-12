-- ============================================================
-- WhatsApp AI Business Bot — Sample Data
-- Run AFTER db-schema.sql
-- Usage: psql -U postgres -d whatsapp_bot -f sample-data.sql
-- ============================================================

-- ── 1. Businesses ────────────────────────────────────────────
INSERT INTO businesses (id, name, whatsapp_phone_number_id, verify_token)
VALUES
  (1, 'Luxe Hair Salon',    NULL, 'salon_verify_token_123'),
  (2, 'City Medical Clinic', NULL, 'clinic_verify_token_456'),
  (3, 'FitZone Gym',        NULL, 'gym_verify_token_789')
ON CONFLICT (id) DO NOTHING;

SELECT setval('businesses_id_seq', 3, true);

-- ── 2. Settings ──────────────────────────────────────────────
INSERT INTO settings (business_id, business_name, business_type, phone, email, address, opening_hours, currency, description)
VALUES
  (1, 'Luxe Hair Salon',     'salon',   '+1-555-0101', 'hello@luxehair.com',   '123 Beauty Ave, LA, CA 90001',   'Mon-Sat 9am-7pm, Sun 10am-5pm', 'USD', 'Premium hair salon offering cuts, color, and styling.'),
  (2, 'City Medical Clinic', 'clinic',  '+1-555-0202', 'info@cityclinic.com',  '456 Health Blvd, NY, NY 10001',  'Mon-Fri 8am-6pm, Sat 9am-1pm',  'USD', 'Full-service medical clinic with experienced doctors.'),
  (3, 'FitZone Gym',         'gym',     '+1-555-0303', 'hello@fitzone.com',    '789 Fitness Rd, Chicago, IL 60601','Mon-Sun 5am-11pm',              'USD', 'State-of-the-art gym with classes and personal training.')
ON CONFLICT (business_id) DO NOTHING;

-- ── 3. Customers ─────────────────────────────────────────────
INSERT INTO customers (id, business_id, phone, name)
VALUES
  (1, 1, '+13105550210', 'Patricia Allen'),
  (2, 1, '+13105550321', 'James Carter'),
  (3, 1, '+13105550432', 'Sophie Lee'),
  (4, 2, '+12125550111', 'Robert Chen'),
  (5, 2, '+12125550222', 'Maria Garcia'),
  (6, 3, '+17735550101', 'Tyler Brooks'),
  (7, 3, '+17735550202', 'Natasha Kim')
ON CONFLICT DO NOTHING;

SELECT setval('customers_id_seq', 7, true);

-- ── 4. FAQs — Salon ──────────────────────────────────────────
INSERT INTO faqs (business_id, question, answer, keywords, active)
VALUES
  (1, 'What are your opening hours?',
   'We are open Monday to Saturday 9am–7pm, and Sunday 10am–5pm.',
   ARRAY['hours','open','opening','time','schedule','when'], TRUE),

  (1, 'Where are you located?',
   'We are at 123 Beauty Ave, Los Angeles, CA 90001. Parking is free in our lot.',
   ARRAY['location','address','where','directions','parking'], TRUE),

  (1, 'How do I book an appointment?',
   'Just reply with your preferred service, date and time and we will confirm within 1 hour!',
   ARRAY['book','appointment','booking','reserve','schedule'], TRUE),

  (1, 'What payment methods do you accept?',
   'We accept cash, all major credit/debit cards, Apple Pay, and Google Pay.',
   ARRAY['payment','pay','cash','card','credit','debit'], TRUE),

  (1, 'Do you offer a cancellation policy?',
   'Please cancel at least 24 hours in advance. Late cancellations may incur a 50% charge.',
   ARRAY['cancel','cancellation','refund','policy','reschedule'], TRUE),

  (1, 'Do I need to arrive early?',
   'We recommend arriving 5–10 minutes early for your first visit so we can complete a quick consultation.',
   ARRAY['arrive','early','first','visit','consultation'], TRUE);

-- ── 5. FAQs — Clinic ─────────────────────────────────────────
INSERT INTO faqs (business_id, question, answer, keywords, active)
VALUES
  (2, 'What are your clinic hours?',
   'We are open Monday to Friday 8am–6pm, and Saturday 9am–1pm. Closed Sundays.',
   ARRAY['hours','open','time','schedule','when'], TRUE),

  (2, 'Do I need an appointment?',
   'Yes, appointments are recommended. Walk-ins are accepted based on availability.',
   ARRAY['appointment','book','walkin','walk-in','reserve'], TRUE),

  (2, 'Do you accept insurance?',
   'We accept most major insurance plans including BlueCross, Aetna, Cigna, and United Health.',
   ARRAY['insurance','bluecross','aetna','cigna','coverage','plan'], TRUE),

  (2, 'How do I get my test results?',
   'Results are available in your patient portal within 24–48 hours. We will also call for urgent results.',
   ARRAY['results','test','lab','portal','blood','report'], TRUE);

-- ── 6. FAQs — Gym ────────────────────────────────────────────
INSERT INTO faqs (business_id, question, answer, keywords, active)
VALUES
  (3, 'What are your gym hours?',
   'We are open 7 days a week, 5am–11pm. Members with key fobs can access 24/7.',
   ARRAY['hours','open','time','schedule','24/7','keyfob'], TRUE),

  (3, 'What is the monthly membership fee?',
   'Basic: $29/mo, Premium: $49/mo (includes all classes), Family: $79/mo. No joining fee in June!',
   ARRAY['price','fee','membership','cost','monthly','join'], TRUE),

  (3, 'Do you offer a free trial?',
   'Yes! We offer a free 3-day trial pass for new members. Just come in with a valid ID.',
   ARRAY['trial','free','pass','guest','try','new'], TRUE);

-- ── 7. Services — Salon ──────────────────────────────────────
INSERT INTO services (business_id, name, description, price, duration, category, active, keywords)
VALUES
  (1, 'Haircut & Blow Dry',     'Precision cut + professional blow dry finish', 65.00,  60, 'Hair',      TRUE, ARRAY['haircut','cut','blowdry','trim','style']),
  (1, 'Full Colour',            'All-over colour with premium dye',             120.00, 120, 'Colour',   TRUE, ARRAY['colour','color','dye','highlights','blonde','brunette']),
  (1, 'Balayage',               'Hand-painted highlights for a natural sun-kissed look', 180.00, 150, 'Colour', TRUE, ARRAY['balayage','highlights','ombre','sun','freehand']),
  (1, 'Keratin Treatment',      'Smoothing treatment for frizz-free hair',      220.00, 180, 'Treatment', TRUE, ARRAY['keratin','smooth','frizz','treatment','straight']),
  (1, 'Scalp Treatment',        'Nourishing scalp therapy + head massage',      55.00,   45, 'Treatment', TRUE, ARRAY['scalp','massage','treatment','nourish','dandruff']),
  (1, 'Bridal Package',         'Full bridal glam: hair + makeup + trial',      450.00, 300, 'Special',  TRUE, ARRAY['bridal','wedding','bride','package','glam']);

-- ── 8. Services — Clinic ─────────────────────────────────────
INSERT INTO services (business_id, name, description, price, duration, category, active, keywords)
VALUES
  (2, 'General Consultation',   'GP consultation for any health concern',       80.00,  30, 'Consultation', TRUE, ARRAY['consultation','doctor','gp','checkup','sick']),
  (2, 'Full Blood Panel',       'Comprehensive blood count + metabolic panel', 120.00,  20, 'Lab',        TRUE, ARRAY['blood','lab','test','panel','results']),
  (2, 'Specialist Referral',    'Referral letter + specialist coordination',    60.00,  20, 'Consultation',TRUE, ARRAY['specialist','referral','letter','refer']),
  (2, 'Annual Physical',        'Complete yearly physical examination',        150.00,  60, 'Wellness',   TRUE, ARRAY['physical','annual','yearly','checkup','wellness']);

-- ── 9. Services — Gym ────────────────────────────────────────
INSERT INTO services (business_id, name, description, price, duration, category, active, keywords)
VALUES
  (3, 'Personal Training (1hr)', '1-on-1 session with certified trainer',       75.00,  60, 'Training', TRUE, ARRAY['personal','trainer','training','1on1','pt']),
  (3, 'Yoga Class',              'Group yoga for all levels',                   20.00,  60, 'Classes',  TRUE, ARRAY['yoga','class','group','stretch','flexibility']),
  (3, 'HIIT Boot Camp',          'High-intensity group training class',         25.00,  45, 'Classes',  TRUE, ARRAY['hiit','bootcamp','cardio','intense','group']),
  (3, 'Monthly Membership',      'Unlimited gym access, Basic tier',            29.00,   0, 'Membership',TRUE,ARRAY['membership','monthly','basic','access','join']);

-- ── 10. Bookings ─────────────────────────────────────────────
INSERT INTO bookings (business_id, customer_id, service, requested_date, requested_time, status, notes)
VALUES
  (1, 1, 'Haircut & Blow Dry',  '2026-05-15', '10:00', 'approved',  'First visit'),
  (1, 1, 'Balayage',            '2026-05-20', '14:00', 'pending',   'Wants warm tones'),
  (1, 2, 'Full Colour',         '2026-05-16', '11:00', 'approved',  NULL),
  (1, 3, 'Bridal Package',      '2026-06-01', '09:00', 'pending',   'Wedding on June 5'),
  (2, 4, 'General Consultation','2026-05-14', '09:00', 'completed', NULL),
  (2, 4, 'Full Blood Panel',    '2026-05-14', '09:30', 'completed', 'Follow-up from consult'),
  (2, 5, 'Annual Physical',     '2026-05-18', '10:00', 'approved',  NULL),
  (3, 6, 'Personal Training (1hr)', '2026-05-13', '07:00', 'approved', 'Focus on upper body'),
  (3, 7, 'Yoga Class',          '2026-05-13', '08:00', 'approved',  NULL);

-- ── 11. Bot Messages (sample conversation) ───────────────────
INSERT INTO bot_messages (business_id, customer_id, direction, content, reply_type)
VALUES
  (1, 1, 'inbound',  'Hi, what are your opening hours?',                   'none'),
  (1, 1, 'outbound', 'We are open Mon-Sat 9am-7pm, Sun 10am-5pm!',         'faq'),
  (1, 1, 'inbound',  'What is the price for balayage?',                    'none'),
  (1, 1, 'outbound', 'Our Balayage service is $180 and takes about 2.5 hours. Would you like to book?', 'service'),
  (1, 1, 'inbound',  'Yes please, book me for next Tuesday at 2pm',        'none'),
  (1, 1, 'outbound', 'Booking request received for Balayage on May 20 at 2:00 PM. We will confirm shortly!', 'booking'),
  (1, 2, 'inbound',  'Do you do hair colouring?',                          'none'),
  (1, 2, 'outbound', 'Yes! Full Colour is $120 (120 min). We also offer Balayage from $180. Want to book?', 'service'),
  (2, 4, 'inbound',  'I need to see a doctor',                             'none'),
  (2, 4, 'outbound', 'General Consultation is $80 (30 min). Please reply with your preferred date/time.', 'service'),
  (3, 6, 'inbound',  'What personal training sessions do you offer?',      'none'),
  (3, 6, 'outbound', 'Personal Training (1hr) is $75/session with a certified trainer. Shall I book you in?', 'service');

-- ── 12. Canned Responses ─────────────────────────────────────
INSERT INTO canned_responses (business_id, title, content)
VALUES
  (1, 'Opening hours',       'We are open Mon–Sat 9am–7pm and Sunday 10am–5pm. Walk-ins welcome!'),
  (1, 'Booking confirmation','Your appointment is confirmed! Please arrive 5 minutes early. If you need to reschedule, just let us know 24 hours in advance.'),
  (1, 'Thank you',           'Thank you for visiting Luxe Hair Salon! We hope to see you again soon. 😊'),
  (1, 'Price list',          'Our prices start from $35 for a cut, $80 for colour, and $120 for highlights. Full price list at our website.'),
  (2, 'Clinic hours',        'City Medical Clinic is open Mon–Fri 8am–6pm and Saturday 9am–1pm. Call us to book an appointment.'),
  (2, 'Appointment reminder','This is a reminder about your upcoming appointment. Please bring a valid ID and your insurance card.'),
  (3, 'Gym hours',           'FitZone is open 7 days a week, 5am–11pm. Drop in anytime — no booking needed for open gym sessions.'),
  (3, 'Membership info',     'We offer monthly, 3-month, and annual memberships. Visit the front desk or our website to sign up today!');

-- ── 13. AI Usage samples ─────────────────────────────────────
INSERT INTO ai_usage (business_id, customer_id, prompt, response, prompt_tokens, completion_tokens, total_tokens, estimated_cost)
VALUES
  (1, 1, 'Customer asked: Can you do hair extensions?\nBusiness: Luxe Hair Salon',
   'We currently do not offer hair extensions, but we can recommend a specialist. Would you like our referral?',
   85, 32, 117, 0.000058),
  (2, 5, 'Customer asked: Do you treat diabetes?\nBusiness: City Medical Clinic',
   'Yes, our doctors manage diabetes with regular checkups, blood panels, and personalised treatment plans.',
   90, 38, 128, 0.000064);

SELECT 'Sample data inserted successfully ✓' AS status;
