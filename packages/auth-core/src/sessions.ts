import type { PrismaClient } from "@openspace-db/core-db";
import { generateOpaqueToken, hashOpaqueToken } from "./tokens.js";
import { signAccessToken } from "./jwt.js";
import type { RoleName } from "@openspace-db/shared-types";

export const REFRESH_TOKEN_TTL_DAYS = 30;

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface SessionSubject {
  id: string;
  email: string;
  roles: RoleName[];
}

export async function createSession(
  prisma: PrismaClient,
  subject: SessionSubject,
  meta: { ip: string | null; userAgent: string | null },
): Promise<IssuedSession> {
  const refreshToken = generateOpaqueToken("osr");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId: subject.id,
      refreshTokenHash: hashOpaqueToken(refreshToken),
      ip: meta.ip,
      userAgent: meta.userAgent,
      expiresAt,
    },
  });

  const accessToken = await signAccessToken({
    sub: subject.id,
    email: subject.email,
    roles: subject.roles,
  });

  return { accessToken, refreshToken, expiresAt };
}

/**
 * Rotates a refresh token: the presented token is invalidated and a new one
 * issued, even if the caller only wanted a fresh access token. This bounds
 * the blast radius of a leaked refresh token to a single use.
 */
export async function rotateSession(
  prisma: PrismaClient,
  presentedRefreshToken: string,
): Promise<IssuedSession | null> {
  const tokenHash = hashOpaqueToken(presentedRefreshToken);
  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: tokenHash },
    include: { user: { include: { userRoles: { include: { role: true } } } } },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  return createSession(
    prisma,
    {
      id: session.user.id,
      email: session.user.email,
      roles: session.user.userRoles.map((ur) => ur.role.name),
    },
    { ip: session.ip, userAgent: session.userAgent },
  );
}

export async function revokeSession(prisma: PrismaClient, presentedRefreshToken: string): Promise<void> {
  const tokenHash = hashOpaqueToken(presentedRefreshToken);
  await prisma.session.updateMany({
    where: { refreshTokenHash: tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessionsForUser(prisma: PrismaClient, userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
