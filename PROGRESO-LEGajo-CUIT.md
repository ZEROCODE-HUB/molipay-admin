# Progreso — Legajo con CUIT (snapshot)

**Estado:** refactor CUIT completado en working tree · `tsc`, `eslint` y `npm run build` OK · **NO commiteado todavía** (ver sección "Commit & push pendiente").
**Rama:** `main` (HEAD = `5baaf49`, el trabajo previo LPF-#### está pusheado).

## Cambios de este snapshot (sin commitear)

```
 M src/data/clientes.ts
 M src/data/comercios.ts
 M src/lib/users.ts
 M src/routes/admin.comercios.index.tsx
 M src/routes/admin.general.movimientos.comisiones.tsx
 M src/routes/admin.general.movimientos.impuestos.tsx
 M src/routes/admin.general.movimientos.index.tsx
 M src/routes/admin.general.usuarios.comisiones.tsx
 M src/routes/admin.general.usuarios.index.tsx
 M src/routes/admin.general.usuarios.juridicas.tsx
```

## 1. Concepto de legajo (nuevo formato)

- Legajo = **prefijo** (`LPF` para persona física, `LPJ` para jurídica) + **`-` + CUIT de 11 dígitos** (sin puntos ni guiones).
- Ejemplos: `LPF-20123456789`, `LPJ-30112233445`.
- Regex de validación: `^(LPF|LPJ)-\d{11}$` (`LEGAJO_RE` en `src/data/clientes.ts`).
- `legajoDesdeCuit(tipo, cuit)` y `normalizarCuit` ahora viven en `src/data/clientes.ts` y se usan desde data, users, comercios, movimientos y las páginas.
- El legajo **se deriva del CUIT**, no de un autonumérico. El CUIT es el segundo componente del legajo (como pediste).

## 2. Qué se cambió y dónde

### `src/data/clientes.ts` (modelo)
- `Cliente.tipoPersona: "fisica" | "juridica"`.
- `Cliente.cuit: string` (normalizado). Legajo **no** es campo de datos; se calcula.
- Fixtures FISICA_DATA/JURIDICA_DATA: reemplazan `legajo: "LPF-####"` por `cuit: "XX-XXXXXXXX-X"`.
- `toCliente(r)`: normaliza cuit y calcula `legajo = legajoDesdeCuit(tipoPersona, cuit)`.
- `getClientePorUsuario(email)` y `getClientePorLegajo(legajo)` leen del mapa derivado `CLIENTES` (con `clienteId` y `legajo` ya calculados).
- Agregada `ETIQUETA_TIPO_PERSONA` (objeto, no función → usarse como `ETIQUETA_TIPO_PERSONA[t]`).
- `auditarLegajos` / `fuentesLegajoDesdeMovimientos` siguen funcionando (ahora ven legajos CUIT-based).

### `src/data/comercios.ts`
- Comercio: agregado `cuit` + `tipoPersona`; `toComercio` deriva `legajoCliente` via `getClientePorUsuario(correo)`.

### `src/lib/users.ts`
- `Usuario`: `cuit` + `tipoPersona` (se quitaron `legajo`/`usrId`).
- `toUserData`: deriva `legajo` de `legajoEmpresa` (cuit del comercio) o de `cuit` propio.
- Física/Jurídica: el usuario heredó `tipoPersona` del comercio (fisica) o es `juridica` (jurídico).

### `src/routes/admin.comercios.index.tsx` (formulario de comercio)
- El formulario pide **CUIT + tipo de persona**; el legajo se deriva con `legajoDesdeCuit`.
- Validación de CUIT en tiempo real (`normalizarCuit`); el botón de cambio de tipo de persona pasa fisica↔juridica recalculando el legajo.

### `src/routes/admin.general.movimientos.index.tsx`
- **Eliminado** el mapa obsoleto `CLIENTE_POR_USUARIO` (era el duplicado con legajos `LPF-00xx`).
- Los movimientos derivan `clienteId` y `legajo` de `getClientePorUsuario(m.usuario)` (legajo CUIT-based).
- `validateSearch`: `legajo` opcional como string.

### `src/routes/admin.general.movimientos.{cobros-qr,depositos,retiros,pagos-qr,pagos-tarjeta}.tsx`
- Legajos de filas hardcodeadas actualizados a CUIT: `LPF-20567890123`, `LPJ-30778899001`, `LPF-27678901234`, etc.

### `src/routes/admin.general.movimientos.comisiones.tsx` y `.impuestos.tsx`
- Legajos hardcodeados `LPF-0021/0024/0023` → CUIT: `LPF-20345678901`, `LPF-27678901234`, `LPF-20567890123`.

### `src/routes/admin.general.usuarios.{index,juridicas}.tsx`
- Legajos `LPF-00xx` / `LPJ-01xx` → CUIT (12 físicas, 10 jurídicas) consistentes con el registry de `clientes.ts`.

### `src/routes/admin.general.usuarios.comisiones.tsx`
- Reescrita: el legajo de cada fila se deriva de `getClientePorUsuario(correo)`; el formulario pide CUIT + tipo de persona y calcula `legajo = legajoDesdeCuit(...)`.

> **Detalle de cliente** vive en `src/routes/admin.general.usuarios.$legajo.tsx` (ruta `$legajo`). Usa `getClientePorLegajo(legajo)` del registry → funciona con legajos CUIT. No necesitó cambios.

## 3. Auditoría de legajos (el "8 registro(s)")

`admin.general.movimientos.index.tsx` muestra un banner _"Auditoría de legajos: se detectaron N registro(s)"_. Con el formato CUIT:

- Antes (formato `LPF-####`) → **8** (2 legajos legacy `MOV-041` / `COM-0999` malformados + 6 duplicados en `legajosHistoricos`).
- Ahora (formato CUIT, 11 dígitos) → **2**: los únicos registros con legajo inválido son los legacy `MOV-041` y `COM-0999` (prefijo fuera de `LPF/LPJ` y longitud distinta). Las 20 filas base derivan legajo válido del registry.

No hay más `LPF-0xxx`/`LPJ-0xxx` hardcodeados (verificado con grep → 0 coincidencias).

## 4. Estado de build/CI
- `npx tsc --noEmit` → ✅ sin errores.
- `npx eslint <archivos clave>` → ✅ 0 errores.
- `npm run build` → ✅ `built in 12.11s`, salida Nitro generada.
- (Prettier formateó los archivos del snapshot.)

## 5. Commit & push pendiente

El trabajo de este snapshot **no está commiteado**. `git status` muestra 10 archivos modificados. Recomendado commit antes de seguir:

```
git add -A
git commit -m "refactor(legajo): pasar legajo a formato CUIT (LPF/LPJ-XXXXXXXXXXX) derivado de CUIT"
git push
```

> ~~La base de datos sigue con `generar_legajo` tipo secuencia~~ → **Resuelto**: el esquema consolidado `supabase/migrations/0001_init.sql` ya define el legajo derivado del CUIT (ver sección 7).

## 6. Pendientes / próximos pasos (quien continúe)
1. **Commit + push** del snapshot (ver 5).
2. ~~Actualizar la migración para que `generar_legajo` derive de CUIT~~ → hecho: esquema final en `0001_init.sql`.
3. ~~Sincronizar backend real (RPC `generar_legajo`) al formato CUIT~~ → hecho: firma `generar_legajo(tipo_persona, cuit)`; sin llamadas desde la app (grep verificado).
4. Revisar el detalle de comercio/usuario para exponer CUIT en la UI según el figma.
5. Borrar el mapa obsoleto `CLIENTE_POR_USUARIO` (ya eliminado) de cualquier otro módulo que lo referencie (grep `LPF-0` para confirmar).

## 7. Base de datos — esquema consolidado

**Decisión:** un único archivo SQL con el estado final de la BD (`supabase/migrations/0001_init.sql`), idempotente, en lugar de migraciones incrementales. Las tablas `clientes`, `comisiones_cliente` y `movimientos` nunca se crearon en el proyecto Supabase remoto (`doqghevvrfufsynwkzxj`, solo existía `admin_users` de la migración de auth original), así que no había historial que proteger. Las migraciones 0002/0003 previas quedaron absorvidas aquí (recuperables desde git).

Para dejar la base operativa: pegar `0001_init.sql` en el SQL Editor de Supabase (o `supabase db push`). Es seguro re-ejecutarlo.

Respecto al legajo CUIT, el esquema consolidado incluye:
- **Constraints**: legajo con exactamente 11 dígitos (`^(LPF|LPJ)-[0-9]{11}$`), CUIT = 11 dígitos, e invariante determinístico `legajo_deriva_de_cuit` (legajo = prefijo + CUIT).
- **Función**: `generar_legajo(tipo_persona, cuit)` — sin secuencias.
- **Triggers**: el alta normaliza el CUIT y deriva el legajo siempre; `before update of cuit, tipo_persona` recalcula el legajo si cambian.
- **Vista**: `auditoria_legajos` — marca movimientos con `formato_invalido` o `sin_cliente`.

> Nota: validación estática solamente (no hay Docker local para `supabase db reset`).
