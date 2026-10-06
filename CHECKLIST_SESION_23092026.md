# Checklist Completo — Implementaciones por Punto del Meeting Notes

**Documento origen**: `detalle_reunion_revision_plataforma.md`
**Sesiones**: 21/09/2026 + 23/09/2026

---

## PUNTO 1: Lotes de Venta vs. Lotes de Acreditación

### Qué dice el documento:
> "son dos conceptos que hoy se confunden en el sistema y deben separarse por completo"
> "El comercio debe poder ver ambos por separado: calendario de acreditaciones y lotes de venta por día"

### Implementado (Sesión 21/09):

| Qué | Estado | Dónde |
|-----|--------|-------|
| Vistas separadas ya existían | ✅ | `/admin/comercios/link-pago/lotes` + `/admin/comercios/link-pago/lotes-venta` |
| **Calendario de Acreditaciones (NUEVO)** | ✅ | Ver abajo |

**Archivos creados:**
- `src/lib/api/calendario-acreditaciones.ts` — API que calcula fechas estimadas
- `src/routes/admin.comercios.link-pago.calendario-acreditaciones.tsx` — Vista del calendario mensual

**Integración menú** (`admin.comercios.link-pago.tsx`):
```tsx
const tabs: Tab[] = [
  { label: "Links de Pago", to: "/admin/comercios/link-pago" },
  { label: "Lotes de Acreditación", to: "/admin/comercios/link-pago/lotes" },
  { label: "Lotes de Venta", to: "/admin/comercios/link-pago/lotes-venta" },
  { label: "Calendario", to: "/admin/comercios/link-pago/calendario-acreditaciones" },
];
```

### Pendiente (bloqueado):
> "Mailen debe confirmarlo con Roxana (Payway)" — automatización de carga Payway

### Cómo probar:
1. Ir a `/admin/comercios/link-pago/calendario-acreditaciones`
2. Verificar calendario con navegación entre meses
3. Filtrar por comercio y bandera
4. Verificar días coloreados: verde = acreditado, ámbar = pendiente

---

## PUNTO 2: Estados del Lote de Acreditación

### Qué dice el documento:
> "No existe estado 'Rechazado' en el lote de acreditación"
> "Un lote nace en estado Acreditado; pasa a Contracargo solo"

### Implementado (Sesión 21/09):

| Qué | Estado | Verificación |
|-----|--------|-------------|
| CHECK constraint en BD | ✅ | Solo `('Acreditado','Contracargo')` |
| Función `tone()` en UI | ✅ | Solo maneja esos dos estados |

**Verificación** (`src/routes/admin.comercios.link-pago.lotes.tsx`):
```ts
function tone(e: EstadoLote): "success" | "warn" | "danger" | "neutral" {
  if (e === "Acreditado") return "success";
  if (e === "Contracargo") return "danger";
  return "neutral";
}
```

### Cómo probar:
1. Ir a `/admin/comercios/link-pago/lotes`
2. Verificar filtro de estados solo muestra Acreditado/Contracargo
3. Badges en detalle solo muestran esos estados

---

## PUNTO 3: Comisiones

### Qué dice el documento:
> "existen dos comisiones distintas, que nunca deben mostrarse sumadas"
> "Exportable por lote: base imponible, IVA, ingresos brutos, comisiones"

### Implementado (Sesión 21/09):
excel hoja con movimientos
| Qué | Estado | Dónde |
|-----|--------|-------|
| Dos comisiones separadas | ✅ | `tasaPayway` + `tasaMolipay` + `comisionCierreLote` |
| Comisión cierre como parámetro global | ✅ | `parametros_globales.comision_cierre_lote_pct` |
| **Exportable por lote (NUEVO basic)** | ✅ | Botón Exportar en modal de detalle |
| **Comisión cierre = $0 (BUG FIX)** | ✅ | `lotes.ts` + migración 28 |
comisiones de payway debe estar igual al lote 
**Export basic** (`admin.comercios.link-pago.lotes.tsx`):
- Código, Fecha, Comercio, Legajo, Bandera, Cuotas
- Cantidad operaciones, Importe bruto, Impuestos
- Tasa PayWay (%), Tasa PayWay ($)
- Tasa MoliPay (%), Tasa MoliPay ($)
- Comisión cierre lote (%), Comisión cierre lote ($)
- Contracargo, Importe neto, Estado

**Bug fix comisión cierre ($0):**
- **Problema**: `updateLote` solo recalculaba `importe_neto` si había cambio de contracargo/estado/pct — en creación nunca se ejecutaba esa rama
- **Fix código**: `src/lib/api/lotes.ts` — ahora siempre recalcula `importe_neto` al llamar `updateLote`
- **Fix BD**: `supabase/migrationsss/0028_fix_comision_cierre_lote_monto.sql` — recalcula y guarda comisión para lotes existentes

### Implementado (Sesión 23/09):

| Qué | Estado | Dónde |
|-----|--------|-------|
| **Desglose de impuestos en export (MEJORADO)** | ✅ | Ver abajo |
| **Commerce ve sus tasas por bandeira/cuota** | ✅ | Ver abajo |

**Archivos para desglose:**
- `supabase/migrationsss/0027_lotes_acreditacion_impuestos_desglose.sql` — Columnas `iva_monto`, `iibb_monto`, `debito_credito_monto`
- `src/lib/api/types.ts` — Tipos actualizados
- `src/lib/api/lotes.ts` — Mapper actualizado
- `admin.comercios.link-pago.lotes.tsx` — Export con campos nuevos

**Export mejorado** (requiere aplicar migración 27):
- IVA
- Ingresos Brutos (IIBB)
- Impuesto Débito/Crédito
- Total Impuestos (legacy)
- (los mismos campos de antes)

### Pendiente:
- El comercio pueda ver sus tasas (fix hecho en Enterprises, pero requiere datos en BD)
- IIBB automático desde padrón
- Débito/crédito tras acreditación real

### Cómo probar:
1. Ir a `/admin/comercios/link-pago/lotes`
2. Click en Ver detalle → Exportar
3. Si migración 27 aplicada: Excel con desglose de impuestos
4. Ir a `/app/liquidaciones` → Tab Comisiones (ver tasas del commerce)

---

## PUNTO 4: Flujo de Acreditación

### Qué dice el documento:
> "Acreditar no es transferir"
> "Los plazos por bandera editables"

### Implementado (Sesión 21/09):

| Qué | Estado | Dónde |
|-----|--------|-------|
| Plazos por bandera editables | ✅ | Campo `diasHabiles` en `metodosPagoIniciales` |

### Corrección (Sesión 25/09/2026):

**Problema**: La page `banderas-catalogo` era un duplicado de `metodos-pago`. "Banderas" en el negocio = métodos de pago (Visa Crédito, Mastercard, etc.) — son la misma cosa.

**Solución aplicada**:

| Qué | Estado | Dónde |
|-----|--------|-------|
| **ELIMINADO** `banderas-catalogo.tsx` | ✅ | Page redundante eliminada |
| **ELIMINADO** `banderas-catalogo.ts` (API) | ✅ | API nunca usada eliminada |
| **ELIMINADO** tab "Banderas" del menú | ✅ | Removido de `gestion.tsx` |
| **AGREGADO** `diasHabiles` a `metodos-pago.ts` | ✅ | Array estático con días por método |
| **AGREGADO** campo editable en `metodos-pago.tsx` | ✅ | Formulario de método de pago ahora incluye días hábiles |
| **ACTUALIZADO** `calendario-acreditaciones.ts` | ✅ | Lee de `metodosPagoIniciales` en vez de BD |

**Archivo modificado**: `admin.comercios.gestion.metodos-pago.tsx`
- Campo "Días hábiles acreditación" en el formulario de método de pago
- Columna "Días háb." en la tabla de métodos de pago
- Al editar un método se puede cambiar sus días de acreditación

### Cómo probar:
1. Ir a `/admin/comercios/gestion/metodos-pago`
2. Verificar columna "Días háb." con valores (1 para débito/prepago, 20 para crédito)
3. Click en Editar → verificar campo "Días hábiles acreditación"
4. Cambiar valor → Guardar → verificar que persiste en la tabla
5. Ir a calendario de acreditaciones → verificar que usa los días configurados

---

## PUNTO 5: Adelantos de Dinero

### Qué dice el documento:
> "El adelanto no puede superar lo que ese comercio vendió"
> "Validación del monto disponible en el servidor"
> "El comercio debe poder aceptar o cancelar la tasa/condiciones"

### Implementado (Sesión 21/09):

| Qué | Estado | Dónde |
|-----|--------|-------|
| Estado "Cancelado" | ✅ | Ya existía en `EstadoAdelanto` |
| **Validación server-side contra ventas** | ✅ | `createAdelanto()` en `adelantos.ts` |

**Validación server-side** (`src/lib/api/adelantos.ts`):
```ts
// Valida: totalVendido - adelantosPendientes >= montoSolicitado
const totalVendido = (ventasData ?? []).reduce(...)
const adelantosPendientes = (adelantosData ?? []).reduce(...)
const montoMaximo = totalVendido - adelantosPendientes;
if (input.montoSolicitado > montoMaximo) throw new DataAccessError(...);
```

### Implementado (Sesión 23/09):

| Qué | Estado | Dónde |
|-----|--------|-------|
| **Botón "Aceptar" en Enterprises** | ✅ | `app.liquidaciones.tsx` + RPC `confirmar_adelanto` |
| **Bloqueo server sin CVU/comisiones** | ✅ | RPC `validar_operacion_comercio` + validación en `createAdelanto` |

**Archivos para botón Aceptar:**
- `supabase/migrationsss/0025_confirmar_adelanto_rpc.sql` — RPC nueva
- `MoliPay-Enterprises/src/routes/app.liquidaciones.tsx` — `handleAceptar()` + botón verde

**Archivos para bloqueo sin CVU:**
- `supabase/migrationsss/0026_validar_operacion_comercio_rpc.sql` — RPC nueva
- `src/lib/api/adelantos.ts` — Validación al crear adelanto

**RPC confirmar_adelanto:**
```sql
UPDATE adelantos
SET estado = 'Acreditado', fecha_resolucion = NOW(), resuelto_por = auth.uid()
WHERE id = p_adelanto_id AND estado = 'Aprobado';
```

**RPC validar_operacion_comercio:**
```sql
-- Retorna true si tiene CVU Y comisiones activas
SELECT (v_cvu_count > 0 AND v_bandera_count > 0)
FROM subcuentas, comercio_banderas, comercio_banderas_cuotas;
```

### Pendiente:
- Permisos solo para Rubén/Elvio (quedó libre para pruebas)

### Cómo probar:
1. Crear un adelanto desde Enterprises
2. Aprobar en Admin con tasa
3. En Enterprises → Ver detalle → Botón "Aceptar oferta" (verde)
4. Click → estado pasa a "Acreditado"
5. Crear commerce sin CVU → intentar adelantar → debe bloquear

---

## PUNTO 6: Comercios y Usuarios

### Qué dice el documento:
> "Los comercios nunca se eliminan, solo se deshabilitan"
> "Falta el campo 'ejecutivo/comercial responsable'"

### Implementado (Sesión 21/09):

| Qué | Estado | Dónde |
|-----|--------|-------|
| Soft delete comercios | ✅ | Ya existía |
| **Ejecutivo responsable en UI** | ✅ | Ver abajo |

**Archivos para ejecutivo:**
- `src/lib/api/comercios.ts` — JOIN con `admin_users`
- `src/lib/api/types.ts` — Campo `ejecutivo: { id, nombre, email }`
- `src/lib/api/mappers.ts` — Mapper actualizado
- `src/routes/admin.comercios.gestion.index.tsx` — Columna "Ejecutivo"

### Implementado (Sesión 23/09):

| Qué | Estado | Dónde |
|-----|--------|-------|
| Bloqueo server-side sin CVU | ✅ | Ver Punto 5 (misma implementación) |

### Pendiente:
- Ninguno de los items de este punto

### Cómo probar:
1. Ir a `/admin/comercios/gestion`
2. Ver columna "Ejecutivo" después de "Nivel"
3. Commerce con ejecutivo → muestra nombre + email
4. Commerce sin asignar → "Sin asignar"

---

## PUNTO 7: CVU vs. CBU

### Qué dice el documento:
> "Eliminar cualquier referencia a 'CBU' de cara al comercio"

### Implementado (Sesión 21/09): ✅ COMPLETO

**9 archivos modificados:**

| Archivo | Cambio |
|---------|--------|
| `src/components/subcuentas-tab.tsx` | "CBU" → "CVU" |
| `src/components/user-modal.tsx` | Placeholder y labels |
| `src/components/movimiento-detail.tsx` | Label |
| `src/routes/admin.general.usuarios.cvu.tsx` | Todo el archivo |
| `src/routes/admin.general.usuarios.$legajo.tsx` | Placeholder y mensajes |
| `src/routes/admin.general.usuarios.juridicas.tsx` | Mensajes |
| `src/routes/admin.general.usuarios.index.tsx` | Mensajes |
| `src/routes/admin.administracion.reportes.tsx` | Labels (no columnas técnicas) |
| `src/routes/legales.comisiones.tsx` | Labels |

**Nota**: Columnas `CBU`, `CTA_BT_DEL_CBU`, `CBU_2` en reportes son datos externos de Coelsa/Payway → no se tocan.

### Pendiente:
- CVU con múltiples subcuentas (definición de negocio pendiente)

### Cómo probar:
1. Buscar "CBU" en UI → no debe aparecer en labels
2. Ir a `/admin/general/usuarios/cvu` → todo dice "CVU"

---

## PUNTO 8: Impuestos

### Qué dice el documento:
> "Ingresos Brutos: % automático desde padrón"
> "Impuesto débito/crédito: 0,6% + 0,6%"
> "Cada cliente necesita configuración individual"

### Estado: ⏸ REQUIERE REUNIÓN DEDICADA

### Lo que ya existe (sin implementar en estas sesiones):
- Campo `ambito` ("Interno"/"Externo") en tabla `impuestos`
- Tabla `dc_excepciones` con `archivo_certificado`, `fecha_vencimiento`
- Job `reactivar_excepciones_vencidas` (3 AM diario)

### Implementado en estas sesiones:
| Qué | Estado | Sesión |
|-----|--------|--------|
| Desglose de impuestos en BD | ✅ Migración aplicada | 23/09 |
| Export con campos separados | ✅ Código actualizado | 23/09 |

### Pendiente:
- IIBB automático desde padrón ARCA
- Débito/crédito tras acreditación real
- Reporte ARCA por tramos
- UI para reactivar exenciones vencidas

---

## PUNTO 9: Configuración General

### Qué dice el documento:
> "Orden cronológico descendente por defecto"

### Implementado (Sesión 21/09): ✅

32 queries ya usan `ascending: false` para `fecha`.

### Cómo probar:
1. Ir a cualquier listado (comercios, lotes, movimientos)
2. Datos ordenados por fecha, más reciente primero

---

## RESUMEN POR SESIÓN

### Sesión 21/09/2026 — Implementado:

| Punto | Qué |
|-------|-----|
| 1 | Calendario de acreditaciones (vista + API) |
| 3 | Exportable por lote (Excel básico) |
| 5 | Validación server-side adelantos contra ventas |
| 6 | Ejecutivo responsable en tabla comercios |
| 7 | CBU → CVU en 9 archivos |
| 9 | Orden cronológico (ya existía) |

### Sesión 23/09/2026 — Implementado:

| Punto | Qué | Archivos |
|-------|-----|----------|
| 3 | Commerce ve sus tasas | `app.liquidaciones.tsx` |
| 3 | Desglose impuestos export + BD | `0027_migracion`, `types.ts`, `lotes.ts`, `lotes.tsx` |
| 5 | Botón "Aceptar" en Enterprises | `0025_rpc`, `app.liquidaciones.tsx` |
| 5 | Bloqueo server sin CVU | `0026_rpc`, `adelantos.ts` |

---

## ARCHIVOS CREADOS (ambas sesiones)

```
supabase/migrationsss/
├── 0025_confirmar_adelanto_rpc.sql
├── 0026_validar_operacion_comercio_rpc.sql
├── 0027_lotes_acreditacion_impuestos_desglose.sql
└── 0028_fix_comision_cierre_lote_monto.sql

src/lib/api/
└── calendario-acreditaciones.ts

src/routes/
└── admin.comercios.link-pago.calendario-acreditaciones.tsx
```

---

## MIGRACIONES APLICAR

Antes de probar el desglose de impuestos, aplicar en Supabase:
```bash
# 0027_lotes_acreditacion_impuestos_desglose.sql  # Campos iva/iibb/debito_credito
# 0028_fix_comision_cierre_lote_monto.sql          # Fix comisión cierre $0 en lotes existentes
```

---

## PENDIENTE TOTAL

| Punto | Qué | Prioridad |
|-------|-----|-----------|
| 1 | Automatización Payway | Bloqueado (Mailen) |
| 3 | Commerce ve sus tasas (faltan datos en BD) | Media |
| 3 | IIBB automático desde padrón | Baja |
| 3 | Base cálculo MoliPay (bruto vs neto) — verificar con Payway | Baja |
| 5 | Permisos Rubén/Elvio adelantos | Media (libre x pruebas) |
| 5 | Débito/crédito tras acreditación | Baja |
| 7 | CVU múltiples subcuentas | Pendiente def. negocio |
| 8 | Todo el punto impuestos | Requiere reunión |

---

## CORRECCIONES — 25/09/2026

### P3-1: Comisión cierre = $0.00 🔴 → ✅

**Problema**: `updateLote` solo recalculaba `importe_neto` si había cambio de contracargo/estado/pct. Lotes creados por Payway nunca ejecutaban esa rama → `comision_cierre_lote_monto` quedaba NULL → frontend mostraba $0.00.

**Fix código** (`src/lib/api/lotes.ts`):
- Removida condición restrictiva — ahora SIEMPRE recalcula `importe_neto` al llamar `updateLote`
- Asegura que `comision_cierre_lote_monto` se guarda en cada update

**Fix BD** (`supabase/migrationsss/0028_fix_comision_cierre_lote_monto.sql`):
```sql
-- Recalcula comisión de cierre para lotes existentes
UPDATE lotes_acreditacion
SET comision_cierre_lote_monto = COALESCE(importe_bruto, 0) * COALESCE(comision_cierre_lote_pct, 0.0045)
WHERE comision_cierre_lote_monto IS NULL OR comision_cierre_lote_monto = 0;

-- Recalcula importe_neto para todos
UPDATE lotes_acreditacion
SET importe_neto = ROUND(importe_bruto - impuestos - tasa_payway_monto - tasa_molipay_monto - contracargo_monto - comision_cierre_lote_monto, 2)
WHERE importe_bruto > 0;
```

### P4-1: Banderas = Métodos de pago (consolidación) 🔴 → ✅

**Problema**: Existían dos pages separadas para lo mismo:
- `banderas-catalogo.tsx` — page para gestionar "banderas" en tabla BD
- `metodos-pago.tsx` — page para gestionar métodos de pago (array estático)

Y en el negocio, "banderas" (Visa, Mastercard) = métodos de pago. Eran la misma cosa duplicada.

**Fix** (restructura completa):

**ELIMINADO**:
- `src/routes/admin.comercios.gestion.banderas-catalogo.tsx` — page redundante
- `src/lib/api/banderas-catalogo.ts` — API nunca usada

**MODIFICADO**:
- `src/data/metodos-pago.ts` — agregado campo `diasHabiles: number` a cada método
- `admin.comercios.gestion.metodos-pago.tsx` — campo editable de días hábiles en el formulario
- `src/lib/api/calendario-acreditaciones.ts` — ahora lee de `metodosPagoIniciales` en vez de tabla BD
- `admin.comercios.gestion.tsx` — NO se agregó tab (se eliminó la page en cambio)

**Resultado**: Un solo lugar para configurar métodos de pago y sus días de acreditación.

### P3-2: Base cálculo MoliPay ⚠️

**Hallazgo**: Las tasas de tu ejemplo (PayWay 4.3% = $39,388.45 y MoliPay 3.5% = $32,060.37) son consistentes entre sí si se calculan ambas sobre el **bruto** ($916,010.52).

El meeting notes dice que MoliPay = "tasa cobrada al comercio − tasa PayWay" (spread), pero los valores snapshot en BD sugieren que Payway aplica ambas tasas sobre el bruto. Esto puede ser correcto si Payway envía los montos ya calculados así.

**Acción requerida**: Verificar con Payway si las tasas deben enviarse sobre bruto o neto, para confirmar si hay discrepancia real.
