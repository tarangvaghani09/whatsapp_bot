import {
  db,
  customersTable,
  botMessagesTable,
  bookingsTable,
  aiUsageTable,
  settingsTable,
  businessesTable,
} from "@workspace/db";
import { and, eq, inArray, count } from "drizzle-orm";

type BizType = "salon" | "clinic" | "gym" | "restaurant" | "coaching";

type Profile = {
  type: BizType;
  displayType: string;
  customers: { phone: string; name: string }[];
  services: string[];
  aiPrompt: string;
  aiResponse: string;
};

const PROFILES: Record<BizType, Profile> = {
  salon: {
    type: "salon",
    displayType: "Hair Salon / Beauty",
    customers: [
      { phone: "+1-555-1101", name: "Sarah Johnson" },
      { phone: "+1-555-1102", name: "Priya Patel" },
      { phone: "+1-555-1103", name: "Emma Davis" },
      { phone: "+1-555-1104", name: "Aisha Mohammed" },
      { phone: "+1-555-1105", name: "Carlos Rivera" },
      { phone: "+1-555-1106", name: "Olivia Brown" },
      { phone: "+1-555-1107", name: "Mia Garcia" },
      { phone: "+1-555-1108", name: "James Wilson" },
    ],
    services: ["Haircut (Women)", "Hair Spa", "Bridal Package", "Keratin Treatment", "Pedicure"],
    aiPrompt: "Can you suggest a hair color for wheatish skin tone?",
    aiResponse: "Yes. Caramel brown and warm chestnut shades usually look great for wheatish tones.",
  },
  clinic: {
    type: "clinic",
    displayType: "Medical Clinic",
    customers: [
      { phone: "+1-555-2101", name: "Michael Chen" },
      { phone: "+1-555-2102", name: "Robert Taylor" },
      { phone: "+1-555-2103", name: "Patricia Allen" },
      { phone: "+1-555-2104", name: "William White" },
      { phone: "+1-555-2105", name: "David Harris" },
      { phone: "+1-555-2106", name: "Grace Lee" },
      { phone: "+1-555-2107", name: "Nora Scott" },
      { phone: "+1-555-2108", name: "Kevin Murphy" },
    ],
    services: ["General Consultation", "Blood Test (Basic Panel)", "Teleconsultation", "ECG", "Specialist Consultation"],
    aiPrompt: "I have mild fever and sore throat for 2 days. What should I do?",
    aiResponse: "Please stay hydrated, rest, and book a consultation if symptoms persist or worsen.",
  },
  gym: {
    type: "gym",
    displayType: "Gym / Fitness",
    customers: [
      { phone: "+1-555-3101", name: "Noah Scott" },
      { phone: "+1-555-3102", name: "Liam Green" },
      { phone: "+1-555-3103", name: "Ethan Baker" },
      { phone: "+1-555-3104", name: "Aiden Perez" },
      { phone: "+1-555-3105", name: "Lucas Carter" },
      { phone: "+1-555-3106", name: "Ryan Bell" },
      { phone: "+1-555-3107", name: "Mason Adams" },
      { phone: "+1-555-3108", name: "Owen Turner" },
    ],
    services: ["Monthly Membership", "Personal Training (1 session)", "Yoga Class", "HIIT Class", "Spin Class"],
    aiPrompt: "Can I lose belly fat with only cardio?",
    aiResponse: "Best results come from combining cardio, strength training, and a calorie-controlled diet.",
  },
  restaurant: {
    type: "restaurant",
    displayType: "Restaurant",
    customers: [
      { phone: "+1-555-4101", name: "Lily Phillips" },
      { phone: "+1-555-4102", name: "Hannah Campbell" },
      { phone: "+1-555-4103", name: "Zoe Evans" },
      { phone: "+1-555-4104", name: "Natalie Edwards" },
      { phone: "+1-555-4105", name: "Elena Stewart" },
      { phone: "+1-555-4106", name: "Scarlett Morris" },
      { phone: "+1-555-4107", name: "Victoria Sanchez" },
      { phone: "+1-555-4108", name: "Aria Collins" },
    ],
    services: ["Table Reservation (2 people)", "Table Reservation (4+ people)", "Home Delivery", "Dinner For Two", "Private Dining Room"],
    aiPrompt: "Can you suggest a vegetarian dinner combo for 3 people?",
    aiResponse: "Try grilled veggie platter, paneer tikka, garlic rice, and two fresh lime sodas.",
  },
  coaching: {
    type: "coaching",
    displayType: "Coaching / Tuition",
    customers: [
      { phone: "+1-555-5101", name: "Daniel Rogers" },
      { phone: "+1-555-5102", name: "Matthew Reed" },
      { phone: "+1-555-5103", name: "Andrew Cook" },
      { phone: "+1-555-5104", name: "Joshua Morgan" },
      { phone: "+1-555-5105", name: "George Rivera" },
      { phone: "+1-555-5106", name: "Edward Cooper" },
      { phone: "+1-555-5107", name: "Brian Bailey" },
      { phone: "+1-555-5108", name: "Ronald Richardson" },
    ],
    services: ["Math Coaching (Group)", "English / IELTS Prep", "Programming / Coding", "One-on-One Tutoring (1 hr)", "Mock Test Package"],
    aiPrompt: "Which course is best for improving spoken English quickly?",
    aiResponse: "English/IELTS Prep plus weekly speaking drills is the fastest path for fluency.",
  },
};

function getTypeFromBusinessName(name: string): BizType {
  const n = name.toLowerCase();
  if (n.includes("salon")) return "salon";
  if (n.includes("clinic")) return "clinic";
  if (n.includes("gym") || n.includes("fitness")) return "gym";
  if (n.includes("restaurant")) return "restaurant";
  return "coaching";
}

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

async function ensureSettings(businessId: number, businessName: string, profile: Profile) {
  await db
    .insert(settingsTable)
    .values({
      businessId,
      businessName,
      businessType: profile.displayType,
      phone: "+1-555-0101",
      email: `hello+${profile.type}@example.com`,
      address: "45 Main Street, City Center",
      website: "https://example.com",
      openingHours: "Mon-Sat 9am-8pm, Sun 10am-6pm",
      description: `${businessName} sample seeded data for local testing`,
      currency: "USD",
    })
    .onConflictDoNothing();
}

async function ensureCustomers(businessId: number, profile: Profile) {
  for (const c of profile.customers) {
    await db
      .insert(customersTable)
      .values({ businessId, phone: c.phone, name: c.name })
      .onConflictDoUpdate({
        target: [customersTable.businessId, customersTable.phone],
        set: { name: c.name },
      });
  }

  const rows = await db
    .select({ id: customersTable.id, name: customersTable.name, phone: customersTable.phone })
    .from(customersTable)
    .where(and(eq(customersTable.businessId, businessId), inArray(customersTable.phone, profile.customers.map((c) => c.phone))));

  const map = new Map(rows.map((r) => [r.phone, r]));
  return profile.customers.map((c) => map.get(c.phone)).filter(Boolean) as { id: number; name: string; phone: string }[];
}

function buildMessages(customers: { id: number; name: string }[], businessId: number, profile: Profile, businessName: string) {
  const [c1, c2, c3, c4, c5, c6, c7, c8] = customers;
  return [
    { customerId: c1.id, businessId, direction: "inbound" as const, content: `Hi, what are your timings for ${businessName}?`, replyType: "faq" as const, createdAt: hoursAgo(48) },
    { customerId: c1.id, businessId, direction: "outbound" as const, content: `Thanks for contacting ${businessName}. We're open daily with flexible slots.`, replyType: "faq" as const, createdAt: hoursAgo(47.9) },

    { customerId: c2.id, businessId, direction: "inbound" as const, content: `I want to book ${profile.services[0]}`, replyType: "booking" as const, createdAt: hoursAgo(30) },
    { customerId: c2.id, businessId, direction: "outbound" as const, content: `Great! Your request for ${profile.services[0]} is noted. We'll confirm shortly.`, replyType: "booking" as const, createdAt: hoursAgo(29.9) },

    { customerId: c3.id, businessId, direction: "inbound" as const, content: `How much is ${profile.services[1]}?`, replyType: "service" as const, createdAt: hoursAgo(24) },
    { customerId: c3.id, businessId, direction: "outbound" as const, content: `${profile.services[1]} pricing depends on slot and package. We can share details right away.`, replyType: "service" as const, createdAt: hoursAgo(23.9) },

    { customerId: c4.id, businessId, direction: "inbound" as const, content: profile.aiPrompt, replyType: "ai" as const, createdAt: hoursAgo(18) },
    { customerId: c4.id, businessId, direction: "outbound" as const, content: profile.aiResponse, replyType: "ai" as const, createdAt: hoursAgo(17.9) },

    { customerId: c5.id, businessId, direction: "inbound" as const, content: `Do you have any offers for ${profile.services[2]}?`, replyType: "faq" as const, createdAt: hoursAgo(12) },
    { customerId: c5.id, businessId, direction: "outbound" as const, content: `Yes, we often run offers. We can share current discounts for ${profile.services[2]}.`, replyType: "faq" as const, createdAt: hoursAgo(11.9) },

    { customerId: c6.id, businessId, direction: "inbound" as const, content: `Please book ${profile.services[3]} for tomorrow`, replyType: "booking" as const, createdAt: hoursAgo(7) },
    { customerId: c6.id, businessId, direction: "outbound" as const, content: `Done. Booking request for ${profile.services[3]} is submitted.`, replyType: "booking" as const, createdAt: hoursAgo(6.9) },

    { customerId: c7.id, businessId, direction: "inbound" as const, content: `Where is ${businessName} located?`, replyType: "faq" as const, createdAt: hoursAgo(3) },
    { customerId: c7.id, businessId, direction: "outbound" as const, content: `${businessName} is located at 45 Main Street, City Center.`, replyType: "faq" as const, createdAt: hoursAgo(2.9) },

    { customerId: c8.id, businessId, direction: "inbound" as const, content: `Can I get details for ${profile.services[4]}?`, replyType: "service" as const, createdAt: hoursAgo(1) },
    { customerId: c8.id, businessId, direction: "outbound" as const, content: `Sure. ${profile.services[4]} details are available. Reply with your preferred date.`, replyType: "service" as const, createdAt: hoursAgo(0.9) },

    // extra recent outbound to mirror broadcast history
    { customerId: c1.id, businessId, direction: "outbound" as const, content: `Hi ${c1.name}! Special update from ${businessName}.`, replyType: "broadcast" as const, createdAt: hoursAgo(0.3) },
    { customerId: c3.id, businessId, direction: "outbound" as const, content: `Hi ${c3.name}! New offer available at ${businessName}.`, replyType: "broadcast" as const, createdAt: hoursAgo(0.2) },
  ];
}

function buildBookings(customers: { id: number }[], businessId: number, profile: Profile) {
  const [c1, c2, c3, c4, c5] = customers;
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  return [
    { customerId: c1.id, businessId, service: profile.services[0], requestedDate: tomorrow.toISOString().split("T")[0], requestedTime: "11:00 AM", status: "pending" as const },
    { customerId: c2.id, businessId, service: profile.services[1], requestedDate: nextWeek.toISOString().split("T")[0], requestedTime: "10:00 AM", status: "approved" as const },
    { customerId: c3.id, businessId, service: profile.services[2], requestedDate: tomorrow.toISOString().split("T")[0], requestedTime: "03:00 PM", status: "pending" as const },
    { customerId: c4.id, businessId, service: profile.services[3], requestedDate: tomorrow.toISOString().split("T")[0], requestedTime: "02:00 PM", status: "approved" as const },
    { customerId: c5.id, businessId, service: profile.services[4], requestedDate: nextWeek.toISOString().split("T")[0], requestedTime: "01:00 PM", status: "pending" as const },
  ];
}

function buildAiUsage(customers: { id: number }[], businessId: number, profile: Profile) {
  return [
    {
      customerId: customers[3]!.id,
      businessId,
      prompt: profile.aiPrompt,
      response: profile.aiResponse,
      promptTokens: 55,
      completionTokens: 62,
      totalTokens: 117,
      estimatedCost: "0.000071",
      createdAt: hoursAgo(18),
    },
    {
      customerId: customers[5]!.id,
      businessId,
      prompt: `Can you suggest best option in ${profile.services[1]}?`,
      response: `Sure. ${profile.services[1]} is popular for first-time customers.`,
      promptTokens: 41,
      completionTokens: 39,
      totalTokens: 80,
      estimatedCost: "0.000048",
      createdAt: hoursAgo(7),
    },
  ];
}

async function seedBusiness(businessId: number, businessName: string) {
  const profile = PROFILES[getTypeFromBusinessName(businessName)];
  await ensureSettings(businessId, businessName, profile);

  const customers = await ensureCustomers(businessId, profile);
  if (customers.length < 8) {
    console.log(`  Skipping business ${businessId}: could not ensure sample customers.`);
    return;
  }

  const [{ value: messageCount }] = await db
    .select({ value: count() })
    .from(botMessagesTable)
    .where(eq(botMessagesTable.businessId, businessId));

  const [{ value: bookingCount }] = await db
    .select({ value: count() })
    .from(bookingsTable)
    .where(eq(bookingsTable.businessId, businessId));

  const [{ value: aiCount }] = await db
    .select({ value: count() })
    .from(aiUsageTable)
    .where(eq(aiUsageTable.businessId, businessId));

  let addedMessages = 0;
  let addedBookings = 0;
  let addedAi = 0;

  if (messageCount === 0) {
    const messages = buildMessages(customers, businessId, profile, businessName);
    await db.insert(botMessagesTable).values(messages);
    addedMessages = messages.length;
  }

  if (bookingCount === 0) {
    const bookings = buildBookings(customers, businessId, profile);
    await db.insert(bookingsTable).values(bookings);
    addedBookings = bookings.length;
  }

  if (aiCount === 0) {
    const aiLogs = buildAiUsage(customers, businessId, profile);
    await db.insert(aiUsageTable).values(aiLogs);
    addedAi = aiLogs.length;
  }

  console.log(`  business ${businessId} (${profile.type}): customers upserted, +${addedMessages} messages, +${addedBookings} bookings, +${addedAi} ai logs`);
}

async function main() {
  console.log("\nSeeding business-specific sample data for ALL businesses (add-only)...\n");

  const businesses = await db
    .select({ id: businessesTable.id, name: businessesTable.name })
    .from(businessesTable)
    .orderBy(businessesTable.id);

  if (businesses.length === 0) {
    const [created] = await db
      .insert(businessesTable)
      .values({ name: "My Business" })
      .returning({ id: businessesTable.id, name: businessesTable.name });
    businesses.push(created);
  }

  for (const b of businesses) {
    await seedBusiness(b.id, b.name);
  }

  console.log("\nDone. Business-specific sample data ensured for all businesses.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Sample seed failed:", err);
  process.exit(1);
});
