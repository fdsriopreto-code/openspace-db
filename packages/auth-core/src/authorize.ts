import type { PermissionAction, PermissionResource, RoleName } from "@openspace-db/shared-types";
import { DEFAULT_ROLE_PERMISSIONS } from "@openspace-db/shared-types";

/**
 * Single authorization engine for the whole platform. REST routes, the
 * WebSocket gateway and every MCP tool call this same function — see
 * ADR-0006 and docs/SECURITY.md §1. Nothing else is allowed to make an
 * access-control decision.
 */
export interface AuthorizableActor {
  type: "user" | "service_account";
  roles: RoleName[];
  /** Only meaningful for service_account actors (MCP/CI tokens). */
  scopes?: PermissionAction[];
}

const WILDCARD_ROLES: RoleName[] = ["Owner", "Admin"];

const ACTION_RANK: Record<Exclude<PermissionAction, "destructive">, number> = {
  read: 1,
  write: 2,
  admin: 3,
};

function roleGrantsAction(role: RoleName, resource: PermissionResource, action: PermissionAction): boolean {
  const permissions =
    role === "Developer" || role === "ReadOnly" ? DEFAULT_ROLE_PERMISSIONS[role] : [];

  return permissions.some((permission) => {
    if (permission.resource !== resource) return false;
    if (action === "destructive") return permission.action === "destructive";
    if (permission.action === "destructive") return false;
    return ACTION_RANK[permission.action] >= ACTION_RANK[action];
  });
}

export function can(actor: AuthorizableActor, resource: PermissionResource, action: PermissionAction): boolean {
  if (actor.type === "user" && actor.roles.some((role) => WILDCARD_ROLES.includes(role))) {
    return true;
  }

  if (actor.type === "service_account") {
    // Service accounts never inherit human role permissions — every
    // capability must be an explicit scope on the token (docs/SECURITY.md §1).
    return (actor.scopes ?? []).some((scope) => {
      if (action === "destructive") return scope === "destructive";
      if (scope === "destructive") return false;
      return ACTION_RANK[scope] >= ACTION_RANK[action];
    });
  }

  return actor.roles.some((role) => roleGrantsAction(role, resource, action));
}

export function assertCan(actor: AuthorizableActor, resource: PermissionResource, action: PermissionAction): void {
  if (!can(actor, resource, action)) {
    throw new AuthorizationError(resource, action);
  }
}

export class AuthorizationError extends Error {
  readonly code = "FORBIDDEN";

  constructor(
    readonly resource: PermissionResource,
    readonly action: PermissionAction,
  ) {
    super(`Missing permission: ${action} on ${resource}`);
  }
}
