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

const router: IRouter = Router();
const protectedRouter: IRouter = Router();

router.use(healthRouter);
router.use(webhookRouter);
router.use(authRouter);

protectedRouter.use(ensureAuth);
protectedRouter.use(businessesRouter);
protectedRouter.use(faqsRouter);
protectedRouter.use(servicesRouter);
protectedRouter.use(bookingsRouter);
protectedRouter.use(customersRouter);
protectedRouter.use(messagesRouter);
protectedRouter.use(dashboardRouter);
protectedRouter.use(aiUsageRouter);
protectedRouter.use(settingsRouter);
protectedRouter.use(simulateRouter);
protectedRouter.use(seedRouter);
protectedRouter.use(cannedResponsesRouter);
protectedRouter.use(deliveryFailuresRouter);

router.use(protectedRouter);

export default router;
