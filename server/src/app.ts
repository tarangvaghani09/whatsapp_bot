import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import router from "./routes";
import { logger } from "./lib/logger";
import { ForbiddenError } from "./lib/errors";

const app: Express = express();

function getAllowedOrigins(): string[] {
  const raw = process.env["CORS_ORIGINS"]?.trim();
  if (raw) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  const appOrigin = process.env["APP_ORIGIN"]?.trim();
  return appOrigin ? [appOrigin] : [];
}

function isAllowedVercelPreview(origin: string): boolean {
  if (process.env["ALLOW_VERCEL_PREVIEWS"] !== "true") return false;
  try {
    const host = new URL(origin).hostname;
    return host.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const allowedOrigins = getAllowedOrigins();
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) {
        cb(null, true);
        return;
      }
      if (
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin) ||
        isAllowedVercelPreview(origin)
      ) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ForbiddenError) {
    res.status(403).json({ error: err.message });
    return;
  }
  logger.error({ err }, "Unhandled server error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
