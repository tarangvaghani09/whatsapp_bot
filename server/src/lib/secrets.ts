import crypto from "node:crypto";

const ENC_PREFIX = "enc:v1";

function getEncryptionKey(): Buffer | null {
  const raw = process.env["WHATSAPP_TOKEN_ENC_KEY"];
  if (!raw) return null;

  // Prefer 32-byte base64 key. Fallback: derive from passphrase.
  try {
    const b64 = Buffer.from(raw, "base64");
    if (b64.length === 32) return b64;
  } catch {
    // ignore, will derive below
  }
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

export function encryptSecret(plain?: string | null): string | undefined {
  if (!plain) return undefined;
  const key = getEncryptionKey();
  if (!key) {
    throw new Error("WHATSAPP_TOKEN_ENC_KEY must be set to store WhatsApp access tokens securely");
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${ENC_PREFIX}:${iv.toString("base64url")}:${encrypted.toString("base64url")}:${tag.toString("base64url")}`;
}

export function decryptSecret(value?: string | null): string | undefined {
  if (!value) return undefined;
  if (!value.startsWith(`${ENC_PREFIX}:`)) return value;

  const key = getEncryptionKey();
  if (!key) {
    throw new Error("WHATSAPP_TOKEN_ENC_KEY is required to decrypt stored WhatsApp token");
  }

  const [, ivB64, encB64, tagB64] = value.split(":");
  if (!ivB64 || !encB64 || !tagB64) {
    throw new Error("Invalid encrypted secret format");
  }

  const iv = Buffer.from(ivB64, "base64url");
  const encrypted = Buffer.from(encB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return plain.toString("utf8");
}

export function maskSecret(value?: string | null): string | null {
  if (!value) return null;
  return "********";
}
