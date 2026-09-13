# Flujo del Menú Comercios — MoliPay Admin

> Panel: `/admin/comercios` con `ComerciosProvider` (`src/contexts/comercios.tsx`).  
> Layout raíz: `src/routes/admin.comercios.tsx` + sidebar `src/routes/admin.tsx:49-56`.  
> Permisos: `recurso="comercios"` / `recurso="impuestos"` vía `useCan` + `PermissionGuard`.  
> Datos reales en Supabase con mocks de fallback cuando no hay filas.

```
Admin
└─ Comercios (/admin/comercios → redirect /gestion)
   ├─ Gestión de comercios (/gestion) ──┬─ Comercios (listado + CRUD)
   │                                     ├─ Códigos de categoría (/gestion/categoria)
   │                                     └─ Métodos de pago (/gestion/metodos-pago)
   ├─ Pagos con QR (/transferencia)  [Transferencia/PCT]
   ├─ Enlaces de pago / Link de Pago (/link-pago)
   │   ├─ Links de Pago (/)
   │   ├─ Lotes de Acreditación (/lotes) ──┬─ Por bandera
   │   │                                    └─ Resumen por comercio
   │   ├─ Contracargos (/contracargos)
   │   ├─ Adelantos de Dinero (/adelantos)
   │   └─ Resumen general (/resumen)
   ├─ Impuestos (/impuestos)
   │   ├─ Catálogo Externos/Internos (/)
   │   ├─ Usuarios con impuestos (/usuarios) ──┬─ Asignaciones
   │   │                                        └─ Impuestos por cobrar
   │   ├─ Ingresos Brutos (/ingresos-brutos)
   │   └─ Débitos y Créditos (/debitos-creditos)
   └─ APIs externas (/apis) ──┬─ Usuarios
                              ├─ Endpoints
                              ├─ Restricciones
                              └─ Resolvers
```

---

## 1. Gestión de Comercios (`/admin/comercios/gestion`)

**Archivo:** `src/routes/admin.comercios.gestion.index.tsx` (~1050 líneas), `gestion.tsx` (TabLayout), `gestion.categoria.tsx`, `gestion.metodos-pago.tsx`

**Modelo:** `Comercio` (`src/lib/api/types.ts:478-524`)
```
Comercio {
  id, legajo FK→clientes.legajo, usuario (email), cliente {legajo,nombre,cuit,correo},
  categoriaId FK→codigos_categoria, categoria {codigo,nombre},
  nivel: Pequeño/Mediano/Grande/Premium/Estándar/Básico/Enterprise,
  estado: Activado/Desactivado/Pendiente de aprobación/Rechazado/Suspendido,
  habilitadoPagoTransferencia, habilitadoEnlacesPago,
  metodosConfig: ComercioMetodoConfig[] {metodoId, metodoNombre, tipo, comisionMolipay, comisionPayway, comisionNeta},
  puntosVenta: PuntoVenta[]
}
```

**Listado:**
- `useComercios({page, search, estado, nivel, fechaDesde, fechaHasta})` + `useClientesForSelect` + `useCodigosCategoria`.
- **Filtros unificados en un único contenedor blanco superior** (`Card p-4`): `Buscar (usuario/legajo)`, `Estado`, `Nivel`, `Fecha desde/hasta` + `Limpiar`. `DataTable` tiene `showGlobalFilter={false} dateFilterColumns={[]}` para no duplicar.
- Paginación server-side 10, orden `created_at desc`.

**Acciones por fila:** Ver detalle, Editar, Habilitar/Deshabilitar, Eliminar (con `setComercioEstado`, `deleteComercio`).

**Detalle (`ComercioDetalle`):**
- `max-w-5xl` modal, `Información general` (usuario, legajo con `LegajoCell`, cliente, CUIT, categoría, nivel, estado, fechas, flags transfer/enlaces).
- **Banderas habilitadas** como tabla horizontal (`Método | Tipo | Comisión MoliPay | Comisión PayWay | Comisión neta`).
- **Impuestos totales por pagar** — Card agregado tras refactor impuestos: `MOCK_IMPUESTOS_POR_COBRAR` filtrado por legajo, fallback `metodosConfig.length*8500 + comisiones`. Muestra suma mock + link a impuestos.
- Resumen con nota de QR/links.

**Alta/Edición (`ComercioFormModal`):**
- `FormDialog size="xl" (max-w-4xl)` para que banderas entren horizontal.
- Campos: cliente (combobox búsqueda server-side debounce 350ms, `useClientesForSelect`), usuario email, categoría `select`, nivel, estado.
- **Banderas habilitadas** re-maquetado en **fila horizontal por bandera**: header `Bandera/Método | MoliPay | PayWay | Neta`; cada fila `grid-cols-[1.6fr_1fr_1fr_1fr]` con `checkbox + nombre/tipo` + 2 `Input` % + `div` neta calculada `molipay - payway`. `overflow-x-auto min-w-[680px]` evita apilar vertical. Validación `^[0-9]*[.,]?[0-9]*$`.

**Sub-rutas:**
- **Códigos de categoría** — CRUD `codigos_categoria` (código, nombre, descripción, estado).
- **Métodos de pago** — catálogo `metodosPagoIniciales` (`src/data/metodos-pago.ts`: Visa/Mastercard/Amex/Cabal etc con `tipo`). Es la fuente para `metodosDisponibles` en gestión.

**Interacción:**
- Crear comercio → `createComercio({legajo, usuario, categoriaId, nivel, estado, metodosConfig})` → invalida `["comercios"]`.
- `legajo` es FK real a `clientes.legajo`; el combobox impide texto libre.
- `metodosConfig` se guarda como `jsonb` en `comercios.metodos_config`.

---

## 2. Pagos con QR / Transferencia (`/admin/comercios/transferencia`)

**Archivos:** `transferencia.tsx` (layout), `transferencia.index.tsx` (Pagos QR/PCT)

**Modelo:** `PuntoVenta` / `tipo='pago_pct'` vía `MovimientosSubRoute` (`tipoCode="pago_pct"`).

**Flujo:** QR/POS creados en Enterprise → PayWay los activa → Admin cambia estados (`Activado/Desactivado/...`). Muestra `qrUrl`, `cajero`, `tipo`.

**Impuestos QR:** `admin.general.movimientos.pagos-qr.tsx` añade Card `Comisión MoliPay — Pago por QR` con `Input` 0-0.8% (validación `parseFloat>0.8 => error`, guardado con `toast`). Es el **único** lugar donde se configura la comisión QR (punto 13 instructivo).

---

## 3. Link de Pago (`/admin/comercios/link-pago`)

**Layout tabs:** `src/routes/admin.comercios.link-pago.tsx:14-19`
```
Links de Pago (/) | Lotes (/lotes) | Contracargos (/contracargos) | Adelantos (/adelantos) | Resumen general (/resumen)
```

### 3.1 Links de Pago (`link-pago.index.tsx`)

- **Modelo:** `EnlacePago` (`src/lib/api/enlaces-pago.ts`): `id, cliente_legajo, comercio_nombre, url, monto, estado, referencia, notas, expira_en, pagos_parciales, metodos_pago, vistas, pagos, cajero, pago? {metodoPago, tipoTarjeta, marcaTarjeta, cuotas, importePagado}`.
- **Estados:** `Pendiente de aprobación | Activado | Desactivado | Contracargo | Cancelado | Pagado` (+ legacy mapeados).
- **Filtros:** Antes había input+select fuera del contenedor duplicado; tras instructivo solo **contenedor blanco de `DataTable`**: `Buscar` (global sobre `url/comercioNombre`) + `Estado` enum dentro ( `filterOptions: ESTADOS_ENLACE`). `queryKey ["enlaces-pago", page]` + Realtime `cliente_links_pago` channel.
- **Tabla:** `url | Comercio | Usuario | Cajero | Monto | Estado (Badge) | Fecha` + `ActionsDropdown` (Ver, Cambiar estados, Eliminar).
- **Detalle:** Card Enlace + Card Pago (solo si Pagado/Contracargo) + leyenda ciclo.

### 3.2 Lotes de Acreditación (`link-pago.lotes.tsx`)

**Concepto:** Lote **por bandera** generado por MoliPay en corte diario. Un comercio puede tener N lotes el mismo día (uno por Visa, otro Mastercard...). Agrupa pagos de esa bandera.

**Modelo:**
```
Lote {id, fecha DD/MM/YYYY, comercio, legajo, bandera, cantidadOps, importeBruto, impuestos, tasaPayWayPct/Monto, tasaMoliPayPct/Monto, importeFinal, estado: Acreditado/Rechazado/Contracargo, linksIds[], cuotas?, costoPayWayPagoUnico?}
```

**Mocks:** 6 lotes (Delta SRL Visa+Mastercard, Tercer Red Visa, Zeta Amex, Eta Cabal, Alpha Visa). Ejemplos cuotas 6 y 3 con `costoPayWayPagoUnico`.

**Filtros unificados:** Solo contenedor blanco de `DataTable` con `Buscar (Comercio/Legajo) | Bandera enum | Fecha | Estado enum`. Eliminados recuadros amarillos de explicación y filtros externos duplicados.

**Tabs internos:**
- **Lotes por bandera** — tabla `Fecha | Lote | Comercio/Legajo | Bandera (pill) | Ops (+Xc si cuotas>1) | Importe a acreditar | Estado` + KPIs Acreditados/Contracargo/Rechazados.
- **Resumen por comercio** — `ResumenComercio {comercio, legajo, cantidadLotes/Ops, totalBruto, totalImpuestos, totalPayWay, totalMoliPay, totalFinal, pendienteAcreditar, pendienteImpuestos}` agregado via `useMemo` groupBy. Columnas: `Comercio | Pendiente de acreditar (=máximo adelantable) | Pendiente impuestos | Comisión PayWay | Neto MoliPay | Total a pagar`. Acción `Ver detalle` abre `ComercioDetalleModal` con KPIs + sección **Adelantos** (`MOCK_ADELANTOS_BY_LEGAJO`: Pendiente/Aprobado).

**Detalle Lote (`LoteDetalle`):**
- Sin texto “Lote generado por MoliPay — corte diario”.
- Header con `Fecha | Comercio | Bandera | Estado`.
- **Detalle financiero:** `Importe bruto | Impuestos (-)| Menos impuestos | Tasa PayWay (3%) | Tasa MoliPay (neto: cobrada - PayWay) | [Costo PayWay por pago único si cuotas>1] | Total descuentos | Importe final`. Sin `Comisiones MoliPay` (eliminada).
- Lista de `linksIds` como pills.

**Interacción con Impuestos:** `impuestos` es parte del desglose (`impuestos` + `menosImpuestos`), se refleja también en resumen por comercio como `totalImpuestos/pendienteImpuestos`.

### 3.3 Contracargos (`link-pago.contracargos.tsx`)

- **Modelo:** `Contra {id, linkId, linkUrl, comercio, legajo, estado: Abierto/En mediación/Cerrado acreditado/retenido, fecha, importe, ticketPayway, motivo, docPresentada}`.
- **Filtros:** Eliminado `select estado` superior; `Buscar` (id/link/comercio/ticket) + `Estado` enum + `Fecha` **dentro** del contenedor blanco de `DataTable` (`filterable:true` en id/comercio/ticket, `filterable:"date"` en fecha). Ya no hay `q/estado` state ni `filtered` manual.
- **Ciclo:** Abierto (PayWay retiene) → En mediación (MoliPay presenta doc + ticket) → Cerrado acreditado (venta verificada) / retenido (no autorizado, flujo `Visa→PayWay→MoliPay→comprador`).
- KPIs por estado.

### 3.4 Adelantos de Dinero (`link-pago.adelantos.tsx`)

- **Modelo:** `Adelanto {id, comercio, legajo, fechaSolicitud, importeSolicitado, plazoSolicitado, plazoContractual, comision, tasaEfectiva, estado, notas, comisionOfrecidaPct, pendienteAcreditar}`.
- **Filtros:** `Solicitud`, `Comercio` con `filterable:true` + `Estado` enum dentro de `DataTable` blanco. Eliminado `flex` externo con input/select.
- **Regla:** `MOCK_PENDIENTE_BY_LEGAJO` mapea `pendienteAcreditar` por comercio. Guardar valida `importeSolicitado <= max` y si `Pendiente→Aprobado` exige `comisionOfrecidaPct`.
- **Detalle:** Campos `Importe solicitado | Estado | Plazo | Máximo adelantable (=pendiente)` + **concepto compacto 1 línea** (`Cobro anticipado sobre 30d 3% → 15d 4% → 1d 6%`) en `border bg-muted/20 px-3 py-2` (antes ocupaba Card grande). **Eliminado** bloque `Comisión / tasa` predeterminado; solo queda input `Porcentaje de comisión ofrecido` (editable solo si `Pendiente`, se persiste al aprobar y se muestra como `→ X%` en tabla).
- KPIs por estado.

### 3.5 Resumen General (`link-pago.resumen.tsx`)

- **Ruta nueva** `/resumen` añadida a `TabLayout`.
- **KPIs por período** (`hoy/ayer/7d/30d` via `select`): `DATA_BY_PERIOD {pendiente, recaudadora, netoMoliPay, netoPayWay, impuestos, bruto}`.
- **Grid 3 cols:** `Total pendiente (=máximo adelantable) | Total disponible cuenta recaudadora | Total bruto | Neto MoliPay (primary) | Neto PayWay | Impuestos`.
- **Resultado económico del período** — **debajo de los KPIs** (Card con `Bruto | Impuestos | Neto PayWay | Neto MoliPay | Disponible+pendiente`).
- **Impuestos por pagar por comercio** — Card después del resultado, tabla `getImpuestosPorComercio()` (mock compartido `src/data/impuestos-por-cobrar.ts`) con `Comercio | Impuesto pendiente | Pagado | Total | Detalle (impuesto+bandera+lote)`.

**Interacción Lotes ↔ Adelantos ↔ Resumen ↔ Impuestos:**
- `Resumen por comercio.pendienteAcreditar` = `máximo adelantable` para Adelantos.
- `Detalle comercio` muestra `Adelanto por aprobarse` si existe para ese legajo.
- `Lotes por bandera` no incluyen adelantos (concepto consolidado solo en `Resumen por comercio/General`).

---

## 4. Impuestos (`/admin/comercios/impuestos`)

**Layout tabs:** `src/routes/admin.comercios.impuestos.tsx:17-22`
```
Impuestos (/) | Usuarios con impuestos (/usuarios) | Ingresos Brutos (/ingresos-brutos) | Débitos y créditos (/debitos-creditos)
```

### 4.1 Catálogo (`admin.comercios.impuestos.index.tsx`)

- **Modelo:** `Impuesto {id, codigo, nombre, descripcion, tipo: Porcentaje/Fijo/Otro, monto, estado: Activo/Inactivo, ambito: Externo/Interno, alicuotas, createdAt}` + `ImpuestoRow {ambito?}`.
- **Separación Externos/Internos:** Nuevo `AmbitoImpuesto = "Externo"|"Interno"` (`types.ts` + `mappers.ts` con fallback via `descripcion` prefix `[Interno]` o `localStorage("impuestos_ambito_map")` si columna no existe en DB).
- **API:** `listImpuestos` intenta `select` con `ambito`; si error columna inexistente hace fallback. `create/update` persisten ámbito local y codifican en descripción.
- **UI:** Tabs internos `Externos` / `Internos` (state `tab`, `filteredRows`, conteos) + `DataTable` filtrada, columna `Ámbito (Badge success/neutral)`. Form modal con `select ambito`. Columnas: `Código | Nombre | Tipo | Monto | Ámbito | Estado`.

### 4.2 Usuarios con Impuestos (`impuestos.usuarios.tsx`)

- **Modelo:** `ImpuestoAsignacion {id, clienteLegajo, impuestoId, tipo, monto, estado, fechaAsignacion, impuesto {codigo,nombre}, cliente {legajo,nombre,cuit}}`.
- **Asignación simplificada (instructivo último):** Form solo `Legajo + Impuesto + Estado` (eliminados `Tipo`/`Monto`). `guardar` envía `tipo:"Porcentaje", monto:0` fijo.
- **Filtros unificados en UN contenedor blanco** `bg-card border rounded-lg p-4`: `Buscar (código/nombre) + Estado + Fecha desde + Fecha hasta` (nuevos `searchDesde/Hasta` state). Antes eran 2 contenedores.
- **Tabs internos:**
  - **Asignaciones** — tabla `Legajo | Cliente | Impuesto aplicado | Tipo | Monto | Estado | Fecha asignación` + paginación, acciones Activar/Desactivar/Editar/Eliminar.
  - **Impuestos por cobrar** — nuevo `ImpuestosPorCobrarTab` con **2 sub-tabs** (`Impuestos por cobrar` vs `Historial`) en lugar de 3 bloques apilados. Eliminado filtro general fecha superior (duplicaba el del contenedor). Data: `MOCK_IMPUESTOS_POR_COBRAR` (5 usuarios, 14 registros con `usuario, legajo, loteId, bandera, impuesto, monto, estado pendiente/pagado, fechaLote`). `subTab` controla: por_cobrar muestra `loteActual` (IDs `LOTE-2026-09-07-*`) + KPIs pendiente; historial muestra pagados. Sin filtro general duplicado.

**Interacción Impuestos ↔ Comercios/Usuarios:**
- Asignar impuesto a legajo → `createImpuestoAsignacion` → `invalidar ["impuestos_asignaciones"]` → visible en `admin.general.usuarios.$legajo` y en `Lotes` si aplica retención.

### 4.3 Ingresos Brutos (`impuestos.ingresos-brutos.index.tsx`)

- **Tramos:** `reportesIniciales` (`src/data/impuestos.ts`) ampliado a 12 registros: 4 tramos/mes ×3 meses (Tramo 1:1-10, Tramo 2:10-20, Tramo 3:20-30, Mensual resumen) con `periodo, tramo, fechaCreacion, presentado, pagado, totalMovimientos, totalMontos, totalRetenciones`.
- **Gestión de Padrones:** Antes era sección grande `bg-card border` siempre visible. Ahora es **popup** `FormDialog` disparado por botón `Cargar padrón` **fuera de los filtros** (`showPadronPopup` state, `FileDropzone accept=".txt"` + validación `.txt`). Mantiene `impuestoId, nombre, file, formError`.
- **Eliminado:** Sección `Padrones cargados` (tabla `IbPadron` con búsqueda) y toda **Normalización Retroactiva** (`PreviewModal`, `abrirPreview`, `aplicarNormalizacion`, tipos `PreviewKPIs`, columnas).
- **Reportes:** `ReportesMock` con columns `Periodo | Tramo | Fecha creación | Presentado | Pagado | + Monto total, Total movimientos, Total retenciones, Impuesto por mov (calculado)`. Acción `Ver detalle` abre `ReporteDetalleModal` `max-w-5xl` con KPIs + `DataTable` completa de usuarios (mock `generarUsuariosParaReporte`: 10-20 usuarios/tramo con `cuit, nombre, tasa variable, monto, retención`) + botón `Descargar TXT` (padrón subido). Tasa variable reflejada por usuario.

### 4.4 Débitos y Créditos (`impuestos.debitos-creditos.tsx`)

- **Tasa fija:** `0,6% + 0,6% = 1,2% total` mostrada como bloque informativo en modal `Nueva excepción`; sin campo editable. `guardarAlta` fuerza `tasa: 1.2`.
- **Frecuencia semanal:** `PageHeader` y modal notas `Presentación semanal.` + `Este impuesto se presenta una vez por semana.` (reemplaza mensual).
- **Eliminada Sincronización Retroactiva completa:** Borrados `SyncPreviewModal`, `srForm, previewSync, syncRows`, `generarSyncPreview, confirmarEjecucion`, `srInfo`, `syncColumns`, imports `PlayCircle, useDcSyncRetroactivos, createDcSyncRetroactivo, etc`. Ahora solo `Alta manual` de excepciones (`Excepción` con `email, cuit, direccion: Entrantes/Salientes/Ambos` → crea 1 o 2 filas, `motivo, vigencia desde/hasta, autorizacion`).

---

## 5. APIs Externas (`/admin/comercios/apis`)

**Layout:** `apis.tsx:15-18` tabs `Usuarios | Endpoints | Restricciones | Resolvers`

- **Usuarios** (`apis.index.tsx`): `ApiUsuario {codigoUsuarioApi, usuario, nombreCompleto, estado: Pendiente Validación/Homologación/Producción...}` + paginación, `createApiUsuario`, `setApiUsuarioEstado`.
- **Endpoints** (`apis.endpoints.tsx`): `ApiEndpoint {nombre, path, metodo: GET/POST..., grupo: Autenticación/Enlaces de pago/QR..., estado, rec}`.
- **Restricciones** (`apis.restricciones.tsx`): `ApiRestriccion {apiUsuarioId, estado: Restringiendo/No..., fechaCreacion/Expiracion}`.
- **Resolvers** (`apis.resolvers.tsx`): `Resolver {nombre, cuit, url, estado Activo/Inactivo, nombreReverso, formatoWeb, pcpId, token, asHeader, soa}`.

---

## 6. Transversal: Impuestos, Acreditaciones y Rentabilidad

**Flujo objetivo:** `qué impuesto → a qué usuario/comercio → cuánto → en qué lote/tramo → cuánto pagado → cuánto pendiente → detalle movimientos`

| Capa | Fuente | Ejemplo | Estado | Lote/Tramo |
|------|--------|---------|--------|------------|
| Catálogo | `impuestos` (Externo IVA/IIBB) | `IVA 21% (Externo)` | Activo | — |
| Asignación | `impuestos.usuarios` (LPF-20111111111 → IVA) | Legajo+Impuesto+Estado | Activo | — |
| Por cobrar | `impuestos-por-cobrar.ts` + `impuestos.usuarios` tab por cobrar | `Juan Pérez — IVA $12.300 — pendiente — LOTE-2026-09-07-001 Visa` | pendiente | Lote actual (Visa) |
| Lote | `link-pago/lotes` detalle financiero | `Impuestos $26.250 — Menos impuestos $1.223.750` | Acreditado | `LOTE-2026-09-07-001` |
| Comercio | `gestion` detalle + `link-pago/resumen` impuestos por comercio | `Delta SRL — pendiente $45.000 — pagado $120.000` | — | Agregado por legajo |
| Usuario detalle | `admin.general.usuarios.$legajo` tabs `Impuestos` + `Contexto Operativo` | `Impuestos pagados/pendientes` + `Impuestos por cobrar` mini tabla | — | Con `loteId` y `tasa variable` |
| Ingresos Brutos | `ingresos-brutos` Reportes | `2026-03 Tramo 1 — 45 mov — $1.2M — $45k ret — 1.2% fijo` | Presentado/No | Tramo 1-3/Mensual + TXT |
| Débitos/Créditos | `debitos-creditos` | `Excepción LPF-... — 1,2% — semanal` | Activo | Semanal |

**Tipos de impuestos:**
- **Externos:** MoliPay retiene al cliente para pagar a ente (IVA, IIBB, Débitos/Créditos). Van en lotes/tramos, se descuentan de `Importe bruto`.
- **Internos:** Ganancias propias de MoliPay (ej. `Ganancias 15% (Interno)`). Se exponen en catálogo pero no se retienen al cliente.

**Lotes por bandera vs Mensual/Tramo:** Lote = corte diario por bandera (Visa separa de Mastercard). Tramo IIBB = ventana 10 días + mensual agregado. Ambos generan `impuestos por cobrar` y alimentan `Resumen General` (`netoMoliPay` es la tasa neta que queda para MoliPay).

---

## 7. Interacción entre componentes

```
Cliente (clientes.legajo) ──FK──► Comercio (legajo) ──┬─► PuntoVenta (PCT/QR, QR comisión 0.8%)
                                                  ├─► Link de Pago (cliente_links_pago)
                                                  │       ├─► Lote (por bandera, con impuestos/tasas)
                                                  │       ├─► Contracargo (disputa de un link, descuenta del lote)
                                                  │       ├─► Adelanto (sobre pendienteAcreditar del Resumen por comercio)
                                                  │       └─► Resumen General (KPI global + impuestos por comercio)
                                                  ├─► Impuestos (asignación + por cobrar)
                                                  │       ├─► IIBB padrones TXT → Tramos → Reportes con usuarios/tasas
                                                  │       └─► Débitos/Créditos 1,2% semanal → Excepciones
                                                  └─► Impuestos por cobrar (mismo store para gestión/resumen/usuario)
```

- **Comercio ↔ Impuestos:** Asignar impuesto en `impuestos/usuarios` (legajo) → aparece en `gestion` detalle, en `lotes` desglose, en `resumen` impuestos por comercio y en `usuarios/$legajo`.
- **Lote ↔ Adelanto:** `Resumen por comercio.pendienteAcreditar` (=`totalFinal`) es `Máximo adelantable`; Adelanto valida `importeSolicitado <= pendiente`.
- **Lote ↔ Contracargo:** Un link en `Pagado` puede pasar a `Contracargo`; el lote de ese día resta ese importe.
- **Lote ↔ Cuotas:** Si `cuotas>1`, `costoPayWayPagoUnico` se suma a `tasaPayWay` en total descuentos.
- **APIs ↔ Comercios:** `comerciosPst` y `linksPago` leídos en `admin.general.usuarios.$legajo` tabs `Módulos y productos` / `Contexto Operativo`.

---

## 8. Archivos clave por carpeta

```
src/
├─ routes/
│  ├─ admin.comercios.tsx (ComerciosProvider)
│  ├─ admin.comercios.gestion.tsx / gestion.index.tsx / gestion.categoria.tsx / gestion.metodos-pago.tsx
│  ├─ admin.comercios.transferencia.tsx / transferencia.index.tsx
│  ├─ admin.comercios.link-pago.tsx (+ index, lotes, contracargos, adelantos, resumen)
│  ├─ admin.comercios.impuestos.tsx (+ index, usuarios, ingresos-brutos*.tsx, debitos-creditos.tsx)
│  └─ admin.comercios.apis*.tsx + admin.general.usuarios.$legajo.tsx + admin.general.movimientos.pagos-qr.tsx + admin.administracion.reportes.tsx
├─ lib/api/
│  ├─ tipos: comercios.ts, impuestos.ts, tipos.ts (AmbitoImpuesto, TipoImpuesto), mappers.ts
│  ├─ hooks: useComercios, useImpuestos, useDcExcepciones, useCodigosCategoria
│  └─ data: metodos-pago.ts, impuestos.ts (reportesIniciales), impuestos-por-cobrar.ts (mock por cobrar)
├─ components/
│  ├─ data-table.tsx (contenedor blanco con Buscar + Estado + Fecha)
│  ├─ form-dialog.tsx (size md/lg/xl/2xl), tab-layout.tsx, portal-shell.tsx, kpi-card.tsx
│  └─ legajo-label.tsx, movimientos-subroute.tsx
└─ contexts/comercios.tsx
```

Generado: 2026-09-09 — Incluye refactor últimos instructivos (Link de Pago filtros/bandera/resumen, Impuestos externos/internos, IIBB TXT/tramos, DC 1,2% semanal, impuestos por cobrar multi-vista).
