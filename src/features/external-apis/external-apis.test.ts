import { describe,expect,it } from "vitest";
import { AppError } from "@/shared/lib/errors";
import { changedPermissions,matrixFromServer,parseIpList } from "./external-apis.rules";
import { toApiEndpoint,toApiIntegration } from "./external-apis.supabase";
import type { EndpointPermission } from "./external-apis.types";

const integrationRow = {
  id: "i1",
  comercio_id: "c1",
  comercio: "Acme",
  legajo: "L1",
  estado: "Pendiente_Pase_Produccion",
  pase_solicitado_at: null,
  pase_notas: null,
  motivo_suspension: null,
  rate_limit_sandbox: 100,
  rate_limit_produccion: 1000,
  ips: 0,
  llaves: [{ ambiente: "Homologacion", api_key: "mp_test_x", ultimo_uso_at: null }],
  requests_24h: 3,
  errores_24h: 0,
  ultimo_uso_at: null,
  webhooks_fallidos: 0,
  created_at: "2026-11-01",
  updated_at: "2026-11-01",
};

describe("toApiIntegration", () => {
  it("traduce estado y ambiente de la base a valores en inglés", () => {
    const i = toApiIntegration(integrationRow);
    expect(i.status).toBe("pending_production");
    expect(i.keys[0]).toEqual({ environment: "sandbox", apiKey: "mp_test_x", lastUsedAt: null });
  });

  it("un estado desconocido es un error de contrato (no se acepta en silencio)", () => {
    expect(() => toApiIntegration({ ...integrationRow, estado: "Otro" })).toThrow(AppError);
  });
});

describe("toApiEndpoint", () => {
  it("Habilitado -> enabled", () => {
    const e = toApiEndpoint({
      id: "e1",
      nombre: "Crear cobro",
      path: "/v1/charges",
      metodo: "POST",
      descripcion: null,
      grupo: "Cobros",
      estado: "Habilitado",
      rec: true,
      created_at: "",
      updated_at: "",
    });
    expect(e).toMatchObject({ name: "Crear cobro", method: "POST", status: "enabled", rec: true });
  });
});

const permission = (
  endpointId: string,
  sandbox: boolean | null,
  production: boolean | null,
): EndpointPermission => ({
  endpointId,
  path: "/v1/x",
  method: "GET",
  name: endpointId,
  category: null,
  status: "Habilitado",
  environments: ["sandbox", "production"],
  enabledByDefaultInProduction: true,
  sandbox,
  production,
});

describe("permisos", () => {
  const permissions = [permission("a", true, false), permission("b", false, null)];

  it("la matriz arranca con lo guardado (sin regla = no permitido)", () => {
    expect(matrixFromServer(permissions, "production")).toEqual({ a: false, b: false });
  });

  it("se guardan los cambiados y los que no tienen regla", () => {
    const changed = changedPermissions(permissions, "production", { a: true, b: false });
    expect(changed.map((p) => p.endpointId)).toEqual(["a", "b"]);
    expect(changedPermissions(permissions, "sandbox", { a: true, b: false })).toHaveLength(0);
  });

  it("parseIpList acepta líneas, comas y punto y coma", () => {
    expect(parseIpList("1.1.1.1\n2.2.2.2, 3.3.3.0/24;  ")).toEqual([
      "1.1.1.1",
      "2.2.2.2",
      "3.3.3.0/24",
    ]);
  });
});
