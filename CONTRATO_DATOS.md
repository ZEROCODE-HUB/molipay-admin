# CONTRATO_DATOS.md — Estado confirmado del esquema (MoliPay, staging)
Generado tras correr completo el runbook de backend. Esta es la fuente de verdad para los Prompts A (admin) y B (empresas). Si el código de cualquiera de las dos apps contradice esto, **el código se ajusta al contrato**, no al revés.

## ✅ Aplicado y confirmado

### Vistas y tablas nuevas
- `public.v_lotes_venta` (vista): agregación de `movimientos` por `comercio_id, bandera, fecha` — representa el "lote de venta", independiente de `lotes_acreditacion`.
- `public.parametros_globales (clave PK, valor, descripcion, updated_at)`: contiene la fila `comision_cierre_lote_pct = 0.45`. Editable con `UPDATE`, sin migración.
- `public.banderas (id, nombre UNIQUE, dias_habiles_acreditacion, estado)`: catálogo de banderas. Cargado con Amex (30 días), Mastercard (20), Visa (20).
- `public.banderas_cuotas (id, bandera_id FK, cuotas, estado, UNIQUE(bandera_id, cuotas))`: catálogo de qué cuotas ofrece cada bandera. **Vacío por ahora** — se carga desde una pantalla de `admin` (Prompt A, tarea nueva).
- `public.comercio_banderas_cuotas (id, comercio_bandera_id FK, cuotas, tasa_mensual, estado, UNIQUE(comercio_bandera_id, cuotas))`: tasa comercial por comercio+bandera+cuota. **Pendiente de crear** — no llegó a incluirse en el runbook de SQL manual; agregarla como parte del Prompt A (Módulo Comisiones) antes de construir la UI de cuotas.
- `public.roles`: nueva fila `administrador_maestro`, con permiso `puede_leer/crear/modificar = true`, `puede_borrar = false` sobre el recurso `adelantos`.

### Columnas nuevas en tablas existentes
- `comercios.ejecutivo_responsable_id uuid REFERENCES admin_users(id)` — sin asignar todavía en ningún comercio.
- `impuestos.ambito text DEFAULT 'Externo' CHECK (Interno|Externo)`, `impuestos.periodicidad_dias integer`.
- `dc_excepciones.archivo_certificado text`, `dc_excepciones.impuesto_id uuid REFERENCES impuestos(id)`.
- `adelantos.motivo text`, `adelantos.fecha_acreditacion date`, `adelantos.monto_por_acreditar numeric(14,2)`.
- `lotes_acreditacion.comision_cierre_lote_pct numeric(7,4)`, `comision_cierre_lote_monto numeric(14,2)` — **snapshot por lote**, no se auto-completan; `admin` debe calcularlos leyendo `parametros_globales` al crear/recalcular un lote.

### Automatizaciones
- Job `reactivar_excepciones_vencidas` agendado vía `pg_cron`, corre diario 3 AM, desactiva excepciones con `vigencia_hasta < CURRENT_DATE`.

### Verificación del workaround de `ambito`
No había impuestos con el prefijo `[Interno]`/`[Externo]` en `descripcion` — no hizo falta migración de datos. El workaround del frontend (`isAmbitoColumnError`, `persistAmbitoLocal`, localStorage) **debe eliminarse igual** en el Prompt A, aunque no haya datos que migrar, porque ya existe la columna real.

## ✅ Decisiones de negocio — RESUELTAS

1. **`lotes_acreditacion.estado` ya NO incluye `'Rechazado'`.** CHECK actualizado a `('Acreditado','Contracargo')`. No había filas reales en `'Rechazado'` (staging), así que no se necesitó migrar datos.
2. **Flujo de adelantos confirmado**: comercio solicita (`'Pendiente'`) → admin aprueba ofreciendo tasa y condiciones (`'Aprobado'`, con `tasa_interes_pct` cargado) → el comercio puede **cancelar** si no le convierte la oferta (`'Cancelado'`, nuevo) o queda a la espera de que el admin confirme la acreditación real (`'Acreditado'`). `'Rechazado'` sigue existiendo como acción del admin en cualquier punto antes de acreditar. CHECK actualizado a `('Pendiente','Aprobado','Cancelado','Rechazado','Acreditado')`.
3. **Comisión de cierre de lote confirmada como componente nuevo**, no es lo mismo que `tasa_molipay_pct/monto`. Es un valor global fijo hoy (0,45%), configurable a futuro vía `parametros_globales`, no por comercio.

## ⏸ Pendiente — NO implementar todavía

**Migración de `bandera` (texto libre) a `bandera_id` (FK contra `banderas`)** en `comercio_banderas`, `lotes_acreditacion` y `movimientos`. Hoy `bandera` sigue siendo texto libre en esas 3 tablas — el catálogo `banderas`/`banderas_cuotas` existe en paralelo pero **todavía no está referenciado** desde ninguna tabla operativa. Esto requiere coordinar cambios de esquema + código de `admin` y `empresas` en el mismo despliegue (no es aditivo puro). Los Prompts A y B deben seguir usando `bandera` como texto por ahora, y **nuevas features que necesiten el catálogo** (como `banderas_cuotas`) deben crearse igual, sin esperar esta migración — solo hay que evitar asumir que `comercio_banderas.bandera` ya es una FK.

**RPC `ingresar_adelanto`** — no se creó vía SQL manual a propósito, porque tiene una pieza de lógica de aplicación (resolver `comercio_id` desde el usuario autenticado vía `auth.uid() → clientes → comercios`) que no debe completarse a ciegas. Se confirmó que no existía previamente (`SELECT proname FROM pg_proc WHERE proname ILIKE '%adelanto%'` no devolvió filas). **Este es un entregable del Prompt B (empresas)**, idealmente con ayuda puntual de una IA de código que revise cómo `empresas` resuelve hoy el comercio del usuario logueado en otras partes del código, para no inventar un criterio nuevo.

## Resumen para los Prompts A y B
- Todo lo de "✅ Aplicado y confirmado" y "✅ Decisiones — RESUELTAS" ya está en staging: implementar directo, sin condicionales.
- Todo lo de "⏸ Pendiente" no se toca todavía en este ciclo de trabajo, salvo el RPC de adelantos que es tarea explícita del Prompt B.
