import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { can, verifyAccessToken, type AuthorizableActor } from "@openspace-db/auth-core";
import type { PermissionAction, PermissionResource } from "@openspace-db/shared-types";

declare module "fastify" {
  interface FastifyRequest {
    actor?: AuthorizableActor & { id: string; email?: string };
  }
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requirePermission: (
      resource: PermissionResource,
      action: PermissionAction,
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  app.decorate("requireAuth", async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "Missing bearer token" } });
    }

    try {
      const payload = await verifyAccessToken(header.slice("Bearer ".length));
      request.actor = { type: "user", id: payload.sub, email: payload.email, roles: payload.roles };
    } catch {
      return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } });
    }
    return undefined;
  });

  app.decorate(
    "requirePermission",
    (resource: PermissionResource, action: PermissionAction) =>
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (!request.actor) {
          return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "Missing bearer token" } });
        }

        if (!can(request.actor, resource, action)) {
          return reply
            .code(403)
            .send({ error: { code: "FORBIDDEN", message: `Missing permission: ${action} on ${resource}` } });
        }
        return undefined;
      },
  );
});
