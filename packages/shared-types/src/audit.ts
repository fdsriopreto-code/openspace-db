export type AuditActorType = "user" | "service_account";
export type AuditResult = "ok" | "denied" | "error";
export type Environment = "development" | "staging" | "production";

export interface AuditLogEntry {
  id: string;
  actorType: AuditActorType;
  actorId: string;
  action: string;
  resource: string;
  paramsRedacted: Record<string, unknown>;
  result: AuditResult;
  ip: string | null;
  environment: Environment;
  createdAt: string;
}
