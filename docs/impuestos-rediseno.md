# Rediseño funcional del módulo de Impuestos — Análisis, propuesta y plan de pruebas

> **Estado:** ✅ **IMPLEMENTADO** (commit `e26ef39`). Este documento fue el diseño previo; la implementación coincide fielmente con lo propuesto. Ver §10 (estado de implementación).
> **Alcance:** Solo el módulo `Impuestos` (`/admin/modulos/impuestos` y sus sub-rutas). No se toca ningún otro módulo.
> **Objetivo:** Rediseñar el módulo en 4 pestañas (Impuestos, Usuarios con Impuestos, Ingresos Brutos, Débitos y Créditos) siguiendo un patrón ERP tributario moderno, con acciones guiadas paso a paso.

---

## 1. Estado actual (análisis de la implementación existente)

Archivo: `src/routes/admin.modulos.impuestos.tsx` (79 líneas, una sola página).

**Lo que hace hoy:**
- Muestra un banner explicativo con la lógica de negocio (impuestos propios de Molly vs. retenidos al cliente).
- Una única tabla `DataTable` con columnas: `ID`, `Tipo` (Débito/crédito | Ingresos Brutos), `Periodo`, `Monto retenido`, `Fecha transferencia`, `Estado` (Transferido | Pendiente).
- Datos 100% mock (`taxData`, 12 filas), sin CRUD, sin detalle, sin filtros funcionales de negocio.

**Componentes reutilizados hoy:** `DataTable`, `PageHeader`, `Badge`.

---

## 2. Inconsistencias detectadas

| # | Inconsistencia | Impacto |
|---|----------------|---------|
| I-1 | La pantalla actual es **reporting de transferencias**, no configuración. No existe el concepto de *tipos de impuestos* ni *tasas/alícuotas*. | Imposible administrar impuestos ni sus tasas. |
| I-2 | No hay CRUD de impuestos (ver/editar/eliminar) ni vista de detalle con tasas. | No cumple el Tab 1. |
| I-3 | No existe la relación **Usuario ↔ Impuesto** (historial de asignaciones). | No cumple el Tab 2. |
| I-4 | "Ingresos Brutos" hoy es solo una fila de la tabla; el nuevo spec pide 3 sub-funcionalidades (Padrones, Normalización retroactiva, Reportes). | No cumple el Tab 3. |
| I-5 | No existen **excepciones** (alta manual, sin retroactivo, tabla de excepciones). | No cumple el Tab 4. |
| I-6 | **Colisión de nombres:** "Débito/crédito" es un *tipo de impuesto* en el banner, pero "Débitos y Créditos" es el nombre de la pestaña 4 (que trata sobre *excepciones a retenciones*). | Riesgo de confusión para el usuario. |
| I-7 | El spec dice en Tab 2 *"Al crear o editar un impuesto debe poder definirse el tipo"*, pero la definición de tipo pertenece al catálogo (Tab 1). Frase posiblemente mal ubicada. | Ambigüedad a resolver (ver §4). |
| I-8 | No hay patrón de **asistente/pasos** (preview → revisar → confirmar) para procesos destructivos. | No cumple UX exigida para normalización y sin-retroactivo. |

---

## 3. Organización propuesta

### 3.1 Rutas (file-based routing de TanStack)
Se convierte `admin.modulos.impuestos.tsx` en un **layout padre** con `TabLayout` de 4 pestañas, y se crean sub-rutas:

```
admin.modulos.impuestos.tsx                         (layout: 4 tabs principales)
├─ admin.modulos.impuestos.index.tsx                Tab 1: Impuestos (catálogo + detalle)
├─ admin.modulos.impuestos.usuarios.tsx             Tab 2: Usuarios con Impuestos
├─ admin.modulos.impuestos.ingresos-brutos.tsx      Tab 3: layout interno de 3 sub-tabs
│  ├─ .ingresos-brutos.index.tsx                    Sub 3.1: Gestión de Padrones
│  ├─ .ingresos-brutos.normalizacion.tsx            Sub 3.2: Normalización Retroactiva
│  └─ .ingresos-brutos.reportes.tsx                  Sub 3.3: Reportes de Impuestos
└─ admin.modulos.impuestos.debitos-creditos.tsx     Tab 4: Débitos y Créditos
```

- Las 4 pestañas principales usan el `TabLayout` existente (mismo patrón que `usuarios.tsx` / `registros.tsx`).
- Tab 3 usa un **segundo `TabLayout` interno** para separar Padrones / Normalización / Reportes (evita una página inmanejable y mejora trazabilidad).
- Tab 4 es una sola página con: acciones (Alta manual, Sin retroactivo) + tabla de Excepciones.

### 3.2 Descripción funcional por pestaña (breve, visible en cada header)
- **Impuestos:** "Catálogo de tipos de impuestos de la plataforma y sus alícuotas."
- **Usuarios con Impuestos:** "Historial de asignaciones de impuestos a usuarios."
- **Ingresos Brutos:** "Carga de padrones, normalización retroactiva y reportes de presentación."
- **Débitos y Créditos:** "Excepciones a retenciones y procesos sin efecto retroactivo."

### 3.3 Resolución de ambigüedades
- **Tipo de impuesto (porcentaje / fijo / otro):** se define al **crear/editar en Tab 1** (catálogo). Tab 2 solo *lista* asignaciones; la frase del spec se interpreta como "el tipo ya quedó definido en el impuesto". Se documenta y se confirma con el usuario.
- **Colisión Débito/crédito:** en Tab 1 el tipo se llama `Débito/Crédito (sellos)`. La pestaña 4 se etiqueta explícitamente como **"Débitos y Créditos — Excepciones"** para desambiguar.

---

## 4. Modelo de datos sugerido (mock, en memoria)

```ts
type Estatus = "Activo" | "Inactivo";

// Tab 1
type Tasa = { codigo: string; tasa: string; descripcion: string; estado: Estatus };
type Impuesto = {
  id: number; nombre: string; descripcion: string;
  tipoImpuesto: "Porcentaje" | "Fijo" | "Otro";
  estado: Estatus;
  fechaCreacion: string; fechaActualizacion: string;
  tasas: Tasa[];
};

// Tab 2
type AsignacionImpuesto = {
  usuario: string; nombreCompleto: string; impuesto: string;
  tipo: string; estado: Estatus; fechaAsignacion: string;
};

// Tab 3.1 Padrón
type Padron = {
  id: number; impuesto: string; nombre: string; archivo: string;
  estado: "Cargando" | "Procesando" | "Finalizado" | "Error"; progreso: number;
};

// Tab 3.2 Normalización (preview)
type PreviewKPIs = {
  usuariosAnalizados: number; impuestosRevisados: number; impuestosCreados: number;
  impuestosDesactivados: number; cargosAjustados: number; registrosOmitidos: number;
  errores: number; diferencias: string;
};
type ImpuestoCreado = { cuit: string; impuesto: string; tasa: string; usuario: string };
type ImpuestoDesactivado = { cuit: string; impuesto: string; tasa: string; usuario: string; motivo: string };
type Omitido = { cuit: string; motivo: string; usuario: string };

// Tab 3.3 Reporte
type ReporteImpuesto = {
  id: number; periodo: string; tramo: string; fechaCreacion: string;
  presentado: boolean; pagado: boolean;
  totalMovimientos: number; totalMontos: number; totalRetenciones: number;
};

// Tab 4
type Excepcion = {
  id: number; usuario: string; cuit: string; direccion: "Entrantes" | "Salientes" | "Ambos";
  motivo: string; vigenciaDesde: string; vigenciaHasta: string;
  estado: Estatus; fechaCreacion: string; autorizacion: string;
};
```

---

## 5. Reutilización de componentes y nuevos componentes

**Reutilizables existentes (sin duplicar):**
`TabLayout`, `DataTable`, `PageHeader`, `Badge`, `FormDialog`, `ConfirmDialog`, `ActionsDropdown`, `Input`, `Label`, `BtnPrimary`, `BtnOutline`, `EmptyState`.

**Nuevos componentes propuestos (para evitar duplicación y escalar):**
1. `WizardModal` — modal de pasos (Preview → Revisar → Confirmar) reutilizado en Normalización Retroactiva y Sin Retroactivo.
2. `FileDropzone` — campo de carga de archivo para Padrón (input file estilizado, reutilizable).
3. `StatGrid` / `KpiCard` — tarjetas de KPIs para el preview de normalización (reutiliza estética de `Stat`).

Todos los datos serán mock en `useState` (no hay backend); la lógica tributaria real no se altera.

---

## 6. Mapa de pantallas (detalle)

### Tab 1 — Impuestos
- Tabla: ID, Nombre, Descripción, Estado, Cantidad de tasas.
- Acciones por fila: Ver detalle (modal/drawer), Editar (FormDialog), Eliminar (ConfirmDialog).
- Botón "Nuevo impuesto" → FormDialog (nombre, descripción, tipo de impuesto, estado) + gestor de tasas (lista editable de código/tasa/descripción/estado).
- **Detalle:** sección "Información general" (ID, Nombre, Descripción, Tipo, Estado, Fecha creación, Fecha actualización) + tabla "Tasas" (Código, Tasa, Descripción, Estado).

### Tab 2 — Usuarios con Impuestos
- Tabla paginada: Usuario, Nombre completo, Impuesto, Tipo, Estado, Fecha de asignación.
- Solo lectura (historial). Sin formulario de alta (la asignación ocurre desde Tab 1 / flujo de negocio).

### Tab 3 — Ingresos Brutos (sub-tabs internos)
- **3.1 Gestión de Padrones:** formulario (Impuesto [select], Nombre del padrón, Archivo [FileDropzone]). Al cargar, se muestra estado de procesamiento en tiempo real (barra/progreso mock que avanza).
- **3.2 Normalización Retroactiva:** botón "Generar preview" → `WizardModal` con KPIs + 3 tablas (Creados, Desactivados, Omitidos). El botón "Aplicar" solo habilita tras preview.
- **3.3 Reportes de Impuestos:** tabla (Período, Tramo, Fecha creación, Presentado, Pagado). Acciones: Ver detalle (modal con totales), Descargar ZIP (genera CSV/Excel mock en cliente). Marcar presentado / pagado desde el detalle.

### Tab 4 — Débitos y Créditos (Excepciones)
- Acción "Alta manual de excepción" → FormDialog (CUIT, Dirección [Entrantes/Salientes/Ambos], Motivo, Vigencia desde, Vigencia hasta). Reglas: si falta "desde" → hoy; si falta "hasta" → abierta.
- Acción "Sin retroactivo" → `WizardModal` (CUIT, desde, hasta → Generar preview: asociaciones analizadas, cargos revisados, impacto esperado). No persiste; solo tras preview se habilita "Ejecutar".
- Tabla "Excepciones": Usuario, CUIT, Dirección, Motivo, Vigencia desde, Vigencia hasta, Estado, Fecha creación, Autorización. Acciones: Activar / Desactivar (ConfirmDialog).

---

## 7. Documento de pruebas detallado

### 7.1 Criterios generales (transversales)
- **CG-1** Cada pestaña muestra su descripción funcional en el header.
- **CG-2** La navegación entre las 4 pestañas conserva el lugar (TabLayout) y no pierde estado al volver.
- **CG-3** Todos los botones "Descargar CSV" (ya globales en `DataTable`) exportan la vista filtrada actual.
- **CG-4** No se rompe ningún otro módulo (regresión: Módulos, Reportes, Movimientos, Soporte, Alertas).

### 7.2 Tab 1 — Impuestos
| CP | Caso | Pasos | Resultado esperado |
|----|------|-------|--------------------|
| T1-01 | Listar impuestos | Abrir pestaña | Tabla con al menos 3 impuestos mock, columna "Cantidad de tasas" correcta. |
| T1-02 | Ver detalle | Click "Ver detalle" | Modal con Info general + tabla de Tasas. |
| T1-03 | Crear impuesto | "Nuevo impuesto" → completar datos + 2 tasas → Guardar | Aparece en tabla; detalle muestra tasas. |
| T1-04 | Editar impuesto | "Editar" → cambiar nombre/estado → Guardar | Cambios reflejados; "Fecha actualización" se actualiza. |
| T1-05 | Eliminar impuesto | "Eliminar" → confirmar | Se quita de la tabla; se pide confirmación. |
| T1-06 | Validación alta | Guardar sin nombre | No permite guardar; mensaje de error. |
| T1-07 | Gestión de tasas | En alta, agregar/quitar fila de tasa | El contador "Cantidad de tasas" se actualiza. |
| T1-08 | Tipo de impuesto | Crear con tipo "Porcentaje"/"Fijo"/"Otro" | Se persiste y muestra en detalle. |

### 7.3 Tab 2 — Usuarios con Impuestos
| CP | Caso | Pasos | Resultado esperado |
|----|------|-------|--------------------|
| T2-01 | Listar asignaciones | Abrir pestaña | Tabla paginada con columnas exactas. |
| T2-02 | Paginación | Avanzar página | Cambia el lote; total de resultados coherente. |
| T2-03 | Filtro/búsqueda | Buscar por usuario/CUIT | Filtra la vista actual. |
| T2-04 | Orden | Click en columna "Fecha de asignación" | Ordena asc/desc. |
| T2-05 | Solo lectura | Intentar editar | No hay acciones de edición/borrado. |

### 7.4 Tab 3 — Ingresos Brutos
**3.1 Padrones**
| CP | Caso | Pasos | Resultado esperado |
|----|------|-------|--------------------|
| T3-01 | Cargar padrón | Completar Impuesto+Nombre+Archivo → Cargar | Estado "Cargando"→"Procesando"→"Finalizado" con progreso visible. |
| T3-02 | Validación | Sin archivo | No inicia carga; error. |
| T3-03 | Error de procesamiento | (mock con archivo inválido) | Estado "Error" con mensaje. |

**3.2 Normalización Retroactiva**
| CP | Caso | Pasos | Resultado esperado |
|----|------|-------|--------------------|
| T3-04 | Generar preview | Click "Generar preview" | Wizard paso 1 muestra los 8 KPIs + 3 tablas. |
| T3-05 | KPIs presentes | Revisar | Usuarios analizados, Impuestos revisados, creados, desactivados, cargos ajustados, omitidos, errores, diferencias. |
| T3-06 | Tabla creados | Revisar | Columnas CUIT, Impuesto, Tasa, Usuario. |
| T3-07 | Tabla desactivados | Revisar | Estructurada (no JSON) con columnas completas. |
| T3-08 | Tabla omitidos | Revisar | Columnas CUIT, Motivo, Usuario. |
| T3-09 | Aplicar bloqueado | Intentar "Aplicar" sin preview | Botón deshabilitado. |
| T3-10 | Aplicar tras preview | Confirmar aplicación | Estado finalizado; se registra resultado. |

**3.3 Reportes**
| CP | Caso | Pasos | Resultado esperado |
|----|------|-------|--------------------|
| T3-11 | Listar reportes | Abrir sub-tab | Tabla con Período, Tramo, Fecha, Presentado, Pagado. |
| T3-12 | Ver detalle | Click "Ver detalle" | Modal con totales (movimientos, montos, retenciones) + presentado/pagado. |
| T3-13 | Marcar presentado | En detalle → "Marcar presentado" | Badge Presentado = sí; acción deshabilitada si ya está. |
| T3-14 | Marcar pagado | En detalle → "Marcar pagado" | Badge Pagado = sí. |
| T3-15 | Descargar ZIP | Click "Descargar ZIP" | Descarga archivo (CSV/Excel mock) en cliente. |

### 7.5 Tab 4 — Débitos y Créditos
**Alta manual**
| CP | Caso | Pasos | Resultado esperado |
|----|------|-------|--------------------|
| T4-01 | Alta completa | Completar todos los campos → Guardar | Excepción aparece en tabla. |
| T4-02 | Sin "desde" | Dejar vigencia desde vacía | Se usa fecha actual. |
| T4-03 | Sin "hasta" | Dejar vigencia hasta vacía | Excepción queda "abierta" (hasta = —). |
| T4-04 | Dirección | Seleccionar Ambos | Se persiste "Ambos". |
| T4-05 | Validación CUIT | Guardar sin CUIT | No permite guardar. |

**Sin retroactivo**
| CP | Caso | Pasos | Resultado esperado |
|----|------|-------|--------------------|
| T4-06 | Generar preview | Modal → completar CUIT/desde/hasta → "Generar preview" | Muestra asociaciones analizadas, cargos revisados, impacto esperado. |
| T4-07 | No persiste | Cerrar sin ejecutar | No se guardan cambios. |
| T4-08 | Ejecutar tras preview | Confirmar | Proceso definitivo habilitado solo tras preview. |

**Excepciones (tabla)**
| CP | Caso | Pasos | Resultado esperado |
|----|------|-------|--------------------|
| T4-09 | Activar | Acción "Activar" | Estado → Activo. |
| T4-10 | Desactivar | Acción "Desactivar" + confirmar | Estado → Inactivo. |
| T4-11 | Columnas | Revisar tabla | Usuario, CUIT, Dirección, Motivo, Vigencias, Estado, Fecha creación, Autorización. |

### 7.6 Edge cases / no funcionales
- **E-1** Archivos grandes en padrón: barra de progreso no se bloquea (mock asíncrono).
- **E-2** Preview con 0 resultados: tablas vacías con `EmptyState`, KPIs en 0.
- **E-3** CSV de tablas con filtros activos respeta el filtro.
- **E-4** Responsive: tablas con scroll horizontal en móvil; `TabLayout` se ajusta.
- **E-5** Accesibilidad: modales cierran con Escape/clic fuera; foco gestionado.

---

## 8. Riesgos y decisiones pendientes (a confirmar)
1. **R-1** La frase del spec en Tab 2 sobre "definir tipo al crear/editar impuesto" se interpretó como responsabilidad de Tab 1. ¿Confirmás?
2. **R-2** Nombre de la pestaña 4: ¿"Débitos y Créditos" o "Débitos y Créditos — Excepciones"?
3. **R-3** Tab 3.3 "Descargar ZIP": al no haber backend, se generará un archivo mock (CSV/Excel) en el cliente. ¿Aceptable o preferís solo CSV?
4. **R-4** Tab 2 es solo lectura (historial). ¿Confirmás que no debe permitir alta de asignaciones?
5. **R-5** Datos 100% mock en `useState`; no se conecta a API. ¿Correcto para esta fase?

---

## 9. Solicitud de autorización

Se presenta este análisis, propuesta de organización (§3) y plan de pruebas (§7) **antes de escribir código**.

**Pendiente:** autorización del usuario para proceder con la implementación de las rutas y componentes descritos, y confirmación de los puntos R-1 a R-5.

Una vez autorizado, el orden de implementación sugerido es:
1. Layout padre + 4 tabs + rutas.
2. Tab 1 (catálogo + detalle + CRUD + tasas).
3. Tab 2 (historial paginado).
4. Tab 3 (padrones → normalización → reportes).
5. Tab 4 (alta manual + sin retroactivo + excepciones).
6. Componentes nuevos (`WizardModal`, `FileDropzone`, `KpiCard`).
7. Regresión y ejecución del plan de pruebas.

---

## 10. Estado de implementación (revisión posterior)

Implementado por completo en el commit `e26ef39` (`feat(impuestos): rediseño del módulo en 4 pestañas`). La estructura final coincide con la propuesta de §3:

| Archivo | Líneas | Cumple |
|---|---|---|
| `admin.modulos.impuestos.tsx` | 30 | Layout padre 4 tabs ✅ |
| `admin.modulos.impuestos.index.tsx` | 358 | Tab 1: catálogo + detalle + CRUD + tasas ✅ |
| `admin.modulos.impuestos.usuarios.tsx` | 74 | Tab 2: historial solo lectura ✅ |
| `admin.modulos.impuestos.ingresos-brutos.tsx` | 26 | Tab 3: layout 3 sub-tabs ✅ |
| `.ingresos-brutos.index.tsx` | 163 | Sub 3.1: Gestión de Padrones (con `FileDropzone`) ✅ |
| `.ingresos-brutos.normalizacion.tsx` | 240 | Sub 3.2: Normalización (8 KPIs + 3 tablas + `WizardModal`) ✅ |
| `.ingresos-brutos.reportes.tsx` | 201 | Sub 3.3: Reportes (detalle, presentado/pagado) ✅ |
| `admin.modulos.impuestos.debitos-creditos.tsx` | 336 | Tab 4: alta manual + sin retroactivo + excepciones ✅ |

**Componentes nuevos creados y usados:** `WizardModal`, `FileDropzone`, `KpiCard`.

**Resolución de los riesgos R-1 a R-5 (en la práctica):**
- **R-1:** El tipo de impuesto (Porcentaje/Fijo/Otro) se define en Tab 1 (catálogo). ✅
- **R-2:** La pestaña 4 quedó etiquetada como **"Débitos y Créditos"** (sin sufijo "— Excepciones"); se mantiene la colisión nominal documentada en I-6, sin impacto funcional.
- **R-3:** La descarga se resuelve con el botón global "Descargar CSV" de `DataTable` (no ZIP).
- **R-4:** Tab 2 es solo lectura. ✅
- **R-5:** Datos mock en `useState`, sin backend. ✅

**Nota de reutilización:** los componentes globales `DataTable`, `FormDialog`, `ConfirmDialog`, `ActionsDropdown`, `Badge`, `EmptyState` y `TabLayout` se reutilizaron sin duplicación, según §5.
