import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, adminUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_COOKIE = "wa_admin_token";
const JWT_ISSUER = "whatsapp-bot-admin";
const JWT_AUDIENCE = "whatsapp-bot-api";
const JWT_EXPIRES_IN = "7d";

type JwtPayload = {
  sub: string;
  email: string;
  role?: "super_admin" | "business_admin";
};

export type AuthUser = {
  id: number;
  email: string;
  role: "super_admin" | "business_admin";
};

declare module "express-serve-static-core" {
  interface Request {
    authUser?: AuthUser;
  }
}

function getJwtSecret(): string {
  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    throw new Error("JWT_SECRET must be set");
  }
  return secret;
}

function parseBearerToken(headerValue?: string): string | null {
  if (!headerValue) return null;
  const [type, token] = headerValue.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export function signAuthToken(user: AuthUser): string {
  return jwt.sign(
    { email: user.email, role: user.role },
    getJwtSecret(),
    {
      subject: String(user.id),
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: JWT_EXPIRES_IN,
    },
  );
}

export function setAuthCookie(res: Response, token: string) {
  const isProd = process.env["NODE_ENV"] === "production";
  res.cookie(JWT_COOKIE, token, {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response) {
  const isProd = process.env["NODE_ENV"] === "production";
  res.clearCookie(JWT_COOKIE, {
    path: "/",
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
  });
}

export async function ensureAuth(req: Request, res: Response, next: NextFunction) {
  const cookieToken = (req.cookies?.[JWT_COOKIE] as string | undefined) ?? null;
  const bearerToken = parseBearerToken(req.headers.authorization);
  const token = bearerToken ?? cookieToken;

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JwtPayload;

    const id = Number(payload.sub);
    if (!Number.isFinite(id)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const [user] = await db
      .select({ id: adminUsersTable.id, isActive: adminUsersTable.isActive, role: adminUsersTable.role })
      .from(adminUsersTable)
      .where(eq(adminUsersTable.id, id))
      .limit(1);
    if (!user || !user.isActive) {
      clearAuthCookie(res);
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.authUser = { id, email: payload.email, role: user.role === "business_admin" ? "business_admin" : "super_admin" };
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
