import { randomBytes } from "node:crypto";

export function generateSecret(bytes = 48): string {
  return randomBytes(bytes).toString("base64url");
}
