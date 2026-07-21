export const ROLE_NAMES = ["Owner", "Admin", "Developer", "ReadOnly", "ServiceAccount"] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

export const PERMISSION_RESOURCES = [
  "db",
  "storage",
  "redis",
  "queue",
  "infra",
  "plugins",
  "users",
  "backups",
] as const;
export type PermissionResource = (typeof PERMISSION_RESOURCES)[number];

export const PERMISSION_ACTIONS = ["read", "write", "admin", "destructive"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export interface Permission {
  resource: PermissionResource;
  action: PermissionAction;
}

/**
 * Default permission matrix per role. `Admin`/`Owner` implicitly have every
 * permission and are not enumerated here — the authorization engine treats
 * them as wildcard roles. `ServiceAccount` has no implicit permissions:
 * every capability must come from the token's explicit `scopes`.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<Extract<RoleName, "Developer" | "ReadOnly">, Permission[]> = {
  Developer: [
    { resource: "db", action: "write" },
    { resource: "storage", action: "write" },
    { resource: "redis", action: "write" },
    { resource: "queue", action: "write" },
    { resource: "infra", action: "read" },
    { resource: "backups", action: "read" },
  ],
  ReadOnly: PERMISSION_RESOURCES.map((resource) => ({ resource, action: "read" as const })),
};

export const SERVICE_ACCOUNT_SCOPES = ["read", "write", "admin", "destructive"] as const;
export type ServiceAccountScope = (typeof SERVICE_ACCOUNT_SCOPES)[number];
