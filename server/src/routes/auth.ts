import { Router, type IRouter } from "express";
import { db, adminUsersTable } from "@workspace/db";
import { and, eq, isNotNull, gt, sql } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { clearAuthCookie, ensureAuth, setAuthCookie, signAuthToken } from "../lib/auth";
import { sendPasswordResetEmail } from "../lib/mailer";

const router: IRouter = Router();

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const ForgotBody = z.object({
  email: z.string().email(),
});

const ResetBody = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6),
});

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = parsed.data.email.toLowerCase().trim();
  const [user] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, email)).limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signAuthToken({ id: user.id, email: user.email });
  setAuthCookie(res, token);
  res.json({
    user: { id: user.id, email: user.email, name: user.name },
  });
});

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const parsed = ForgotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = parsed.data.email.toLowerCase().trim();
  const [user] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, email)).limit(1);

  const generic = {
    message: "If that email exists, a reset link has been created.",
  };

  if (!user) {
    res.json(generic);
    return;
  }

  const ttlMinutes = Number(process.env["RESET_PASSWORD_TOKEN_TTL_MIN"] ?? "15");
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = sha256(resetToken);
  const resetTokenExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await db
    .update(adminUsersTable)
    .set({ resetTokenHash, resetTokenExpiresAt })
    .where(eq(adminUsersTable.id, user.id));

  const appOrigin = process.env["APP_ORIGIN"] ?? "http://localhost:5173";
  const resetUrl = `${appOrigin.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(resetToken)}`;

  await sendPasswordResetEmail(user.email, resetUrl, ttlMinutes);

  res.json(generic);
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const parsed = ResetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const tokenHash = sha256(parsed.data.token);
  const now = new Date();

  const [user] = await db
    .select()
    .from(adminUsersTable)
    .where(
      and(
        eq(adminUsersTable.resetTokenHash, tokenHash),
        isNotNull(adminUsersTable.resetTokenExpiresAt),
        gt(adminUsersTable.resetTokenExpiresAt, now),
      ),
    )
    .limit(1);

  if (!user) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);

  await db
    .update(adminUsersTable)
    .set({
      passwordHash,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    })
    .where(eq(adminUsersTable.id, user.id));

  res.json({ message: "Password reset successful" });
});

router.get("/auth/me", ensureAuth, async (req, res): Promise<void> => {
  const id = req.authUser?.id;
  if (!id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db
    .select({
      id: adminUsersTable.id,
      email: adminUsersTable.email,
      name: adminUsersTable.name,
    })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, id))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  res.json({ user });
});

router.post("/auth/logout", (req, res): void => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.post("/auth/bootstrap", async (req, res): Promise<void> => {
  const countRows = await db.select({ count: sql<number>`count(*)` }).from(adminUsersTable);
  const count = Number(countRows[0]?.count ?? 0);
  if (count > 0) {
    res.status(409).json({ error: "Admin user already exists" });
    return;
  }

  const parsed = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().trim().min(1).max(80).optional(),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = parsed.data.email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const [created] = await db
    .insert(adminUsersTable)
    .values({
      email,
      passwordHash,
      name: parsed.data.name?.trim() || null,
    })
    .returning({
      id: adminUsersTable.id,
      email: adminUsersTable.email,
      name: adminUsersTable.name,
    });

  const token = signAuthToken({ id: created.id, email: created.email });
  setAuthCookie(res, token);
  res.status(201).json({ user: created });
});

export default router;
