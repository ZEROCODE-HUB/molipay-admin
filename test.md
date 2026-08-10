# Test Plan — Estados de Movimiento por Tipo (MoliPay Backoffice — General → Movimientos)

Basado en `MAPEO_ESTADOS.xlsx`. Regla aplicada: el estado final de cada operación es el texto literal de la celda, o lo que sigue a "cambia a" cuando existe. Cada caso debe marcarse **PASA / NO PASA**.

## Protocolo de iteración (obligatorio)
1. Ejecutar todos los casos de este documento contra la implementación actual.
2. Reportar el resultado completo (PASA/NO PASA por caso).
3. Si hay al menos un NO PASA: corregir puntualmente y volver a ejecutar el documento completo desde el caso 1.
4. Repetir hasta 0 casos en NO PASA, con un **máximo de 5 iteraciones totales**.
5. Si tras la iteración 5 persiste algún NO PASA, reportarlo como bloqueante explícito — no cerrar la tarea igual.

---

## 1. Tab Depósitos

| ID | Caso | Resultado esperado |
|----|------|---------------------|
| DEP1 | El filtro de Estado muestra exactamente 4 opciones | APROBADO, EN PROGRESO, RECHAZADO, BLOQUEADO — sin ningún estado adicional (ni CREADO, ni REEMBOLSADO, etc.) |
| DEP2 | Datos mock cubren los 4 estados | Existe al menos un registro mock por cada uno de los 4 estados |
| DEP3 | No aparece el literal "PENDIENTE" en ningún registro visible | Todo registro que internamente parte de "PENDIENTE" se muestra como "EN PROGRESO" — el texto "PENDIENTE" no debe ser visible en la UI |
| DEP4 | Filtrar por "EN PROGRESO" devuelve solo esos registros | El filtro funciona correctamente (ver principio general 1.1) |

## 2. Tab Retiros

| ID | Caso | Resultado esperado |
|----|------|---------------------|
| RET1 | El filtro de Estado muestra exactamente 4 opciones | APROBADO, EN PROGRESO, RECHAZADO, BLOQUEADO |
| RET2 | Datos mock cubren los 4 estados | Al menos un registro mock por estado |
| RET3 | No aparece el literal "FINALIZADO" en ningún registro visible | Todo registro que parte de "FINALIZADO" se muestra como "APROBADO" |
| RET4 | Filtrar por "APROBADO" devuelve solo esos registros | Filtro funcional |

## 3. Tab Pagos con Tarjeta

| ID | Caso | Resultado esperado |
|----|------|---------------------|
| TAR1 | El filtro de Estado muestra exactamente 6 opciones | CREADO, ABIERTO, EN PROGRESO, APROBADO, EXPIRADO, RECHAZADO |
| TAR2 | Datos mock cubren los 6 estados | Al menos un registro mock por cada uno de los 6 |
| TAR3 | No aparece el literal "PENDIENTE" en ningún registro visible | Se muestra como "EN PROGRESO" |
| TAR4 | No aparece el literal "COMPLETADO" en ningún registro visible | Se muestra como "APROBADO" |
| TAR5 | "CREADO" y "ABIERTO" existen como estados propios | No deben colapsar ni transformarse a ningún otro estado — quedan tal cual |
| TAR6 | "EXPIRADO" existe como estado propio | No colapsa a ningún otro estado |
| TAR7 | Filtrar por "CREADO" devuelve solo esos registros | Filtro funcional (valida que el estado exclusivo de Tarjeta también sea filtrable) |

## 4. Tab Pagos PCT (QR)

| ID | Caso | Resultado esperado |
|----|------|---------------------|
| PQR1 | El filtro de Estado muestra exactamente 4 opciones | EN PROGRESO, APROBADO, RECHAZADO, REEMBOLSADO |
| PQR2 | Datos mock cubren los 4 estados | Al menos un registro mock por estado |
| PQR3 | No aparece el literal "PENDIENTE" en ningún registro visible | Se muestra como "EN PROGRESO" |
| PQR4 | No aparece el literal "COMPLETADO" en ningún registro visible | Se muestra como "APROBADO" |
| PQR5 | No aparece el literal "FALLIDO" en ningún registro visible | Se muestra como "RECHAZADO" |
| PQR6 | "REEMBOLSADO" existe como estado propio | No colapsa a BLOQUEADO ni a ningún otro estado |

## 5. Tab Cobros PCT (QR)

| ID | Caso | Resultado esperado |
|----|------|---------------------|
| CQR1 | El filtro de Estado muestra exactamente 4 opciones | EN PROGRESO, APROBADO, RECHAZADO, REEMBOLSADO |
| CQR2 | Datos mock cubren los 4 estados | Al menos un registro mock por estado |
| CQR3 | No aparece el literal "PENDIENTE" en ningún registro visible | Se muestra como "EN PROGRESO" |
| CQR4 | No aparece el literal "COMPLETADO" en ningún registro visible | Se muestra como "APROBADO" |
| CQR5 | No aparece el literal "FALLIDO" en ningún registro visible | Se muestra como "RECHAZADO" |
| CQR6 | "REEMBOLSADO" existe como estado propio | Consistente con Pagos PCT |

## 6. Tab Todos los movimientos (unión completa)

| ID | Caso | Resultado esperado |
|----|------|---------------------|
| TOD1 | El filtro de Estado muestra exactamente 8 opciones | APROBADO, EN PROGRESO, RECHAZADO, BLOQUEADO, CREADO, ABIERTO, EXPIRADO, REEMBOLSADO |
| TOD2 | No falta ningún estado de los tipos individuales | Cada estado presente en Depósitos, Retiros, Tarjeta, Pagos PCT o Cobros PCT aparece también en el filtro de Todos |
| TOD3 | No sobra ningún estado no usado por ningún tipo | El filtro de Todos no incluye ningún estado que no exista en al menos un tipo individual |
| TOD4 | Datos mock cubren los 8 estados | Al menos un registro mock por cada uno de los 8, y las combinaciones deben poder identificarse por tipo de movimiento (depósito/retiro/tarjeta/PCT pago/PCT cobro) |
| TOD5 | Filtrar por "BLOQUEADO" en Todos | Devuelve únicamente registros de Depósitos/Retiros con ese estado (ya que Tarjeta y PCT no tienen BLOQUEADO) |
| TOD6 | Filtrar por "CREADO" en Todos | Devuelve únicamente registros de Pagos con Tarjeta (único tipo con ese estado) |
| TOD7 | Filtrar por "REEMBOLSADO" en Todos | Devuelve únicamente registros de Pagos PCT y Cobros PCT |
| TOD8 | Ningún registro en Todos muestra un estado crudo no normalizado | No debe aparecer "PENDIENTE", "FINALIZADO", "COMPLETADO" ni "FALLIDO" como texto de estado en ningún registro de esta tabla |

## 7. Confirmación — REEMBOLSADO en "Todos" (resuelto)

**Confirmado por el cliente:** REEMBOLSADO se incluye en el filtro de "Todos los movimientos" (8 estados totales), y los datos mock deben cubrir los 8 estados, incluyendo los minoritarios que solo pertenecen a un tipo (CREADO, ABIERTO, EXPIRADO de Tarjeta; REEMBOLSADO de PCT). Los casos TOD1, TOD4, TOD6 y TOD7 quedan tal como están definidos arriba — no requieren ajuste.

---

## Resumen de cobertura
- Depósitos: 4 casos · Retiros: 4 casos · Tarjeta: 7 casos · Pagos PCT: 6 casos · Cobros PCT: 6 casos · Todos: 8 casos · Confirmación: resuelta.
- **Total: 35 casos de prueba ejecutables**, más el protocolo de iteración con tester (máximo 5 ciclos, Sección de protocolo arriba).