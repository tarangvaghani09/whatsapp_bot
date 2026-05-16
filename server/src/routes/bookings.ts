import { Router, type IRouter } from "express";
import { db, bookingsTable, customersTable, businessesTable, botMessagesTable, settingsTable } from "@workspace/db";
import { eq, and, desc, count, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  ListBookingsQueryParams,
  CreateBookingBody,
  UpdateBookingBody,
  UpdateBookingParams,
  DeleteBookingParams,
} from "@workspace/api-zod";
import { BusinessIdQueryParam, resolveBusinessId } from "../lib/resolve-business";
import { sendWhatsAppMessage, type BusinessCreds } from "../lib/whatsapp";
import { logger } from "../lib/logger";
import { decryptSecret } from "../lib/secrets";
import { parseAppointmentDateTime } from "../lib/appointment-time";

const router: IRouter = Router();

router.get("/bookings", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(req, q.data?.businessId);

  const query = ListBookingsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { page, limit, status } = query.data;
  const offset = (page - 1) * limit;

  const baseConditions = [eq(bookingsTable.businessId, businessId)];
  if (status) baseConditions.push(eq(bookingsTable.status, status as "pending" | "approved" | "rejected" | "completed"));

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: bookingsTable.id,
        customerId: bookingsTable.customerId,
        customerPhone: customersTable.phone,
        customerName: customersTable.name,
        service: bookingsTable.service,
        requestedDate: bookingsTable.requestedDate,
        requestedTime: bookingsTable.requestedTime,
        notes: bookingsTable.notes,
        status: bookingsTable.status,
        rating: bookingsTable.rating,
        ratingAskedAt: bookingsTable.ratingAskedAt,
        createdAt: bookingsTable.createdAt,
        updatedAt: bookingsTable.updatedAt,
      })
      .from(bookingsTable)
      .leftJoin(customersTable, eq(bookingsTable.customerId, customersTable.id))
      .where(and(...baseConditions))
      .orderBy(desc(bookingsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(bookingsTable).where(and(...baseConditions)),
  ]);

  res.json({ bookings: rows, total, page, limit });
});

router.post("/bookings", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(req, q.data?.businessId);

  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.customerId != null) {
    const [customer] = await db
      .select({ id: customersTable.id })
      .from(customersTable)
      .where(and(eq(customersTable.id, parsed.data.customerId), eq(customersTable.businessId, businessId)))
      .limit(1);
    if (!customer) {
      res.status(400).json({ error: "Customer does not belong to this business" });
      return;
    }
  }

  const [booking] = await db.insert(bookingsTable).values({ ...parsed.data, businessId }).returning();
  res.status(201).json(booking);
});

router.patch("/bookings/:id", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(req, q.data?.businessId);

  const params = UpdateBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const setData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "completed") {
    setData.ratingAskedAt = new Date();
  }

  const [booking] = await db.update(bookingsTable).set(setData)
    .where(and(eq(bookingsTable.id, params.data.id), eq(bookingsTable.businessId, businessId)))
    .returning();
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  res.json(booking);

  if (parsed.data.status === "approved" && booking.customerId) {
    try {
      const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.businessId, businessId)).limit(1);
      const apptDateTime = parseAppointmentDateTime(booking.requestedDate, booking.requestedTime);
      const reminderEnabled = settings?.reminderEnabled ?? false;
      const reminderMinutesBefore = settings?.reminderMinutesBefore ?? 60;
      if (reminderEnabled && apptDateTime) {
        const reminderAt = new Date(apptDateTime.getTime() - reminderMinutesBefore * 60 * 1000);
        await db.update(bookingsTable)
          .set({ reminderAt, reminderSentAt: null })
          .where(eq(bookingsTable.id, booking.id));
      }

      const [customer] = await db.select().from(customersTable)
        .where(and(eq(customersTable.id, booking.customerId), eq(customersTable.businessId, businessId))).limit(1);
      const [business] = await db.select().from(businessesTable)
        .where(eq(businessesTable.id, businessId)).limit(1);

      if (customer?.phone && business) {
        const creds: BusinessCreds | undefined =
          business.whatsappPhoneNumberId && business.whatsappAccessToken
            ? { phoneNumberId: business.whatsappPhoneNumberId, accessToken: decryptSecret(business.whatsappAccessToken)! }
            : undefined;

        const ref = `#BK-${String(booking.id).padStart(5, "0")}`;
        const lines = [
          `✅ *Booking Confirmed!*`,
          ``,
          `Your booking has been confirmed. Here are your details:`,
          `📋 Reference: *${ref}*`,
        ];
        if (booking.service) lines.push(`💇 Service: ${booking.service}`);
        if (booking.requestedDate) lines.push(`📅 Date: ${booking.requestedDate}`);
        if (booking.requestedTime) lines.push(`🕐 Time: ${booking.requestedTime}`);
        lines.push(``, `We look forward to seeing you! Reply to this message if you need to reschedule. 😊`);

        const message = lines.join("\n");
        await sendWhatsAppMessage(customer.phone, message, creds);
        await db.insert(botMessagesTable).values({
          customerId: customer.id,
          businessId,
          direction: "outbound",
          content: message,
          replyType: "booking",
        });
        logger.info({ bookingId: booking.id, phone: customer.phone }, "Booking confirmation sent via WhatsApp");
      }
    } catch (err) {
      logger.error({ err, bookingId: booking.id }, "Failed to send booking confirmation WhatsApp");
    }
  }

  if (parsed.data.status === "rejected" && booking.customerId) {
    try {
      const [customer] = await db.select().from(customersTable)
        .where(and(eq(customersTable.id, booking.customerId), eq(customersTable.businessId, businessId))).limit(1);
      const [business] = await db.select().from(businessesTable)
        .where(eq(businessesTable.id, businessId)).limit(1);

      if (customer?.phone && business) {
        const creds: BusinessCreds | undefined =
          business.whatsappPhoneNumberId && business.whatsappAccessToken
            ? { phoneNumberId: business.whatsappPhoneNumberId, accessToken: decryptSecret(business.whatsappAccessToken)! }
            : undefined;

        const ref = `#BK-${String(booking.id).padStart(5, "0")}`;
        const lines = [
          `❌ *Booking Update*`,
          ``,
          `We're sorry, we're unable to confirm your booking at this time.`,
          `📋 Reference: *${ref}*`,
        ];
        if (booking.service) lines.push(`💇 Service: ${booking.service}`);
        if (booking.requestedDate) lines.push(`📅 Requested date: ${booking.requestedDate}`);
        lines.push(``, `We apologise for any inconvenience. Please reply to this message or contact us directly to find a suitable time. We'd love to see you! 😊`);

        const message = lines.join("\n");
        await sendWhatsAppMessage(customer.phone, message, creds);
        await db.insert(botMessagesTable).values({
          customerId: customer.id,
          businessId,
          direction: "outbound",
          content: message,
          replyType: "booking",
        });
        logger.info({ bookingId: booking.id, phone: customer.phone }, "Booking rejection sent via WhatsApp");
      }
    } catch (err) {
      logger.error({ err, bookingId: booking.id }, "Failed to send booking rejection WhatsApp");
    }
  }

  if (parsed.data.status === "completed" && booking.customerId) {
    try {
      const [customer] = await db.select().from(customersTable)
        .where(and(eq(customersTable.id, booking.customerId), eq(customersTable.businessId, businessId))).limit(1);
      const [business] = await db.select().from(businessesTable)
        .where(eq(businessesTable.id, businessId)).limit(1);

      if (customer?.phone && business) {
        const creds: BusinessCreds | undefined =
          business.whatsappPhoneNumberId && business.whatsappAccessToken
            ? { phoneNumberId: business.whatsappPhoneNumberId, accessToken: decryptSecret(business.whatsappAccessToken)! }
            : undefined;

        const name = customer.name?.split(" ")[0] ?? "there";
        const lines = [
          `🎉 *Thank you for visiting us, ${name}!*`,
          ``,
          `We hope you enjoyed your ${booking.service ?? "appointment"}.`,
          ``,
          `⭐ *How was your experience?*`,
          `Please rate us from *1 to 5* — just reply with a number:`,
          `1 = Poor  |  2 = Fair  |  3 = Good  |  4 = Great  |  5 = Excellent`,
          ``,
          `Your feedback helps us serve you better! 🙏`,
        ];

        const message = lines.join("\n");
        await sendWhatsAppMessage(customer.phone, message, creds);
        await db.insert(botMessagesTable).values({
          customerId: customer.id,
          businessId,
          direction: "outbound",
          content: message,
          replyType: "rating",
        });
        logger.info({ bookingId: booking.id, phone: customer.phone }, "Rating request sent via WhatsApp");
      }
    } catch (err) {
      logger.error({ err, bookingId: booking.id }, "Failed to send rating request WhatsApp");
    }
  }
});

const RescheduleBody = z.object({
  requestedDate: z.string().min(1),
  requestedTime: z.string().min(1),
});

router.post("/bookings/:id/reschedule", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(req, q.data?.businessId);

  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid booking id" }); return; }

  const parsed = RescheduleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { requestedDate, requestedTime } = parsed.data;

  const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.businessId, businessId)).limit(1);
  const apptDateTime = parseAppointmentDateTime(requestedDate, requestedTime);
  const reminderEnabled = settings?.reminderEnabled ?? false;
  const reminderMinutesBefore = settings?.reminderMinutesBefore ?? 60;
  const reminderAt = reminderEnabled && apptDateTime
    ? new Date(apptDateTime.getTime() - reminderMinutesBefore * 60 * 1000)
    : null;

  const [booking] = await db.update(bookingsTable)
    .set({ requestedDate, requestedTime, reminderAt, reminderSentAt: null })
    .where(and(eq(bookingsTable.id, id), eq(bookingsTable.businessId, businessId)))
    .returning();

  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  res.json(booking);

  try {
    const [customer] = await db.select().from(customersTable)
      .where(and(eq(customersTable.id, booking.customerId), eq(customersTable.businessId, businessId))).limit(1);
    const [business] = await db.select().from(businessesTable)
      .where(eq(businessesTable.id, businessId)).limit(1);

    if (customer?.phone && business) {
      const creds: BusinessCreds | undefined =
        business.whatsappPhoneNumberId && business.whatsappAccessToken
          ? { phoneNumberId: business.whatsappPhoneNumberId, accessToken: decryptSecret(business.whatsappAccessToken)! }
          : undefined;

      const ref = `#BK-${String(booking.id).padStart(5, "0")}`;
      const lines = [
        `📅 *Booking Rescheduled*`,
        ``,
        `Your booking has been updated to a new date and time:`,
        `📋 Reference: *${ref}*`,
      ];
      if (booking.service) lines.push(`💇 Service: ${booking.service}`);
      lines.push(`📅 New Date: *${requestedDate}*`);
      lines.push(`🕐 New Time: *${requestedTime}*`);
      lines.push(``, `Please reply if this doesn't work for you and we'll find another time. See you soon! 😊`);

      const message = lines.join("\n");
      await sendWhatsAppMessage(customer.phone, message, creds);
      await db.insert(botMessagesTable).values({
        customerId: customer.id,
        businessId,
        direction: "outbound",
        content: message,
        replyType: "booking",
      });
      logger.info({ bookingId: booking.id, phone: customer.phone }, "Reschedule notification sent via WhatsApp");
    }
  } catch (err) {
    logger.error({ err, bookingId: booking.id }, "Failed to send reschedule WhatsApp");
  }
});

router.delete("/bookings/:id", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(req, q.data?.businessId);

  const params = DeleteBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [booking] = await db.delete(bookingsTable)
    .where(and(eq(bookingsTable.id, params.data.id), eq(bookingsTable.businessId, businessId)))
    .returning();
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
