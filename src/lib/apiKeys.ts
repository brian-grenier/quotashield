import "server-only";

import crypto from "node:crypto";

const API_KEY_PREFIX = "qs_";
const KEY_DISPLAY_PREFIX_LEN = 6;

export function generateRawApiKey(): string {
  // URL-safe token, no padding.
  const token = crypto.randomBytes(32).toString("base64url");
  return `${API_KEY_PREFIX}${token}`;
}

export function getKeyPrefix(rawKey: string): string {
  return rawKey.slice(0, KEY_DISPLAY_PREFIX_LEN);
}

export function getKeyLast4(rawKey: string): string {
  return rawKey.slice(-4);
}

export function hashApiKey(rawKey: string): string {
  const pepper = process.env.API_KEY_PEPPER;
  if (!pepper) {
    throw new Error("API_KEY_PEPPER is missing. Add it to .env.local to enable API key hashing.");
  }
  return crypto.createHash("sha256").update(rawKey + pepper).digest("hex");
}


