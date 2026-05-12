import { db, customersTable, bookingsTable, botMessagesTable, businessesTable } from "@workspace/db";
// ─── CUSTOMER DATA PER BUSINESS TYPE ─────────────────────────────────────────
const salonCustomers = [
    { phone: "+12025550101", name: "Emma Johnson" },
    { phone: "+12025550102", name: "Sophia Williams" },
    { phone: "+12025550103", name: "Olivia Brown" },
    { phone: "+12025550104", name: "Ava Davis" },
    { phone: "+12025550105", name: "Isabella Martinez" },
    { phone: "+12025550106", name: "Mia Garcia" },
    { phone: "+12025550107", name: "Charlotte Wilson" },
    { phone: "+12025550108", name: "Amelia Anderson" },
    { phone: "+12025550109", name: "Harper Thomas" },
    { phone: "+12025550110", name: "Evelyn Jackson" },
];
const clinicCustomers = [
    { phone: "+13105550201", name: "James Miller" },
    { phone: "+13105550202", name: "Robert Taylor" },
    { phone: "+13105550203", name: "Michael Moore" },
    { phone: "+13105550204", name: "William White" },
    { phone: "+13105550205", name: "David Harris" },
    { phone: "+13105550206", name: "Richard Clark" },
    { phone: "+13105550207", name: "Joseph Lewis" },
    { phone: "+13105550208", name: "Thomas Walker" },
    { phone: "+13105550209", name: "Charles Hall" },
    { phone: "+13105550210", name: "Patricia Allen" },
];
const gymCustomers = [
    { phone: "+17185550301", name: "Noah Scott" },
    { phone: "+17185550302", name: "Liam Green" },
    { phone: "+17185550303", name: "Mason Adams" },
    { phone: "+17185550304", name: "Ethan Baker" },
    { phone: "+17185550305", name: "Logan Nelson" },
    { phone: "+17185550306", name: "Lucas Carter" },
    { phone: "+17185550307", name: "Jackson Mitchell" },
    { phone: "+17185550308", name: "Aiden Perez" },
    { phone: "+17185550309", name: "Caden Roberts" },
    { phone: "+17185550310", name: "Owen Turner" },
];
const restaurantCustomers = [
    { phone: "+13055550401", name: "Lily Phillips" },
    { phone: "+13055550402", name: "Hannah Campbell" },
    { phone: "+13055550403", name: "Grace Parker" },
    { phone: "+13055550404", name: "Zoe Evans" },
    { phone: "+13055550405", name: "Natalie Edwards" },
    { phone: "+13055550406", name: "Aria Collins" },
    { phone: "+13055550407", name: "Elena Stewart" },
    { phone: "+13055550408", name: "Victoria Sanchez" },
    { phone: "+13055550409", name: "Scarlett Morris" },
];
const coachingCustomers = [
    { phone: "+14155550501", name: "Daniel Rogers" },
    { phone: "+14155550502", name: "Matthew Reed" },
    { phone: "+14155550503", name: "Andrew Cook" },
    { phone: "+14155550504", name: "Joshua Morgan" },
    { phone: "+14155550505", name: "Ryan Bell" },
    { phone: "+14155550506", name: "Kevin Murphy" },
    { phone: "+14155550507", name: "Brian Bailey" },
    { phone: "+14155550508", name: "George Rivera" },
    { phone: "+14155550509", name: "Edward Cooper" },
    { phone: "+14155550510", name: "Ronald Richardson" },
];
// ─── BOOKING DATA PER BUSINESS TYPE ──────────────────────────────────────────
const salonBookings = [
    { service: "Haircut (Women)", date: "2026-05-15", time: "10:00", status: "approved", notes: "Please use natural products only" },
    { service: "Hair Coloring", date: "2026-05-16", time: "11:30", status: "pending", notes: "Balayage in light brown" },
    { service: "Keratin Treatment", date: "2026-05-17", time: "09:00", status: "pending", notes: null },
    { service: "Facial", date: "2026-05-18", time: "14:00", status: "approved", notes: "Sensitive skin" },
    { service: "Bridal Package", date: "2026-06-01", time: "08:00", status: "approved", notes: "Wedding day — very important!" },
    { service: "Manicure", date: "2026-05-14", time: "15:00", status: "rejected", notes: null },
    { service: "Hair Spa", date: "2026-05-20", time: "13:00", status: "pending", notes: "Dry and damaged hair" },
    { service: "Pedicure", date: "2026-05-19", time: "16:00", status: "approved", notes: null },
    { service: "Waxing (Full Body)", date: "2026-05-21", time: "11:00", status: "pending", notes: null },
    { service: "Haircut (Men)", date: "2026-05-13", time: "10:30", status: "rejected", notes: "Fade cut" },
];
const clinicBookings = [
    { service: "General Consultation", date: "2026-05-15", time: "09:00", status: "approved", notes: "Follow-up for blood pressure" },
    { service: "Full Body Checkup", date: "2026-05-16", time: "08:30", status: "pending", notes: "Annual checkup" },
    { service: "Blood Test (Basic Panel)", date: "2026-05-17", time: "07:30", status: "approved", notes: "Fasting required" },
    { service: "Teleconsultation", date: "2026-05-18", time: "14:00", status: "pending", notes: "Skin rash query" },
    { service: "ECG", date: "2026-05-19", time: "10:00", status: "approved", notes: null },
    { service: "Physiotherapy Session", date: "2026-05-20", time: "11:00", status: "pending", notes: "Lower back pain" },
    { service: "Dental Checkup", date: "2026-05-21", time: "09:30", status: "rejected", notes: null },
    { service: "Eye Examination", date: "2026-05-22", time: "15:00", status: "pending", notes: "Blurry vision" },
    { service: "Vaccination", date: "2026-05-13", time: "08:00", status: "approved", notes: "Flu shot" },
    { service: "Specialist Consultation", date: "2026-05-14", time: "16:00", status: "rejected", notes: "Referred by GP" },
];
const gymBookings = [
    { service: "Personal Training (1 session)", date: "2026-05-15", time: "07:00", status: "approved", notes: "Weight loss focus" },
    { service: "Yoga Class", date: "2026-05-16", time: "08:00", status: "approved", notes: null },
    { service: "HIIT Class", date: "2026-05-17", time: "06:30", status: "pending", notes: "First time attending" },
    { service: "Spin Class", date: "2026-05-18", time: "09:00", status: "approved", notes: null },
    { service: "Personal Training (1 session)", date: "2026-05-19", time: "07:00", status: "pending", notes: "Muscle building program" },
    { service: "Zumba Class", date: "2026-05-20", time: "18:00", status: "pending", notes: null },
    { service: "Yoga Class", date: "2026-05-21", time: "08:00", status: "rejected", notes: null },
    { service: "Personal Training (10 sessions)", date: "2026-05-14", time: "07:00", status: "approved", notes: "Marathon training" },
    { service: "HIIT Class", date: "2026-05-22", time: "06:30", status: "pending", notes: null },
];
const restaurantBookings = [
    { service: "Table Reservation (4+ people)", date: "2026-05-15", time: "19:00", status: "approved", notes: "Birthday dinner — need a cake" },
    { service: "Table Reservation (2 people)", date: "2026-05-16", time: "20:00", status: "approved", notes: "Anniversary dinner" },
    { service: "Private Dining Room", date: "2026-05-17", time: "18:30", status: "pending", notes: "Corporate dinner for 10 guests" },
    { service: "Dinner For Two", date: "2026-05-18", time: "19:30", status: "pending", notes: "Proposal dinner — need candles" },
    { service: "Table Reservation (4+ people)", date: "2026-05-20", time: "13:00", status: "approved", notes: "Family lunch, 6 adults 2 kids" },
    { service: "Cooking Class", date: "2026-05-21", time: "10:00", status: "pending", notes: "Gift for partner" },
    { service: "Table Reservation (2 people)", date: "2026-05-13", time: "20:30", status: "rejected", notes: "Fully booked that night" },
    { service: "Lunch Set Menu", date: "2026-05-22", time: "12:30", status: "pending", notes: null },
];
const coachingBookings = [
    { service: "Demo Class", date: "2026-05-15", time: "10:00", status: "approved", notes: "Interested in IELTS prep" },
    { service: "Math Coaching (Group)", date: "2026-05-16", time: "17:00", status: "approved", notes: "Grade 11 student" },
    { service: "One-on-One Tutoring (1 hr)", date: "2026-05-17", time: "16:00", status: "pending", notes: "SAT math section" },
    { service: "English / IELTS Prep", date: "2026-05-18", time: "18:00", status: "pending", notes: "Target score: 7.5" },
    { service: "Programming / Coding", date: "2026-05-19", time: "17:00", status: "approved", notes: "Absolute beginner" },
    { service: "MBA Entrance (GMAT/GRE)", date: "2026-05-20", time: "09:00", status: "pending", notes: "Test in August" },
    { service: "Science Coaching (Group)", date: "2026-05-21", time: "17:00", status: "rejected", notes: "Batch full" },
    { service: "SAT / ACT Prep", date: "2026-05-22", time: "10:00", status: "pending", notes: "Need intensive prep" },
    { service: "Mock Test Package", date: "2026-05-14", time: "09:00", status: "approved", notes: null },
    { service: "One-on-One Tutoring (1 hr)", date: "2026-05-23", time: "15:00", status: "pending", notes: "Chemistry help" },
];
// ─── MESSAGE TEMPLATES ────────────────────────────────────────────────────────
function makeMessages(customerName, service, status) {
    const name = customerName.split(" ")[0];
    const msgs = [
        { direction: "inbound", content: `Hi, I'd like to book a ${service} please`, replyType: "none" },
        {
            direction: "outbound",
            content: `Hi ${name}! 😊 Great choice! We'd love to book a *${service}* for you.\n\nPlease share your preferred date and time and we'll confirm your slot!`,
            replyType: "booking",
        },
        { direction: "inbound", content: `Can you also tell me about your pricing?`, replyType: "none" },
        {
            direction: "outbound",
            content: `Sure ${name}! Here are our current prices and services — feel free to ask about anything specific! We're happy to help. 😊`,
            replyType: "service",
        },
    ];
    if (status === "approved") {
        msgs.push({
            direction: "outbound",
            content: `✅ *Booking Confirmed!*\n\nYour ${service} booking has been confirmed.\n📅 We look forward to seeing you soon! Reply if you need to reschedule. 😊`,
            replyType: "booking",
        });
    }
    else if (status === "rejected") {
        msgs.push({
            direction: "outbound",
            content: `❌ *Booking Update*\n\nWe're sorry, we're unable to confirm your ${service} booking at this time.\n\nPlease contact us to find a suitable alternative. We'd love to see you! 😊`,
            replyType: "booking",
        });
    }
    return msgs;
}
// ─── MAIN SEED ────────────────────────────────────────────────────────────────
const BUSINESS_DATA = {
    salon: { customers: salonCustomers, bookings: salonBookings },
    clinic: { customers: clinicCustomers, bookings: clinicBookings },
    gym: { customers: gymCustomers, bookings: gymBookings },
    restaurant: { customers: restaurantCustomers, bookings: restaurantBookings },
    coaching: { customers: coachingCustomers, bookings: coachingBookings },
};
async function seedBusiness(businessId, businessName, type) {
    const { customers, bookings } = BUSINESS_DATA[type];
    console.log(`\n  Inserting ${customers.length} customers…`);
    const insertedCustomers = [];
    for (const c of customers) {
        const [row] = await db
            .insert(customersTable)
            .values({ businessId, phone: c.phone, name: c.name })
            .onConflictDoUpdate({
            target: [customersTable.businessId, customersTable.phone],
            set: { name: c.name },
        })
            .returning({ id: customersTable.id, name: customersTable.name });
        if (row)
            insertedCustomers.push({ id: row.id, name: c.name });
    }
    console.log(`  ✅ ${insertedCustomers.length} customers ready`);
    console.log(`  Inserting ${bookings.length} bookings…`);
    let bookingCount = 0;
    for (let i = 0; i < bookings.length; i++) {
        const b = bookings[i];
        const customer = insertedCustomers[i % insertedCustomers.length];
        if (!customer)
            continue;
        const [booking] = await db
            .insert(bookingsTable)
            .values({
            businessId,
            customerId: customer.id,
            service: b.service,
            requestedDate: b.date,
            requestedTime: b.time,
            status: b.status,
            notes: b.notes ?? undefined,
        })
            .returning({ id: bookingsTable.id });
        if (booking) {
            bookingCount++;
            const messages = makeMessages(customer.name, b.service, b.status);
            for (const msg of messages) {
                await db.insert(botMessagesTable).values({
                    businessId,
                    customerId: customer.id,
                    direction: msg.direction,
                    content: msg.content,
                    replyType: msg.replyType,
                });
            }
        }
    }
    console.log(`  ✅ ${bookingCount} bookings + conversation history ready`);
}
async function main() {
    console.log("\n🌱 Seeding customers & bookings for all businesses…\n");
    const businesses = await db.select().from(businessesTable).orderBy(businessesTable.id);
    if (businesses.length === 0) {
        console.error("No businesses found. Run the main seed script first.");
        process.exit(1);
    }
    const typeMap = {
        "Hair Salon": "salon",
        "Medical Clinic": "clinic",
        "Fitness Gym": "gym",
        "Restaurant": "restaurant",
        "Coaching Center": "coaching",
    };
    for (const business of businesses) {
        const type = typeMap[business.name];
        if (!type) {
            console.log(`⚠️  Skipping "${business.name}" — no matching seed data`);
            continue;
        }
        console.log(`\n📋 ${business.name} (id=${business.id})`);
        await seedBusiness(business.id, business.name, type);
    }
    console.log("\n🎉 All done! Customers and bookings seeded for all businesses.\n");
    process.exit(0);
}
main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
