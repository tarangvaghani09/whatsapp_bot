import { Router, type IRouter } from "express";
import { ensureAuth } from "../lib/auth";
import healthRouter from "./health";
import webhookRouter from "./webhook";
import authRouter from "./auth";
import businessesRouter from "./businesses";
import faqsRouter from "./faqs";
import servicesRouter from "./services";
import bookingsRouter from "./bookings";
import customersRouter from "./customers";
import messagesRouter from "./messages";
import dashboardRouter from "./dashboard";
import aiUsageRouter from "./ai-usage";
import settingsRouter from "./settings";
import simulateRouter from "./simulate";
import seedRouter from "./seed";
import cannedResponsesRouter from "./canned-responses";
import deliveryFailuresRouter from "./delivery-failures";
import { createRateLimit } from "../lib/rate-limit";

const router: IRouter = Router();
const protectedRouter: IRouter = Router();
const authRateLimit = createRateLimit({ windowMs: 60_000, max: 30, scope: "ip" });
const webhookRateLimit = createRateLimit({ windowMs: 60_000, max: 120, scope: "ip" });
const protectedRateLimit = createRateLimit({ windowMs: 60_000, max: 180, scope: "user_or_ip" });
const simulateRateLimit = createRateLimit({ windowMs: 60_000, max: 60, scope: "user_or_ip" });

router.use(healthRouter);
router.use(webhookRateLimit, webhookRouter);
router.use(authRateLimit, authRouter);

protectedRouter.use(ensureAuth);
protectedRouter.use(protectedRateLimit);
protectedRouter.use(businessesRouter);
protectedRouter.use(faqsRouter);
protectedRouter.use(servicesRouter);
protectedRouter.use(bookingsRouter);
protectedRouter.use(customersRouter);
protectedRouter.use(messagesRouter);
protectedRouter.use(dashboardRouter);
protectedRouter.use(aiUsageRouter);
protectedRouter.use(settingsRouter);
protectedRouter.use(simulateRateLimit, simulateRouter);
protectedRouter.use(seedRouter);
protectedRouter.use(cannedResponsesRouter);
protectedRouter.use(deliveryFailuresRouter);

router.use(protectedRouter);

export default router;
