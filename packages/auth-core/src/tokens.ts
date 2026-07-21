import { randomBytes, createHash } from "node:crypto";

/** Opaque, high-entropy token for refresh tokens and API keys — never a JWT. */
export function generateOpaqueToken(prefix: string): string {
  return `${prefix}_${randomBytes(32).toString("base64url")}`;
}

/** Refresh tokens and API keys are stored as SHA-256 hashes, never plaintext. */
export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
