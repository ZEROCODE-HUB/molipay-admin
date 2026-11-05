import { describe,expect,it } from "vitest";
import { toRbacAuditEntry,toSecurityEvent } from "./activity.supabase";

const row = {
  id: 1,
  occurred_at: "2026-11-02T12:00:00Z",
  action: "auth.login.succeeded",
  label: "Inicio de sesión",
  category: "authentication",
  severity: "info",
  outcome: "success",
  actor_type: "staff",
  actor_id: "u1",
  actor_email: "a@b.com",
  target_type: "auth_user",
  target_id: "u1",
  target_user_id: "u1",
  target_email: "a@b.com",
  tenant_id: null,
  ip: "1.2.3.4",
  user_agent: null,
  source: "db:auth.sessions",
  request_id: null,
  metadata: null,
};

describe("toSecurityEvent", () => {
  it("traduce la fila a camelCase y completa metadata vacia", () => {
    expect(toSecurityEvent(row)).toMatchObject({
      occurredAt: "2026-11-02T12:00:00Z",
      category: "authentication",
      actorType: "staff",
      metadata: {},
    });
  });

  it("un valor desconocido de la base es un error contract", () => {
    expect(() => toSecurityEvent({ ...row, severity: "extremo" })).toThrow(
      expect.objectContaining({ kind: "contract" }),
    );
  });
});

describe("toRbacAuditEntry", () => {
  it("valida la operacion", () => {
    const base = {
      id: "x",
      created_at: "2026-11-02T12:00:00Z",
      table_name: "roles",
      event: null,
      row_id: "r1",
      actor_id: null,
      actor_name: null,
      actor_email: null,
      before_data: null,
      after_data: null,
      role_names: null,
      permission_names: null,
    };
    expect(toRbacAuditEntry({ ...base, operation: "UPDATE" })).toMatchObject({
      operation: "UPDATE",
      roleNames: {},
    });
    expect(() => toRbacAuditEntry({ ...base, operation: "MERGE" })).toThrow(
      expect.objectContaining({ kind: "contract" }),
    );
  });
});
