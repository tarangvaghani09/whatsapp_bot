import { db, customersTable, botMessagesTable, bookingsTable, aiUsageTable, settingsTable, businessesTable } from "@workspace/db";
async function resolveBusinessId() {
    const envId = process.env.BUSINESS_ID ? parseInt(process.env.BUSINESS_ID, 10) : NaN;
    if (!isNaN(envId)) {
        console.log(`Using BUSINESS_ID=${envId} from environment`);
        return envId;
    }
    const [existing] = await db
        .select({ id: businessesTable.id })
        .from(businessesTable)
        .orderBy(businessesTable.id)
        .limit(1);
    if (existing) {
        console.log(`Using first existing business id=${existing.id}`);
        return existing.id;
    }
    const [created] = await db
        .insert(businessesTable)
        .values({ name: "My Business" })
        .returning({ id: businessesTable.id });
    console.log(`Created default business id=${created.id}`);
    return created.id;
}
async function seedSample() {
    console.log("\n🌱 Seeding sample customers, bookings, messages & AI usage...\n");
    const businessId = await resolveBusinessId();
    // ─── Settings ────────────────────────────────────────────────────────────────
    await db.insert(settingsTable).values({
        businessId,
        businessName: "Glamour Studio",
        businessType: "Hair Salon / Beauty",
        phone: "+1-555-0101",
        email: "hello@glamourstudio.com",
        address: "45 Main Street, City Center",
        website: "https://glamourstudio.com",
        openingHours: "Mon–Sat 9am–8pm, Sun 10am–6pm",
        description: "Premium hair salon and beauty studio serving the city since 2010.",
        currency: "USD",
    }).onConflictDoNothing();
    console.log("✅ Settings done");
    // ─── Customers ───────────────────────────────────────────────────────────────
    const customerData = [
        { phone: "+1-555-1001", name: "Sarah Johnson", businessId },
        { phone: "+1-555-1002", name: "Michael Chen", businessId },
        { phone: "+1-555-1003", name: "Priya Patel", businessId },
        { phone: "+1-555-1004", name: "James Wilson", businessId },
        { phone: "+1-555-1005", name: "Emma Davis", businessId },
        { phone: "+1-555-1006", name: "Carlos Rivera", businessId },
        { phone: "+1-555-1007", name: "Aisha Mohammed", businessId },
        { phone: "+1-555-1008", name: "Thomas Lee", businessId },
    ];
    const insertedCustomers = await db
        .insert(customersTable)
        .values(customerData)
        .onConflictDoNothing()
        .returning();
    console.log(`✅ ${insertedCustomers.length} customers done`);
    if (insertedCustomers.length === 0) {
        console.log("⚠️  Customers already exist — skipping messages/bookings seed");
        process.exit(0);
    }
    const [sarah, michael, priya, james, emma, carlos, aisha, thomas] = insertedCustomers;
    // ─── Bot Messages ─────────────────────────────────────────────────────────────
    const now = new Date();
    const hoursAgo = (h) => new Date(now.getTime() - h * 60 * 60 * 1000);
    const messages = [
        // Sarah — asked about hours (FAQ match)
        { customerId: sarah.id, businessId, direction: "inbound", content: "Hi, what are your opening hours?", replyType: "faq", createdAt: hoursAgo(48) },
        { customerId: sarah.id, businessId, direction: "outbound", content: "We are open Monday to Saturday, 9:00 AM – 8:00 PM, and Sunday 10:00 AM – 6:00 PM.", replyType: "faq", createdAt: hoursAgo(47.9) },
        { customerId: sarah.id, businessId, direction: "inbound", content: "I'd like to book a haircut for Saturday", replyType: "booking", createdAt: hoursAgo(47) },
        { customerId: sarah.id, businessId, direction: "outbound", content: "I've noted your booking request for a haircut on Saturday. Our team will confirm shortly!", replyType: "booking", createdAt: hoursAgo(46.9) },
        // Michael — asked about pricing (service match)
        { customerId: michael.id, businessId, direction: "inbound", content: "How much does a keratin treatment cost?", replyType: "service", createdAt: hoursAgo(36) },
        { customerId: michael.id, businessId, direction: "outbound", content: "Our Keratin Treatment is $150 and takes about 120 minutes. It's a smoothing treatment for silky hair. Would you like to book?", replyType: "service", createdAt: hoursAgo(35.9) },
        { customerId: michael.id, businessId, direction: "inbound", content: "Do you use organic products?", replyType: "ai", createdAt: hoursAgo(35) },
        { customerId: michael.id, businessId, direction: "outbound", content: "Yes! We use a range of premium organic and eco-friendly products. We can recommend specific products based on your hair type during your visit.", replyType: "ai", createdAt: hoursAgo(34.9) },
        // Priya — booking
        { customerId: priya.id, businessId, direction: "inbound", content: "I want to book a bridal package for next month", replyType: "booking", createdAt: hoursAgo(24) },
        { customerId: priya.id, businessId, direction: "outbound", content: "Wonderful! Our Bridal Package includes complete bridal makeup and hair styling at $300 for 3 hours. I've logged your request. Our team will call to confirm the date.", replyType: "booking", createdAt: hoursAgo(23.9) },
        // James — location FAQ
        { customerId: james.id, businessId, direction: "inbound", content: "Where is your salon?", replyType: "faq", createdAt: hoursAgo(20) },
        { customerId: james.id, businessId, direction: "outbound", content: "We are located at 45 Main Street, City Center. Easy parking available. Landmark: next to the post office.", replyType: "faq", createdAt: hoursAgo(19.9) },
        // Emma — multiple questions
        { customerId: emma.id, businessId, direction: "inbound", content: "Do you have any offers?", replyType: "faq", createdAt: hoursAgo(15) },
        { customerId: emma.id, businessId, direction: "outbound", content: "We offer 20% off on your first visit! We also have special weekend packages. Ask our staff for current offers.", replyType: "faq", createdAt: hoursAgo(14.9) },
        { customerId: emma.id, businessId, direction: "inbound", content: "What's included in the hair spa?", replyType: "service", createdAt: hoursAgo(14) },
        { customerId: emma.id, businessId, direction: "outbound", content: "Our Hair Spa ($45, 60 min) is a deep conditioning treatment that nourishes and revitalizes your hair. Perfect for damaged or dry hair!", replyType: "service", createdAt: hoursAgo(13.9) },
        // Carlos — AI fallback
        { customerId: carlos.id, businessId, direction: "inbound", content: "Can I get a consultation before deciding on a hair color?", replyType: "ai", createdAt: hoursAgo(10) },
        { customerId: carlos.id, businessId, direction: "outbound", content: "Absolutely! We offer free color consultations with our senior stylists. Just walk in or book a 15-min slot. Our stylists will assess your hair and recommend the best shades for you.", replyType: "ai", createdAt: hoursAgo(9.9) },
        // Aisha — recent
        { customerId: aisha.id, businessId, direction: "inbound", content: "Do you accept walk-ins?", replyType: "faq", createdAt: hoursAgo(5) },
        { customerId: aisha.id, businessId, direction: "outbound", content: "Yes, we do accept walk-ins depending on availability! To avoid waiting, we recommend booking in advance.", replyType: "faq", createdAt: hoursAgo(4.9) },
        // Thomas — very recent
        { customerId: thomas.id, businessId, direction: "inbound", content: "What payment methods do you accept?", replyType: "faq", createdAt: hoursAgo(1) },
        { customerId: thomas.id, businessId, direction: "outbound", content: "We accept cash, all major credit/debit cards, and mobile payments (Apple Pay, Google Pay).", replyType: "faq", createdAt: hoursAgo(0.9) },
        { customerId: thomas.id, businessId, direction: "inbound", content: "book pedicure tomorrow at 3pm", replyType: "booking", createdAt: hoursAgo(0.5) },
        { customerId: thomas.id, businessId, direction: "outbound", content: "Your pedicure booking request for tomorrow at 3:00 PM has been received! We'll confirm shortly.", replyType: "booking", createdAt: hoursAgo(0.4) },
    ];
    await db.insert(botMessagesTable).values(messages);
    console.log(`✅ ${messages.length} messages done`);
    // ─── Bookings ─────────────────────────────────────────────────────────────────
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const bookings = [
        { customerId: sarah.id, businessId, service: "Haircut (Women)", requestedDate: tomorrow.toISOString().split("T")[0], requestedTime: "11:00 AM", status: "pending" },
        { customerId: priya.id, businessId, service: "Bridal Package", requestedDate: nextWeek.toISOString().split("T")[0], requestedTime: "10:00 AM", notes: "Full bridal makeup + hair styling", status: "approved" },
        { customerId: thomas.id, businessId, service: "Pedicure", requestedDate: tomorrow.toISOString().split("T")[0], requestedTime: "3:00 PM", status: "pending" },
        { customerId: emma.id, businessId, service: "Hair Spa", requestedDate: tomorrow.toISOString().split("T")[0], requestedTime: "2:00 PM", status: "approved" },
        { customerId: michael.id, businessId, service: "Keratin Treatment", requestedDate: nextWeek.toISOString().split("T")[0], requestedTime: "1:00 PM", status: "pending" },
    ];
    await db.insert(bookingsTable).values(bookings);
    console.log(`✅ ${bookings.length} bookings done`);
    // ─── AI Usage ─────────────────────────────────────────────────────────────────
    const aiLogs = [
        {
            customerId: michael.id,
            businessId,
            prompt: "Do you use organic products?",
            response: "Yes! We use a range of premium organic and eco-friendly products.",
            promptTokens: 42,
            completionTokens: 38,
            totalTokens: 80,
            estimatedCost: "0.000048",
            createdAt: hoursAgo(35),
        },
        {
            customerId: carlos.id,
            businessId,
            prompt: "Can I get a consultation before deciding on a hair color?",
            response: "Absolutely! We offer free color consultations with our senior stylists.",
            promptTokens: 55,
            completionTokens: 61,
            totalTokens: 116,
            estimatedCost: "0.000070",
            createdAt: hoursAgo(10),
        },
    ];
    await db.insert(aiUsageTable).values(aiLogs);
    console.log(`✅ ${aiLogs.length} AI usage records done`);
    console.log("\n🎉 Sample data seeded! Dashboard is ready to explore.\n");
    process.exit(0);
}
seedSample().catch((err) => {
    console.error("Sample seed failed:", err);
    process.exit(1);
});
