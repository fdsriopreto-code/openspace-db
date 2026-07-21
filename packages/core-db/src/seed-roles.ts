import type { PrismaClient } from "../generated/client/index.js";

const ROLE_NAMES = ["Owner", "Admin", "Developer", "ReadOnly", "ServiceAccount"] as const;

/**
 * `Developer` gets explicit write access to dev-facing resources; `ReadOnly`
 * gets read on everything. `Owner`/`Admin`/`ServiceAccount` are intentionally
 * NOT seeded with rows here — Owner/Admin are wildcard roles handled directly
 * by the authorization engine (packages/auth-core), and ServiceAccount draws
 * its permissions entirely from the token's `scopes`, never from role rows.
 */
const DEVELOPER_PERMISSIONS: Array<{ resource: string; action: string }> = [
  { resource: "db", action: "write" },
  { resource: "storage", action: "write" },
  { resource: "redis", action: "write" },
  { resource: "queue", action: "write" },
  { resource: "infra", action: "read" },
  { resource: "backups", action: "read" },
];

const READ_ONLY_RESOURCES = ["db", "storage", "redis", "queue", "infra", "plugins", "users", "backups"];

export async function seedDefaultRoles(prisma: PrismaClient): Promise<void> {
  for (const name of ROLE_NAMES) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const developerRole = await prisma.role.findUniqueOrThrow({ where: { name: "Developer" } });
  for (const permission of DEVELOPER_PERMISSIONS) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_resource_action: {
          roleId: developerRole.id,
          resource: permission.resource,
          action: permission.action,
        },
      },
      update: {},
      create: { roleId: developerRole.id, ...permission },
    });
  }

  const readOnlyRole = await prisma.role.findUniqueOrThrow({ where: { name: "ReadOnly" } });
  for (const resource of READ_ONLY_RESOURCES) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_resource_action: { roleId: readOnlyRole.id, resource, action: "read" },
      },
      update: {},
      create: { roleId: readOnlyRole.id, resource, action: "read" },
    });
  }
}
