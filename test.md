# Test Plan — Sección Comercios (Admin → Comercios → Transferencia)

Basado en las instrucciones de la sección Comercios. Cada caso debe marcarse **PASA / NO PASA**. Ningún caso puede quedar en NO PASA para dar por cerrada la entrega.

## Protocolo de iteración (obligatorio)
1. Ejecutar todos los casos de este documento contra la implementación actual.
2. Reportar el resultado completo (PASA/NO PASA por caso).
3. Si hay al menos un NO PASA: corregir puntualmente y volver a ejecutar el documento completo desde el caso 1.
4. Repetir hasta 0 casos en NO PASA, con un **máximo de 5 iteraciones totales**.
5. Si tras la iteración 5 persiste algún NO PASA, reportarlo como bloqueante explícito.

---

## 1. Estructura y navegación

| ID | Caso | Resultado esperado |
|----|------|---------------------|
| NAV1 | El tab "Módulos" ya no existe dentro de Comercios | Al entrar a Comercios, no aparece ningún tab llamado "Módulos" |
| NAV2 | Los tabs de Comercios son exactamente 4, en este orden | Pago por referencia, Link de pago, Impuestos, APIs externas — sin tabs adicionales ni faltantes |
| NAV3 | "Módulos" no fue eliminado del sistema, solo reubicado | El contenido de "Módulos" sigue accesible en Sistema → Salud de módulos, sin pérdida de funcionalidad |
| NAV4 | El breadcrumb/ruta superior es correcto | Al entrar a la sección de Transferencia dentro de Comercios, se muestra "Admin → Comercios → Transferencia" |
| NAV5 | La ruta anterior ya no existe | No debe encontrarse en ningún lugar de la navegación la ruta "Admin → Módulos → Transferencia" |

## 2. Transferencia → Comercios — tabla principal

### 2.1 Eliminación de checkboxes

| ID | Caso | Resultado esperado |
|----|------|---------------------|
| CHK1 | No existe el checkbox "Seleccionar todos" | El header de la tabla no muestra ningún checkbox de selección masiva |
| CHK2 | No existen checkboxes individuales por fila | Ninguna fila de comercio muestra checkbox de selección |
| CHK3 | No queda ninguna acción masiva dependiente de selección | No hay botones de acción en lote (ej. "Eliminar seleccionados") que dependieran de los checkboxes eliminados |

### 2.2 Columnas de la tabla

| ID | Caso | Resultado esperado |
|----|------|---------------------|
| COL1 | La tabla muestra exactamente estas columnas, en este orden | Usuario, Legajo, Categoría, Estado, Nivel, Acciones |
| COL2 | Columna "Usuario" muestra el correo electrónico del comercio | El valor mostrado tiene formato de email válido |
| COL3 | Columna "Categoría" muestra código numérico | Valores tipo 780, 763, 742, 4829 — solo números, sin texto descriptivo en esta columna |
| COL4 | No aparecen columnas adicionales no especificadas | No hay columnas extra ni columnas de la especificación anterior que debieran removerse |

### 2.3 Filtro de Estado

| ID | Caso | Resultado esperado |
|----|------|---------------------|
| EST1 | El filtro de Estado es un desplegable | No es texto libre ni checkboxes, es un dropdown/select |
| EST2 | El desplegable contiene exactamente 5 opciones | Activado, Desactivado, Pendiente de aprobación, Rechazado, Suspendido |
| EST3 | Los datos mock cubren los 5 estados | Existe al menos un comercio mock por cada uno de los 5 estados |
| EST4 | Filtrar por "Pendiente de aprobación" devuelve solo esos registros | Filtro funcional (ver principio general de filtros por columna) |
| EST5 | Filtrar por "Suspendido" devuelve solo esos registros | Filtro funcional |

### 2.4 Filtro de Nivel

| ID | Caso | Resultado esperado |
|----|------|---------------------|
| NIV1 | El filtro de Nivel es un desplegable | Dropdown/select, no texto libre |
| NIV2 | El desplegable contiene exactamente 7 opciones | Pequeño, Mediano, Grande, Premium, Estándar, Básico, Enterprise |
| NIV3 | Los datos mock cubren los 7 niveles | Existe al menos un comercio mock por cada uno de los 7 niveles |
| NIV4 | Filtrar por "Enterprise" devuelve solo esos registros | Filtro funcional |
| NIV5 | Filtrar por "Básico" devuelve solo esos registros | Filtro funcional |

## 3. Acciones de Comercio (columna Acciones en la tabla)

| ID | Caso | Resultado esperado |
|----|------|---------------------|
| ACC1 | Existen exactamente 6 acciones disponibles | Activar, Suspender, Validar, Eliminar, Editar, Ver comercio |
| ACC2 | "Activar" ejecuta la acción correspondiente | Cambia el estado del comercio a Activado |
| ACC3 | "Suspender" ejecuta la acción correspondiente | Cambia el estado del comercio a Suspendido |
| ACC4 | "Validar" ejecuta la acción correspondiente | Dispara el flujo de validación (ej. cambia estado desde Pendiente de aprobación) |
| ACC5 | "Eliminar" muestra confirmación mediante pop-up | Al hacer click en Eliminar, se abre un pop-up de confirmación antes de ejecutar la acción — no se elimina directamente |
| ACC6 | Confirmar la eliminación en el pop-up elimina el comercio | Tras confirmar, el registro desaparece del listado |
| ACC7 | Cancelar la eliminación en el pop-up no elimina nada | El comercio permanece en el listado sin cambios |
| ACC8 | "Editar" abre el flujo de edición | Ver sección 4 |
| ACC9 | "Ver comercio" abre el flujo de visualización | Ver sección 4 |

## 4. Ver / Editar comercio — Pop-up ampliado

### 4.1 Comportamiento general del pop-up

| ID | Caso | Resultado esperado |
|----|------|---------------------|
| POP1 | "Ver comercio" y "Editar comercio" abren un pop-up amplio | El pop-up es notablemente más grande que el "detalle pequeño" anterior; no debe seguir existiendo esa versión reducida |
| POP2 | Ambas acciones (Ver y Editar) están completamente habilitadas | Ningún botón/acción aparece deshabilitado o placeholder |
| POP3 | El pop-up anterior (detalle pequeño) fue reemplazado, no duplicado | No debe coexistir una versión antigua accesible desde algún otro punto de la UI |

### 4.2 Card "Información general"

| ID | Caso | Resultado esperado |
|----|------|---------------------|
| INF1 | La card muestra exactamente estos campos | Usuario, Legajo, Fecha de creación, Hora de creación, Estado, Nivel |
| INF2 | Fecha y Hora de creación se muestran como campos separados | No deben estar combinados en un solo campo de fecha-hora |
| INF3 | Estado y Nivel reflejan el valor real del comercio | Coinciden con lo mostrado en la tabla principal para ese mismo comercio |

### 4.3 Card "Código de categoría"

| ID | Caso | Resultado esperado |
|----|------|---------------------|
| CAT1 | La card muestra Código de categoría y Descripción | Ej. ID: 780, Descripción: "Paisajismo y cultura" |
| CAT2 | El código coincide con el mostrado en la columna "Categoría" de la tabla principal | Mismo valor numérico |
| CAT3 | La descripción corresponde al código (no es texto genérico) | Cada código numérico tiene su descripción específica asociada, no un texto placeholder repetido |

### 4.4 Tabla "Puntos de venta"

| ID | Caso | Resultado esperado |
|----|------|---------------------|
| PDV1 | La tabla muestra exactamente estas columnas | Nombre del punto de venta, Estado, Fecha de creación |
| PDV2 | El filtro/valor de Estado admite solo 2 opciones | Activado, Desactivado |
| PDV3 | Un comercio con múltiples puntos de venta los lista todos | Ningún punto de venta queda oculto o truncado |
| PDV4 | Un comercio sin puntos de venta muestra estado vacío | Mensaje claro de "sin puntos de venta", no tabla en blanco sin explicación |

## 5. Transferencia → Resolvers

### 5.1 Tabla principal

| ID | Caso | Resultado esperado |
|----|------|---------------------|
| RES1 | La tabla muestra exactamente estas columnas | Nombre del resolver, CUIT del resolver, URL del resolver, Estado, Acciones |
| RES2 | El título/contexto de la sección refleja que gestiona Resolvers PCT | Debe quedar claro en la UI que son Resolvers de PCT específicamente |

### 5.2 Filtro de Estado

| ID | Caso | Resultado esperado |
|----|------|---------------------|
| RES3 | El filtro de Estado es un desplegable | Dropdown/select |
| RES4 | El desplegable contiene exactamente 2 opciones | Activo, Inactivo |
| RES5 | Los datos mock cubren ambos estados | Al menos un resolver mock Activo y uno Inactivo |
| RES6 | Filtrar por "Activo" devuelve solo esos registros | Filtro funcional |
| RES7 | Filtrar por "Inactivo" devuelve solo esos registros | Filtro funcional |

### 5.3 Acciones de Resolver

| ID | Caso | Resultado esperado |
|----|------|---------------------|
| RES8 | Existen exactamente 3 acciones | Activar, Desactivar, Editar |
| RES9 | "Activar" cambia el estado a Activo | Reflejado en la tabla tras la acción |
| RES10 | "Desactivar" cambia el estado a Inactivo | Reflejado en la tabla tras la acción |
| RES11 | "Editar" abre el pop-up de edición | Ver sección 6 |

## 6. Editar Resolver — Pop-up

| ID | Caso | Resultado esperado |
|----|------|---------------------|
| EDR1 | El pop-up permite editar exactamente estos campos | CUIT, Nombre, Nombre reverso, Formato web, PCP ID, ID del PCP, URL, Token, As header (checkbox), SOA (checkbox) |
| EDR2 | "As header" es un checkbox editable | Se puede marcar/desmarcar y el valor persiste al guardar |
| EDR3 | "SOA" es un checkbox editable | Se puede marcar/desmarcar y el valor persiste al guardar |
| EDR4 | El pop-up tiene botón "Guardar" | Al presionarlo, persiste los cambios y cierra o confirma el guardado |
| EDR5 | El pop-up tiene botón "Cerrar" | Al presionarlo, descarta cambios no guardados y cierra el pop-up |
| EDR6 | Cerrar sin guardar no modifica el resolver | Los valores originales se mantienen intactos tras reabrir |
| EDR7 | Guardar con datos válidos actualiza el resolver | Los nuevos valores se reflejan en la tabla principal de Resolvers |
| EDR8 | PCP ID e ID del PCP son campos distinguibles entre sí | No deben fusionarse en un solo campo ni confundirse en el formulario (son dos campos separados según la especificación) |

## 7. Estilo visual y consistencia

| ID | Caso | Resultado esperado |
|----|------|---------------------|
| STY1 | La sección Comercios mantiene el estilo visual existente del módulo | No se introdujeron cambios de layout, tipografía o color fuera de lo especificado en estas instrucciones |
| STY2 | La sección Resolvers se mantiene como tabla tabulada | No se convirtió en cards, lista u otro formato distinto a tabla |
| STY3 | Ningún otro submódulo de "Pago con transferencia" fue modificado | Códigos de categoría y otras secciones vecinas permanecen sin cambios como consecuencia de esta entrega |

---

## Resumen de cobertura
- Navegación: 5 casos · Tabla Comercios (checkboxes + columnas + filtros): 17 casos · Acciones de Comercio: 9 casos · Pop-up Ver/Editar comercio: 11 casos · Resolvers (tabla + filtro + acciones): 11 casos · Editar Resolver: 8 casos · Estilo y consistencia: 3 casos.
- **Total: 64 casos de prueba**, sujetos al protocolo de iteración con tester (máximo 5 ciclos).