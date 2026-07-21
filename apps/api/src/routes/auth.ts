import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createSession, hashPassword, revokeSession, rotateSession, verifyPassword } from "@openspace-db/auth-core";
import { seedDefaultRoles } from "@openspace-db/core-db";
import type { AuthenticatedUser, LoginResponse, RefreshResponse } from "@openspace-db/shared-types";
import { writeAuditLog } from "../lib/audit.js";
import type { Env } from "../env.js";

const REFRESH_COOKIE = "osrt";

const bootstrapSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance, opts: { env: Env }): Promise<void> {
  const { env } = opts;

  // Lets the CLI check whether an admin already exists without attempting a
  // (potentially destructive-looking) POST just to read the 409 status.
  app.get("/api/auth/bootstrap-status", async () => {
    const existingUsers = await app.prisma.user.count();
    return { bootstrapped: existingUsers > 0 };
  });

  // Only succeeds once — the moment a first user exists, this route always 409s.
  // This is how `openspace init` creates the first administrator with zero
  // manual configuration (docs/ARCHITECTURE.md §7).
  app.post("/api/auth/bootstrap", async (request, reply) => {
    const existingUsers = await app.prisma.user.count();
    if (existingUsers > 0) {
      return reply.code(409).send({
        error: { code: "ALREADY_BOOTSTRAPPED", message: "An administrator already exists." },
      });
    }

    const body = bootstrapSchema.parse(request.body);
    await seedDefaultRoles(app.prisma);
    const ownerRole = await app.prisma.role.findUniqueOrThrow({ where: { name: "Owner" } });

    const user = await app.prisma.user.create({
      data: {
        email: body.email,
        passwordHash: await hashPassword(body.password),
        name: body.name ?? null,
        userRoles: { create: { roleId: ownerRole.id } },
      },
    });

    await writeAuditLog(app.prisma, {
      actorType: "user",
      actorId: user.id,
      action: "bootstrap",
      resource: "users",
      result: "ok",
      ip: request.ip,
      environment: env.ENVIRONMENT_TIER,
    });

    const response: AuthenticatedUser = { id: user.id, email: user.email, name: user.name, roles: ["Owner"] };
    return reply.code(201).send({ user: response });
  });

  app.post("/api/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await app.prisma.user.findUnique({
      where: { email: body.email },
      include: { userRoles: { include: { role: true } } },
    });

    const passwordOk = user?.passwordHash ? await verifyPassword(user.passwordHash, body.password) : false;

    if (!user || !passwordOk) {
      await writeAuditLog(app.prisma, {
        actorType: "user",
        actorId: user?.id ?? "unknown",
        action: "login",
        resource: "users",
        result: "denied",
        ip: request.ip,
        environment: env.ENVIRONMENT_TIER,
      });
      return reply.code(401).send({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const session = await createSession(
      app.prisma,
      { id: user.id, email: user.email, roles },
      { ip: request.ip, userAgent: request.headers["user-agent"] ?? null },
    );

    await app.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await writeAuditLog(app.prisma, {
      actorType: "user",
      actorId: user.id,
      action: "login",
      resource: "users",
      result: "ok",
      ip: request.ip,
      environment: env.ENVIRONMENT_TIER,
    });

    reply.setCookie(REFRESH_COOKIE, session.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      expires: session.expiresAt,
    });

    const body_: LoginResponse = {
      accessToken: session.accessToken,
      user: { id: user.id, email: user.email, name: user.name, roles },
    };
    return reply.send(body_);
  });

  app.post("/api/auth/refresh", async (request, reply) => {
    const presented = request.cookies[REFRESH_COOKIE];
    if (!presented) {
      return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "Missing refresh token" } });
    }

    const rotated = await rotateSession(app.prisma, presented);
    if (!rotated) {
      return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "Refresh token invalid or expired" } });
    }

    reply.setCookie(REFRESH_COOKIE, rotated.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      expires: rotated.expiresAt,
    });

    const body: RefreshResponse = { accessToken: rotated.accessToken };
    return reply.send(body);
  });

  app.post("/api/auth/logout", async (request, reply) => {
    const presented = request.cookies[REFRESH_COOKIE];
    if (presented) {
      await revokeSession(app.prisma, presented);
    }
    reply.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    return reply.code(204).send();
  });

  app.get("/api/auth/me", { preHandler: app.requireAuth }, async (request, reply) => {
    if (!request.actor) return reply.code(401).send();
    const user = await app.prisma.user.findUnique({
      where: { id: request.actor.id },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) return reply.code(401).send();

    const response: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.userRoles.map((ur) => ur.role.name),
    };
    return reply.send(response);
  });
}
