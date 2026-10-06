# Detalle de Reunión — Revisión de Plataforma MoliPay (15/09/2026)
Participantes: Andrés Díaz Armas (Molipay/desarrollo), Mailen Murta (negocio/impuestos, Argentina).

---

## 1. Lotes de Venta vs. Lotes de Acreditación

**Qué se discutió**: son dos conceptos que hoy se confunden en el sistema y deben separarse por completo.

- **Lote de venta**: total de compras/transacciones de un comercio en un día, sin importar cuándo se cobran.
- **Lote de acreditación**: dinero que efectivamente ingresa a la cuenta recaudadora, según el plazo de cada bandera.
- Payway envía dos archivos distintos: uno de **acreditación** (con columna "neto") y otro de **venta**. No deben mezclarse ni cruzarse en la UI.
- El comercio debe poder ver ambos por separado: calendario de acreditaciones y lotes de venta por día.
- **Cómo resolver**: el número de comercio/establecimiento en el archivo de Payway es la clave de match — Mailen debe confirmarlo con Roxana (Payway). Sin ese dato confirmado, no se puede automatizar la carga.

## 2. Estados del Lote de Acreditación

**Qué se discutió**: diferenciar contracargo de rechazo, y cómo afecta cada uno al lote.

- **No existe estado "Rechazado"** en el lote de acreditación según la reunión — el rechazo de tarjeta ocurre antes, a nivel de transacción individual, sin generar temporalidad de lote.
- Un lote nace en estado **Acreditado**; pasa a **Contracargo** solo si alguna transacción del lote lo tiene.
- Un contracargo resta únicamente de esa transacción — el resto del lote sigue positivo.
- Un contracargo puede originarse en una venta de días anteriores y aparecer descontado en un cierre de lote posterior (el lote puede verse "negativo" sin ventas ese día).
- **Cómo resolver**: eliminar cualquier flujo de UI/código que trate "Rechazado" como estado de lote (ya se implementó así en la base real).

## 3. Comisiones

**Qué se discutió**: existen dos comisiones distintas, que nunca deben mostrarse sumadas.

1. **Tasa de interés por bandera y cuota** (ej. Visa 1 cuota 5%, 2 cuotas 4%) — combina tasa Payway + tasa Molipay, mostrada unificada al comprador. Se cobra en cada venta, según la cuota elegida.
2. **Comisión por cierre de lote** (0,45%, fija, pactada en contrato) — se aplica solo cuando el lote pasa a **Acreditado**, asociada al banco sponsor.
- Mostrar solo **tasa mensual (TEM)** en la configuración de cuotas — nunca TNA como campo editable.
- El comercio debe poder ver sus propias tasas por bandera/cuota, hoy solo se entera por Excel/mail.
- Exportable por lote: base imponible, IVA, ingresos brutos, comisiones — hoy solo se ve un neto cerrado.
- **Cómo resolver**: la comisión por cierre de lote se modela como parámetro global (mismo valor para todos), editable sin migración; la tasa por bandera/cuota varía por comercio y vive en su propia configuración.

## 4. Flujo de Acreditación

**Qué se discutió**: qué significa técnicamente "acreditar" dentro de la plataforma.

- Acreditar **no es transferir**: es un cambio de titularidad del monto dentro de la cuenta recaudadora (de "saldo Molipay" a "saldo del comercio"), sin salir físicamente.
- El dinero sale recién cuando el comercio pide el retiro hacia su cuenta propia.
- Molipay no puede acreditar hasta que Payway efectivamente transfiera los fondos a la cuenta recaudadora.
- Los plazos por bandera (Amex 30 días, Mastercard ~20, débito 24h) los define Payway — Molipay los traslada tal cual, sin negociarlos.
- **Cómo resolver**: guardar los plazos por bandera en una tabla de configuración editable, no hardcodeados en el código.

## 5. Adelantos de Dinero

**Qué se discutió**: de dónde sale el dinero del adelanto y cómo se aprueba.

- Se financia con dinero de la **cuenta recaudadora general** (de otros comercios), nunca con capital propio de Molipay — de lo contrario sería un préstamo regulado.
- El adelanto no puede superar lo que ese comercio efectivamente vendió con tarjeta.
- Solo un usuario "administrador maestro" (Rubén, Elvio) puede aprobar, rechazar o acreditar adelantos.
- El comercio debe poder **aceptar o cancelar** la tasa/condiciones ofrecidas mediante un botón — falta un estado explícito de "Cancelado" en el flujo.
- **Cómo resolver**: flujo confirmado como Pendiente → Aprobado (admin ofrece tasa) → Cancelado (comercio rechaza la oferta) o Acreditado. Validación del monto disponible debe vivir en el servidor, no solo en el frontend.

## 6. Comercios y Usuarios

**Qué se discutió**: cómo se gestiona el ciclo de vida de un comercio.

- Los comercios **nunca se eliminan**, solo se deshabilitan — datos conservados 10 años por compliance.
- Debe registrarse fecha y motivo de deshabilitación, aunque no se comunique al comercio.
- Falta el campo "ejecutivo/comercial responsable" en la ficha del comercio.
- Un usuario "preactivado" (sin CVU/comisión asignada) puede loguearse pero no operar.
- **Cómo resolver**: agregar el campo de ejecutivo responsable; bloquear operaciones a nivel de servidor (no solo UI) para comercios sin CVU/comisión configurada.

## 7. CVU vs. CBU

**Qué se discutió**: límite regulatorio de qué puede emitir Molipay.

- Molipay, como PSP, **no puede crear CBU** (cuenta bancaria) en Argentina — reservado a bancos.
- Solo puede asignar **CVU** (cuenta virtual).
- **Cómo resolver**: eliminar cualquier referencia a "CBU" de cara al comercio en UI/documentación; usar CVU en todo el flujo operativo. Pendiente: definir cómo se asignan CVU cuando un usuario tiene varias subcuentas.

## 8. Impuestos

**Qué se discutió**: distintos impuestos, cada uno con reglas propias — tema que requiere reunión dedicada.

- **Ingresos Brutos (Sicore)**: el porcentaje debe calcularse automáticamente desde el padrón cargado, no manual.
- **Ingresos Brutos interno de Molipay**: impuesto propio de la empresa (paga como PCP), nunca se muestra ni cobra al comercio.
- **IVA**: manual/transversal (21%), salvo exención configurada por cliente.
- **Impuesto débito/crédito**: 0,6% + 0,6%, se cobra por movimiento, solo tras confirmarse la acreditación real de Payway.
- Cada cliente necesita configuración individual por impuesto (activo/inactivo), no una regla general.
- Las exenciones deben permitir adjuntar certificado y fecha de vencimiento — muchas son temporales.
- Falta un reporte/validación que cruce cliente, importe gravado e impuesto cobrado por tramo, como papel de trabajo ante ARCA.
- **Cómo resolver**: distinguir impuestos "internos" (nunca visibles al comercio) de "externos" mediante un campo de ámbito; automatizar la reactivación de exenciones vencidas; construir el reporte por tramos como tarea de backend pendiente.

## 9. Configuración General

**Qué se discutió**: un detalle transversal de experiencia de uso.

- El orden por defecto de todas las tablas del sistema debe ser cronológico descendente (más reciente arriba).
- **Cómo resolver**: aplicarlo como regla global a todos los listados paginados, no caso por caso.

---

## Pendientes finales y cómo resolverlos

| Pendiente | Cómo se resuelve |
|---|---|
| Número de comercio/establecimiento en archivo Payway | Mailen confirma el dato exacto con Roxana antes de automatizar la carga. |
| Diagrama del circuito Banco–Payway–Establecimiento–Bandera | Mailen lo envía por escrito a Andrés. |
| Régimen normativo de Sicore e impuesto débito/crédito | Mailen lo comparte para que el equipo técnico entienda el marco legal. |
| Asignación de CVU cuando hay varias subcuentas | Definir el flujo exacto en la próxima reunión, no asumirlo en el código. |
| Circuito de tarjetas (venta vs. acreditación) | Quedó "difuso" para Andrés — repasar de nuevo en la reunión de seguimiento. |
| Tema impositivo completo | Requiere su propia reunión dedicada, por la cantidad de reglas específicas de Argentina. |
| Reunión de seguimiento | Agendada jueves 4:00pm, 1.5 horas — impuestos primero, tarjetas/acreditación después. |
