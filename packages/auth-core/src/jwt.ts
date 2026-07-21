import { SignJWT, jwtVerify } from "jose";
import type { JwtAccessTokenPayload, ServiceAccountTokenPayload } from "@openspace-db/shared-types";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

function getSigningSecret(): Uint8Array {
  const secret = process.env["JWT_SIGNING_SECRET"];
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SIGNING_SECRET is missing or too short. It must be generated at install time (see infra/installer).",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(
  payload: Omit<JwtAccessTokenPayload, "type">,
): Promise<string> {
  return new SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getSigningSecret());
}

export async function verifyAccessToken(token: string): Promise<JwtAccessTokenPayload> {
  const { payload } = await jwtVerify(token, getSigningSecret());
  if (payload["type"] !== "access") {
    throw new Error("Not an access token");
  }
  return payload as unknown as JwtAccessTokenPayload;
}

export async function signServiceAccountToken(
  payload: Omit<ServiceAccountTokenPayload, "type">,
  expiresIn: string | null,
): Promise<string> {
  let builder = new SignJWT({ ...payload, type: "service_account" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt();
  if (expiresIn) {
    builder = builder.setExpirationTime(expiresIn);
  }
  return builder.sign(getSigningSecret());
}

export async function verifyServiceAccountToken(token: string): Promise<ServiceAccountTokenPayload> {
  const { payload } = await jwtVerify(token, getSigningSecret());
  if (payload["type"] !== "service_account") {
    throw new Error("Not a service account token");
  }
  return payload as unknown as ServiceAccountTokenPayload;
}
