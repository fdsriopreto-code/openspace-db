import { describe, expect, it } from "vitest";
import { can } from "./authorize.js";

describe("can()", () => {
  it("lets Owner and Admin do anything, including destructive actions", () => {
    expect(can({ type: "user", roles: ["Owner"] }, "db", "destructive")).toBe(true);
    expect(can({ type: "user", roles: ["Admin"] }, "plugins", "admin")).toBe(true);
  });

  it("lets Developer write to db but not administer plugins", () => {
    const developer = { type: "user" as const, roles: ["Developer" as const] };
    expect(can(developer, "db", "write")).toBe(true);
    expect(can(developer, "db", "read")).toBe(true); // write implies read
    expect(can(developer, "plugins", "admin")).toBe(false);
  });

  it("never lets Developer perform a destructive action without an explicit grant", () => {
    const developer = { type: "user" as const, roles: ["Developer" as const] };
    expect(can(developer, "db", "destructive")).toBe(false);
  });

  it("lets ReadOnly read everything but write nothing", () => {
    const readOnly = { type: "user" as const, roles: ["ReadOnly" as const] };
    expect(can(readOnly, "storage", "read")).toBe(true);
    expect(can(readOnly, "storage", "write")).toBe(false);
  });

  it("never lets a service account inherit human role permissions", () => {
    // Even though "Developer" would normally grant db:write, a service
    // account must carry that capability as an explicit scope — this is
    // the core guarantee behind MCP tool safety (docs/SECURITY.md §1).
    const serviceAccount = { type: "service_account" as const, roles: ["Developer" as const], scopes: [] };
    expect(can(serviceAccount, "db", "write")).toBe(false);
  });

  it("lets a service account act strictly within its granted scopes", () => {
    const readOnlyToken = { type: "service_account" as const, roles: [], scopes: ["read" as const] };
    expect(can(readOnlyToken, "db", "read")).toBe(true);
    expect(can(readOnlyToken, "db", "write")).toBe(false);
    expect(can(readOnlyToken, "db", "destructive")).toBe(false);
  });

  it("requires the destructive scope explicitly, not implied by admin", () => {
    const adminToken = { type: "service_account" as const, roles: [], scopes: ["admin" as const] };
    expect(can(adminToken, "db", "destructive")).toBe(false);

    const destructiveToken = { type: "service_account" as const, roles: [], scopes: ["destructive" as const] };
    expect(can(destructiveToken, "db", "destructive")).toBe(true);
  });
});
