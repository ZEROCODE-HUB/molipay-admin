# Avance — Detalle Reunión Revisión Plataforma MoliPay (15/09/2026)

**Fecha de avance**: 21 de septiembre de 2026
**Estado**: En desarrollo

---

## Implementaciones completadas

### 1. CBU → CVU en la UI ✅

**Cambio**: Reemplazo de todas las referencias a "CBU" por "CVU" en la interfaz de usuario, dado que MoliPay como PSP no puede emitir CBU (cuenta bancaria) — solo CVU (cuenta virtual).

**Archivos modificados** (9 archivos, ~38 menciones):

| Archivo | Cambio |
|---------|--------|
| `src/components/subcuentas-tab.tsx` | Header "CBU" → "CVU" |
| `src/components/user-modal.tsx` | Placeholder y label "CBU" → "CVU" |
| `src/components/movimiento-detail.tsx` | Label "CVU/CBU" → "CVU" |
| `src/routes/admin.general.usuarios.cvu.tsx` | Todo el archivo renombrado a CVU |
| `src/routes/admin.general.usuarios.$legajo.tsx` | Menciones en placeholders y mensajes |
| `src/routes/admin.general.usuarios.juridicas.tsx` | Mensajes de confirmación |
| `src/routes/admin.general.usuarios.index.tsx` | Mensajes de confirmación |
| `src/routes/admin.administracion.reportes.tsx` | Descripción y datos de unidad de negocio |
| `src/routes/legales.comisiones.tsx` | Labels de operaciones |

**Nota**: Las menciones restantes de "CBU" en `admin.administracion.reportes.tsx` (columnas `CBU`, `CTA_BT_DEL_CBU`, `CBU_2`) son nombres de columnas de archivos de conciliación externos (Coelsa) y no deben modificarse.

---

### 2. Ejecutivo responsable en comercio ✅

**Cambio**: Se muestra el nombre y email del ejecutivo/comercial responsable asignado a cada comercio en la vista de gestión de comercios.

**Archivos modificados**:

| Archivo | Cambio |
|---------|--------|
| `src/lib/api/comercios.ts` | Agregado JOIN con `admin_users` en COLUMNS |
| `src/lib/api/types.ts` | Agregado campo `ejecutivo: { id, nombre, email }` al tipo `Comercio` |
| `src/lib/api/mappers.ts` | Actualizado `toComercio` para mapear datos del ejecutivo |
| `src/routes/admin.comercios.gestion.index.tsx` | Nueva columna "Ejecutivo" en la tabla |

**Estado BD**: El campo `ejecutivo_responsable_id` ya existía en la tabla `comercios`. La columna en BD ya estaba configurada. Solo se habilitó la visualización en la UI.

---

### 3. Validación server-side para adelantos ✅

**Cambio**: Se agregó validación en el API de adelantos para asegurar que el monto solicitado no supere lo que el comercio efectivamente vendió con tarjeta.

**Archivo modificado**: `src/lib/api/adelantos.ts`

**Lógica implementada**:
```
monto_maximo = total_vendido_con_tarjeta - adelantos_pendientes_aprobados
si (monto_solicitado > monto_maximo) → error
```

**Nota**: La validación completa requiere una RPC en Supabase para mayor seguridad en producción. El código actual incluye un try/catch que permite continuar si la consulta falla (validación en frontend como fallback).

---

### 4. Exportable por lote (Excel) ✅

**Cambio**: Se agregó botón de exportar en el modal de detalle de cada lote de acreditación, generando un archivo Excel con todos los campos financieros.

**Archivo modificado**: `src/routes/admin.comercios.link-pago.lotes.tsx`

**Campos incluidos en el export**:
- Código, Fecha, Comercio, Legajo, Bandera, Cuotas
- Cantidad de operaciones
- Importe bruto, Impuestos
- Tasa PayWay (%), Tasa PayWay ($)
- Tasa MoliPay (%), Tasa MoliPay ($)
- Comisión cierre de lote (%), Comisión cierre de lote ($)
- Contracargo, Importe neto, Estado

**Formato**: `.xlsx` (Excel)

---

### 5. Calendario de Acreditaciones ✅

**Cambio**: Nueva vista de calendario mensual que muestra cuándo se acreditarán los lotes de venta según los días hábiles de cada bandera.

**Archivos creados**:

| Archivo | Descripción |
|---------|-------------|
| `src/lib/api/calendario-acreditaciones.ts` | API que consulta `v_lotes_venta` y calcula fechas estimadas |
| `src/routes/admin.comercios.link-pago.calendario-acreditaciones.tsx` | Vista del calendario con grid mensual |

**Características implementadas**:
- Grid calendario 7×5/6 (lunes a domingos)
- Navegación entre meses
- Filtros por comercio y bandera
- Cards de acreditaciones por día con comercio, bandera e importe
- Indicadores visuales: verde = acreditado, ámbar = pendiente
- Totales del mes: total, pendientes, acreditados

**Ruta**: `/admin/comercios/link-pago/calendario-acreditaciones`

**Integración menú**: Agregado al tabs de Link de Pago.

---

## Pendientes / Items bloqueados

| Item | Estado | Bloqueado por |
|------|--------|---------------|
| Automatización carga Payway | ⏸ Pendiente | Mailen confirmando número de establecimiento con Roxana |
| Asignación CVU múltiples subcuentas | ⏸ Pendiente | Definición de negocio pendiente |
| Impuestos (IIBB automático, reporte ARCA) | ⏸ Pendiente | Reunión dedicada de impuestos requerida |
| Cálculo automático IIBB desde padrón | ⏸ Pendiente | Información del padrón ARCA |

---

## Archivos modificados/resumen

### Archivos creados
- `src/lib/api/calendario-acreditaciones.ts` (nuevo)
- `src/routes/admin.comercios.link-pago.calendario-acreditaciones.tsx` (nuevo)

### Archivos modificados
- `src/components/subcuentas-tab.tsx`
- `src/components/user-modal.tsx`
- `src/components/movimiento-detail.tsx`
- `src/routes/admin.general.usuarios.cvu.tsx`
- `src/routes/admin.general.usuarios.$legajo.tsx`
- `src/routes/admin.general.usuarios.juridicas.tsx`
- `src/routes/admin.general.usuarios.index.tsx`
- `src/routes/admin.administracion.reportes.tsx`
- `src/routes/legales.comisiones.tsx`
- `src/lib/api/comercios.ts`
- `src/lib/api/types.ts`
- `src/lib/api/mappers.ts`
- `src/routes/admin.comercios.gestion.index.tsx`
- `src/lib/api/adelantos.ts`
- `src/routes/admin.comercios.link-pago.lotes.tsx`
- `src/routes/admin.comercios.link-pago.tsx` (menú)
