import type { Prisma, PrismaClient } from "@openspace-db/core-db";
import type { AuditActorType, AuditResult, Environment } from "@openspace-db/shared-types";

export interface WriteAuditLogInput {
  actorType: AuditActorType;
  actorId: string;
  action: string;
  resource: string;
  paramsRedacted?: Record<string, unknown>;
  result: AuditResult;
  ip: string | null;
  environment: Environment;
}

/**
 * Every mutable action — human or AI, REST or MCP — goes through this single
 * writer. See docs/SECURITY.md §5: the audit log is the source of truth for
 * "who did what", including denied attempts, which is the main signal for
 * detecting misuse of an AI/service token.
 */
export async function writeAuditLog(prisma: PrismaClient, entry: WriteAuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorType: entry.actorType,
      actorId: entry.actorId,
      action: entry.action,
      resource: entry.resource,
      paramsRedacted: (entry.paramsRedacted ?? {}) as Prisma.InputJsonValue,
      result: entry.result,
      ip: entry.ip,
      environment: entry.environment,
    },
  });
}
