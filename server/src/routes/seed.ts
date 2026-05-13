import { Router, type IRouter } from "express";
import { db, faqsTable, servicesTable } from "@workspace/db";
import { z } from "zod";
import { BusinessIdQueryParam, resolveBusinessId } from "../lib/resolve-business";

const router: IRouter = Router();

const SeedBody = z.object({
  businessType: z.enum(["salon", "clinic", "gym", "restaurant", "coaching"]),
});

// ─── SALON ───────────────────────────────────────────────────────────────────
const salonFaqs = [
  { question: "What are your opening hours?", answer: "We are open Monday to Saturday, 9:00 AM – 8:00 PM, and Sunday 10:00 AM – 6:00 PM.", keywords: ["hours", "timing", "open", "close", "time", "when", "schedule"] },
  { question: "Where are you located?", answer: "We are located at 45 Main Street, City Center. Easy parking available. Landmark: next to the post office.", keywords: ["location", "address", "where", "directions", "map", "place"] },
  { question: "How do I book an appointment?", answer: "You can book by replying with 'book', calling us at +1-555-0101, or visiting our salon. We recommend booking 1 day in advance.", keywords: ["book", "appointment", "reserve", "slot", "schedule", "visit"] },
  { question: "Do you accept walk-ins?", answer: "Yes, we do accept walk-ins depending on availability! To avoid waiting, we recommend booking in advance.", keywords: ["walk in", "walkin", "without appointment", "drop in", "no booking"] },
  { question: "What payment methods do you accept?", answer: "We accept cash, all major credit/debit cards, and mobile payments (Apple Pay, Google Pay).", keywords: ["payment", "pay", "cash", "card", "credit", "debit", "upi", "online"] },
  { question: "Do you offer home service?", answer: "Yes! We offer home service for groups of 3 or more. Extra charges apply. Contact us to arrange.", keywords: ["home", "home service", "house", "home visit", "at home", "doorstep"] },
  { question: "Do you have parking?", answer: "Yes, free parking is available right outside our salon.", keywords: ["parking", "park", "car", "vehicle"] },
  { question: "Do you have offers or discounts?", answer: "We offer 20% off on your first visit! We also have special weekend packages. Ask our staff for current offers.", keywords: ["offer", "discount", "deal", "promo", "promotion", "coupon", "package", "combo"] },
];
const salonServices = [
  { name: "Haircut (Men)", description: "Classic men's haircut with styling", price: "20", duration: 30, category: "Hair", keywords: ["haircut", "cut", "men", "gents", "male", "trim"] },
  { name: "Haircut (Women)", description: "Women's haircut with blow-dry", price: "35", duration: 45, category: "Hair", keywords: ["haircut", "cut", "women", "ladies", "female", "trim"] },
  { name: "Hair Coloring", description: "Full hair coloring with premium dyes", price: "80", duration: 90, category: "Hair", keywords: ["color", "colour", "dye", "highlights", "balayage", "ombre"] },
  { name: "Keratin Treatment", description: "Smoothing keratin treatment for silky hair", price: "150", duration: 120, category: "Hair", keywords: ["keratin", "smoothing", "rebond", "straighten", "treatment"] },
  { name: "Hair Spa", description: "Deep conditioning hair spa treatment", price: "45", duration: 60, category: "Hair", keywords: ["spa", "conditioning", "hair spa", "deep condition", "nourish"] },
  { name: "Facial", description: "Deep cleansing and moisturizing facial", price: "55", duration: 60, category: "Skin", keywords: ["facial", "face", "skin", "glow", "cleansing"] },
  { name: "Waxing (Full Body)", description: "Full body waxing service", price: "70", duration: 90, category: "Body", keywords: ["wax", "waxing", "full body", "body wax"] },
  { name: "Manicure", description: "Classic manicure with nail polish", price: "25", duration: 45, category: "Nails", keywords: ["manicure", "nails", "hand", "nail polish", "mani"] },
  { name: "Pedicure", description: "Relaxing pedicure with nail care", price: "30", duration: 45, category: "Nails", keywords: ["pedicure", "feet", "foot", "pedi", "toenail"] },
  { name: "Bridal Package", description: "Complete bridal makeup and hair styling", price: "300", duration: 180, category: "Bridal", keywords: ["bridal", "bride", "wedding", "makeup", "bridal package"] },
];

// ─── CLINIC ──────────────────────────────────────────────────────────────────
const clinicFaqs = [
  { question: "What are the clinic hours?", answer: "Our clinic is open Monday to Friday 8:00 AM – 8:00 PM, Saturday 9:00 AM – 5:00 PM. Closed on Sundays.", keywords: ["hours", "timing", "open", "close", "time", "when", "schedule"] },
  { question: "How do I book a consultation?", answer: "Reply 'book appointment' with your preferred date and time, or call us at +1-555-0202. First consultations are 20 minutes.", keywords: ["book", "appointment", "consultation", "consult", "doctor", "visit", "schedule"] },
  { question: "Do you accept insurance?", answer: "Yes, we accept most major insurance providers including BlueCross, Aetna, and United Health. Please bring your insurance card.", keywords: ["insurance", "cover", "coverage", "plan", "insured"] },
  { question: "What should I bring to my first appointment?", answer: "Please bring a valid ID, your insurance card, any previous medical records, and a list of current medications.", keywords: ["bring", "first visit", "documents", "records", "first appointment"] },
  { question: "Do you offer emergency consultations?", answer: "Yes, we reserve slots for same-day emergency consultations. Call us directly for urgent appointments.", keywords: ["emergency", "urgent", "same day", "immediate", "asap"] },
  { question: "Where is the clinic located?", answer: "We are at 12 Health Avenue, Medical District. Ground floor, easily wheelchair accessible.", keywords: ["location", "address", "where", "directions", "map"] },
  { question: "Can I get a prescription online?", answer: "We offer teleconsultation with e-prescriptions. Book a video call appointment through our system.", keywords: ["prescription", "online", "teleconsult", "telemedicine", "video", "remote"] },
  { question: "What are the consultation fees?", answer: "General consultation: $50. Specialist: $120. Teleconsultation: $40. Follow-up visits are discounted.", keywords: ["fee", "fees", "cost", "price", "charge", "how much", "consultation fee"] },
];
const clinicServices = [
  { name: "General Consultation", description: "General health check and consultation with our GP", price: "50", duration: 20, category: "General", keywords: ["general", "consultation", "checkup", "doctor", "gp"] },
  { name: "Specialist Consultation", description: "Consultation with a specialist doctor", price: "120", duration: 30, category: "Specialist", keywords: ["specialist", "expert", "referral", "specific"] },
  { name: "Teleconsultation", description: "Online video consultation from home", price: "40", duration: 20, category: "Online", keywords: ["online", "video", "remote", "teleconsult", "virtual"] },
  { name: "Full Body Checkup", description: "Comprehensive health screening package", price: "200", duration: 60, category: "Screening", keywords: ["full body", "health checkup", "screening", "complete checkup", "blood test"] },
  { name: "Blood Test (Basic Panel)", description: "Complete blood count, glucose, lipid panel", price: "60", duration: 15, category: "Lab", keywords: ["blood test", "blood work", "lab", "cbc", "glucose", "cholesterol"] },
  { name: "ECG", description: "Electrocardiogram for heart health assessment", price: "45", duration: 15, category: "Cardiology", keywords: ["ecg", "ekg", "heart", "cardiac", "electrocardiogram"] },
  { name: "Physiotherapy Session", description: "One-on-one physiotherapy and rehabilitation", price: "80", duration: 45, category: "Physiotherapy", keywords: ["physio", "physiotherapy", "rehabilitation", "rehab", "exercise therapy"] },
  { name: "Dental Checkup", description: "Dental examination and cleaning", price: "70", duration: 30, category: "Dental", keywords: ["dental", "teeth", "dentist", "tooth", "cleaning", "oral"] },
  { name: "Eye Examination", description: "Comprehensive eye test and vision check", price: "65", duration: 30, category: "Ophthalmology", keywords: ["eye", "vision", "sight", "optometry", "spectacles", "glasses"] },
  { name: "Vaccination", description: "Standard vaccinations and immunizations", price: "35", duration: 15, category: "Preventive", keywords: ["vaccine", "vaccination", "immunization", "shot", "injection"] },
];

// ─── GYM ─────────────────────────────────────────────────────────────────────
const gymFaqs = [
  { question: "What are the gym hours?", answer: "We are open 5:00 AM – 11:00 PM on weekdays and 6:00 AM – 10:00 PM on weekends. 24/7 access available for premium members.", keywords: ["hours", "timing", "open", "close", "time", "when", "schedule"] },
  { question: "How do I sign up for a membership?", answer: "Visit us in person or reply 'join' to start your membership. We offer monthly, quarterly, and annual plans. First session is free!", keywords: ["join", "sign up", "membership", "register", "enroll", "member"] },
  { question: "Do you offer personal training?", answer: "Yes! We have certified personal trainers available. Sessions start at $40/hour. Reply 'personal trainer' to book.", keywords: ["personal trainer", "trainer", "training", "pt", "coach", "one on one"] },
  { question: "Is there a free trial?", answer: "Yes, we offer a free 1-day trial pass. Just visit us with a valid ID and we'll get you started.", keywords: ["free", "trial", "try", "demo", "free pass", "guest pass"] },
  { question: "Do you have group classes?", answer: "Yes! We offer Zumba, Yoga, Pilates, Spin, HIIT, and CrossFit classes. Check the schedule at the front desk or ask us.", keywords: ["class", "group class", "zumba", "yoga", "pilates", "spin", "hiit", "crossfit"] },
  { question: "Do you have a swimming pool?", answer: "Yes, we have a heated 25m indoor pool. Pool access is included in the Premium membership.", keywords: ["pool", "swimming", "swim", "water", "aqua"] },
  { question: "Can I pause my membership?", answer: "Yes, you can pause your membership for up to 2 months per year. Visit the front desk or contact us to arrange.", keywords: ["pause", "freeze", "hold", "suspend", "cancel", "stop"] },
  { question: "What facilities do you have?", answer: "We have a fully equipped gym floor, cardio area, free weights, group class studio, steam room, sauna, and lockers.", keywords: ["facilities", "equipment", "amenities", "what do you have", "features"] },
];
const gymServices = [
  { name: "Monthly Membership", description: "Full gym access for one month", price: "50", duration: undefined, category: "Membership", keywords: ["monthly", "month", "membership", "subscription"] },
  { name: "Quarterly Membership", description: "3-month membership with 10% discount", price: "135", duration: undefined, category: "Membership", keywords: ["quarterly", "3 month", "three month", "quarter"] },
  { name: "Annual Membership", description: "12-month membership with 25% discount", price: "450", duration: undefined, category: "Membership", keywords: ["annual", "yearly", "year", "12 month"] },
  { name: "Personal Training (1 session)", description: "1-hour one-on-one training with a certified PT", price: "40", duration: 60, category: "Training", keywords: ["personal training", "pt session", "trainer", "one on one"] },
  { name: "Personal Training (10 sessions)", description: "10-session pack with certified personal trainer", price: "350", duration: undefined, category: "Training", keywords: ["pt pack", "training pack", "10 sessions", "bulk sessions"] },
  { name: "Yoga Class", description: "Group yoga session (all levels welcome)", price: "15", duration: 60, category: "Classes", keywords: ["yoga", "flexibility", "zen", "mindfulness"] },
  { name: "Zumba Class", description: "High-energy Latin dance fitness class", price: "12", duration: 45, category: "Classes", keywords: ["zumba", "dance", "latin", "cardio dance"] },
  { name: "HIIT Class", description: "High-intensity interval training group class", price: "15", duration: 45, category: "Classes", keywords: ["hiit", "interval", "intense", "high intensity"] },
  { name: "Spin Class", description: "Indoor cycling group class", price: "15", duration: 45, category: "Classes", keywords: ["spin", "cycling", "cycle", "indoor bike"] },
  { name: "Day Pass", description: "Single day access to all gym facilities", price: "10", duration: undefined, category: "Day Pass", keywords: ["day pass", "day visit", "one day", "single day", "guest pass"] },
];

// ─── RESTAURANT ──────────────────────────────────────────────────────────────
const restaurantFaqs = [
  { question: "What are your opening hours?", answer: "We are open daily: Lunch 12:00 PM – 3:30 PM, Dinner 6:30 PM – 11:00 PM. Last orders 30 mins before closing.", keywords: ["hours", "timing", "open", "close", "time", "when", "lunch", "dinner"] },
  { question: "Do you take reservations?", answer: "Yes! Reply 'reserve table' with your preferred date, time, and number of guests. We recommend booking for groups of 4+.", keywords: ["reservation", "reserve", "book table", "booking", "table", "seat"] },
  { question: "Do you offer home delivery?", answer: "Yes, we deliver within 5km. Minimum order $20. Delivery charge $3. Average time: 35–45 minutes.", keywords: ["delivery", "home delivery", "deliver", "order online", "takeaway", "order"] },
  { question: "Do you have vegetarian/vegan options?", answer: "Absolutely! We have a dedicated vegetarian and vegan menu. Just ask our staff or check the menu section marked 🌱.", keywords: ["vegetarian", "vegan", "veggie", "plant based", "no meat", "plant-based"] },
  { question: "Do you cater for events?", answer: "Yes! We offer catering for corporate events, weddings, and private parties. Contact us for custom quotes.", keywords: ["catering", "event", "wedding", "party", "corporate", "bulk order"] },
  { question: "Where are you located?", answer: "We are at 88 Food Street, Downtown. Ample street parking available. Look for the red awning!", keywords: ["location", "address", "where", "directions", "map", "find us"] },
  { question: "Do you have a kids menu?", answer: "Yes, we have a fun kids menu with smaller portions and kid-friendly options. Kids under 5 eat free!", keywords: ["kids", "children", "child", "kids menu", "family"] },
  { question: "Do you have Wi-Fi?", answer: "Yes, free Wi-Fi available! Password is on your table card. Enjoy browsing while you dine.", keywords: ["wifi", "wi-fi", "internet", "password", "network"] },
];
const restaurantServices = [
  { name: "Table Reservation (2 people)", description: "Reserve a table for 2 guests", price: undefined, duration: undefined, category: "Reservation", keywords: ["table for 2", "couple", "two people", "reservation for 2"] },
  { name: "Table Reservation (4+ people)", description: "Group table reservation for 4 or more guests", price: undefined, duration: undefined, category: "Reservation", keywords: ["group", "family", "table for 4", "large table"] },
  { name: "Home Delivery", description: "Food delivered to your door within 5km. Min order $20.", price: "3", duration: undefined, category: "Delivery", keywords: ["delivery", "home delivery", "deliver to home"] },
  { name: "Lunch Set Menu", description: "2-course set lunch with drink. Changes daily.", price: "18", duration: undefined, category: "Menu", keywords: ["lunch", "set menu", "lunch deal", "set lunch"] },
  { name: "Dinner For Two", description: "Romantic 3-course dinner for two with a bottle of wine", price: "85", duration: undefined, category: "Menu", keywords: ["dinner for two", "romantic", "date night", "couple dinner"] },
  { name: "Private Dining Room", description: "Private room for up to 12 guests — perfect for events", price: "150", duration: undefined, category: "Events", keywords: ["private", "private room", "event", "birthday", "anniversary"] },
  { name: "Catering (per head)", description: "Event catering service — contact for custom quotes", price: "35", duration: undefined, category: "Events", keywords: ["catering", "catering service", "event catering", "corporate"] },
  { name: "Cooking Class", description: "Learn to cook our signature dishes with our chef", price: "60", duration: 120, category: "Experience", keywords: ["cooking class", "cook", "learn", "chef class"] },
];

// ─── COACHING ─────────────────────────────────────────────────────────────────
const coachingFaqs = [
  { question: "What courses do you offer?", answer: "We offer coaching in Math, Science, English, Programming, IELTS/TOEFL, SAT/ACT, MBA entrance, and competitive exam prep.", keywords: ["courses", "subjects", "what do you teach", "classes", "offer", "available"] },
  { question: "What are the batch timings?", answer: "Morning batches: 7:00 AM – 10:00 AM. Evening batches: 5:00 PM – 8:00 PM. Weekend batches available. Online classes also offered.", keywords: ["timing", "batch", "schedule", "time", "when", "morning", "evening", "weekend"] },
  { question: "How do I enroll?", answer: "Reply 'enroll' with the course name and your contact details, or visit us. A free demo class is included before enrollment.", keywords: ["enroll", "join", "admission", "register", "apply", "sign up"] },
  { question: "Do you offer online classes?", answer: "Yes! All our courses are available online via Zoom. Recordings are provided so you never miss a class.", keywords: ["online", "zoom", "virtual", "remote", "home", "e-learning", "recorded"] },
  { question: "What is the fee structure?", answer: "Fees vary by course. Group classes start at $80/month. One-on-one tutoring starts at $40/hour. Sibling discounts available.", keywords: ["fee", "fees", "cost", "price", "charge", "how much", "payment"] },
  { question: "Do you offer a free trial class?", answer: "Yes! We offer one free demo class for any course. No commitment needed — just come and experience our teaching.", keywords: ["free", "trial", "demo", "free class", "try", "sample"] },
  { question: "What is the student-to-teacher ratio?", answer: "Our group batches have max 12 students per teacher to ensure personal attention. One-on-one sessions are also available.", keywords: ["ratio", "batch size", "students", "how many students", "class size"] },
  { question: "Do you provide study material?", answer: "Yes! All study materials, practice tests, and worksheets are included in the course fee. No extra charges.", keywords: ["material", "study material", "books", "notes", "worksheet", "practice test"] },
];
const coachingServices = [
  { name: "Math Coaching (Group)", description: "Group coaching for school/college math — all levels", price: "80", duration: 90, category: "Academics", keywords: ["math", "maths", "mathematics", "algebra", "calculus", "geometry"] },
  { name: "Science Coaching (Group)", description: "Physics, Chemistry, Biology coaching", price: "80", duration: 90, category: "Academics", keywords: ["science", "physics", "chemistry", "biology", "pcb", "pcm"] },
  { name: "English / IELTS Prep", description: "English language and IELTS/TOEFL preparation", price: "100", duration: 90, category: "Language", keywords: ["english", "ielts", "toefl", "language", "grammar", "writing", "speaking"] },
  { name: "SAT / ACT Prep", description: "Comprehensive SAT and ACT test preparation", price: "120", duration: 90, category: "Competitive", keywords: ["sat", "act", "college admission", "entrance test"] },
  { name: "MBA Entrance (GMAT/GRE)", description: "GMAT and GRE prep for MBA admissions", price: "150", duration: 90, category: "Competitive", keywords: ["gmat", "gre", "mba", "business school", "management"] },
  { name: "Programming / Coding", description: "Python, JavaScript, and web development for beginners", price: "100", duration: 90, category: "Technology", keywords: ["coding", "programming", "python", "javascript", "web", "software"] },
  { name: "One-on-One Tutoring (1 hr)", description: "Private one-on-one session with expert tutor", price: "40", duration: 60, category: "Private", keywords: ["one on one", "private", "personal", "tutoring", "individual"] },
  { name: "10-Session Pack (Group)", description: "10 group class sessions — save 15%", price: "680", duration: undefined, category: "Packages", keywords: ["pack", "bundle", "10 classes", "package", "bulk"] },
  { name: "Mock Test Package", description: "5 full-length practice tests with detailed review", price: "50", duration: undefined, category: "Tests", keywords: ["mock test", "practice test", "test series", "exam practice"] },
  { name: "Demo Class", description: "Free introductory class for any subject", price: "0", duration: 60, category: "Free", keywords: ["demo", "free class", "trial", "introductory"] },
];

const SEED_DATA = {
  salon:      { faqs: salonFaqs,      services: salonServices },
  clinic:     { faqs: clinicFaqs,     services: clinicServices },
  gym:        { faqs: gymFaqs,        services: gymServices },
  restaurant: { faqs: restaurantFaqs, services: restaurantServices },
  coaching:   { faqs: coachingFaqs,   services: coachingServices },
};

router.post("/seed", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(req, q.data?.businessId);

  const parsed = SeedBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { businessType } = parsed.data;
  const { faqs, services } = SEED_DATA[businessType];

  let faqsAdded = 0;
  let servicesAdded = 0;

  for (const faq of faqs) {
    const result = await db.insert(faqsTable)
      .values({ question: faq.question, answer: faq.answer, keywords: faq.keywords, active: true, businessId })
      .onConflictDoNothing()
      .returning({ id: faqsTable.id });
    if (result.length > 0) faqsAdded++;
  }

  for (const svc of services) {
    const result = await db.insert(servicesTable)
      .values({ name: svc.name, description: svc.description, price: svc.price ?? undefined, duration: svc.duration ?? undefined, category: svc.category, keywords: svc.keywords, active: true, businessId })
      .onConflictDoNothing()
      .returning({ id: servicesTable.id });
    if (result.length > 0) servicesAdded++;
  }

  res.json({ businessType, businessId, faqsAdded, servicesAdded });
});

export default router;
