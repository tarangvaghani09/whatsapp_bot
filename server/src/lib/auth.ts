import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_COOKIE = "wa_admin_token";
const JWT_ISSUER = "whatsapp-bot-admin";
const JWT_AUDIENCE = "whatsapp-bot-api";
const JWT_EXPIRES_IN = "7d";

type JwtPayload = {
  sub: string;
  email: string;
};

export type AuthUser = {
  id: number;
  email: string;
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
    { email: user.email },
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
  res.cookie(JWT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(JWT_COOKIE, { path: "/" });
}

export function ensureAuth(req: Request, res: Response, next: NextFunction) {
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

    req.authUser = { id, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
