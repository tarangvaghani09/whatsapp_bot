import { and, eq, isNotNull, isNull, lte } from "drizzle-orm";
import { db, bookingsTable, botMessagesTable, businessesTable, customersTable, settingsTable } from "@workspace/db";
import { logger } from "./logger";
import { decryptSecret } from "./secrets";
import { sendWhatsAppMessage, type BusinessCreds } from "./whatsapp";
import { formatDisplayTime, parseAppointmentDateTime } from "./appointment-time";

let timer: NodeJS.Timeout | null = null;
let running = false;

function buildReminderMessage(params: {
  template?: string | null;
  dateText: string;
  timeText: string;
  serviceText: string;
  businessName: string;
}): string {
  const { template, dateText, timeText, serviceText, businessName } = params;
  const trimmed = template?.trim();
  if (!trimmed) {
    return `Reminder: your appointment is on ${dateText} at ${timeText} for ${serviceText}. Reply if you need to reschedule.`;
  }
  return trimmed
    .replaceAll("{date}", dateText)
    .replaceAll("{time}", timeText)
    .replaceAll("{service}", serviceText)
    .replaceAll("{businessName}", businessName);
}

async function processDueReminders(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const due = await db
      .select({
        id: bookingsTable.id,
        businessId: bookingsTable.businessId,
        customerId: bookingsTable.customerId,
        service: bookingsTable.service,
        requestedDate: bookingsTable.requestedDate,
        requestedTime: bookingsTable.requestedTime,
        reminderAt: bookingsTable.reminderAt,
      })
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.status, "approved"),
          isNotNull(bookingsTable.reminderAt),
          isNull(bookingsTable.reminderSentAt),
          lte(bookingsTable.reminderAt, new Date()),
        ),
      )
      .limit(100);

    for (const booking of due) {
      try {
        const [customer] = await db
          .select()
          .from(customersTable)
          .where(and(eq(customersTable.id, booking.customerId), eq(customersTable.businessId, booking.businessId)))
          .limit(1);
        const [business] = await db
          .select()
          .from(businessesTable)
          .where(eq(businessesTable.id, booking.businessId))
          .limit(1);
        const [settings] = await db
          .select()
          .from(settingsTable)
          .where(eq(settingsTable.businessId, booking.businessId))
          .limit(1);

        if (!customer?.phone || !business) {
          await db.update(bookingsTable).set({ reminderSentAt: new Date() }).where(eq(bookingsTable.id, booking.id));
          continue;
        }

        const appt = parseAppointmentDateTime(booking.requestedDate, booking.requestedTime);
        const timeText = appt ? formatDisplayTime(appt) : (booking.requestedTime ?? "your scheduled time");
        const dateText = booking.requestedDate ?? "today";
        const serviceText = booking.service ?? "your service";
        const message = buildReminderMessage({
          template: settings?.reminderMessageTemplate,
          dateText,
          timeText,
          serviceText,
          businessName: business.name,
        });

        const creds: BusinessCreds | undefined =
          business.whatsappPhoneNumberId && business.whatsappAccessToken
            ? { phoneNumberId: business.whatsappPhoneNumberId, accessToken: decryptSecret(business.whatsappAccessToken)! }
            : undefined;

        await sendWhatsAppMessage(customer.phone, message, creds);
        await db.insert(botMessagesTable).values({
          customerId: customer.id,
          businessId: booking.businessId,
          direction: "outbound",
          content: message,
          replyType: "booking",
        });
        await db.update(bookingsTable).set({ reminderSentAt: new Date() }).where(eq(bookingsTable.id, booking.id));
      } catch (err) {
        logger.error({ err, bookingId: booking.id }, "Failed to send booking reminder");
      }
    }
  } catch (err) {
    logger.error({ err }, "Booking reminder worker failed");
  } finally {
    running = false;
  }
}

export function startBookingReminderWorker(): void {
  if (timer) return;
  timer = setInterval(() => {
    void processDueReminders();
  }, 60_000);
  void processDueReminders();
  logger.info("Booking reminder worker started");
}
