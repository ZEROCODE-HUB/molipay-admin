# Test Plan — Popup "Ver y Editar Usuario — Persona Física" (MoliPay Backoffice)

Pruebas de aceptación para verificar el alcance completo definido en el prompt de modificación del popup. Cada caso debe marcarse **PASA / NO PASA**. Cualquier NO PASA bloquea el cierre de esta entrega.

---

## A. Unificación de vista (una sola vista, no dos)

| ID | Caso de prueba | Pasos | Resultado esperado |
|----|----------------|-------|---------------------|
| A1 | No existe vista separada de "solo ver" | Abrir un usuario Persona Física desde el listado (acción "Editar" o equivalente) | Se abre un único popup; no existe ninguna otra acción/ruta que muestre una versión "de solo lectura" con menos campos |
| A2 | Edición es inline, no modo global | Dentro del popup, intentar editar un campo (ej. Nombre) | Solo ese campo/bloque entra en modo edición (ícono de lápiz); el resto del popup permanece en modo lectura |
| A3 | No hay botón de "Editar" que transforme todo el popup | Buscar un botón único de "Editar" a nivel de todo el popup | No existe; cada campo/bloque tiene su propio control de edición |
| A4 | Tamaño del popup se adapta al contenido | Abrir el popup de un usuario con datos completos en las 4 secciones nuevas (C) | El popup se redimensiona (más ancho/alto) según se requiera; ningún bloque queda cortado, con scroll roto, o superpuesto |

## B. Card "Productos" — soporte para más tipos de producto

| ID | Caso de prueba | Pasos | Resultado esperado |
|----|----------------|-------|---------------------|
| B1 | Muestra Cuentas bancarias y CVUs (base) | Abrir popup de un usuario con cuentas bancarias y CVUs cargados | Ambos valores se muestran correctamente en la card "Productos" |
| B2 | Card admite productos adicionales sin romper layout | Simular/mockear un usuario con un tipo de producto adicional (distinto a cuentas bancarias/CVU) | La card renderiza el producto adicional sin romper el diseño ni requerir hardcodeo de solo 2 tipos |
| B3 | Usuario sin productos | Abrir popup de un usuario sin cuentas bancarias ni CVUs | La card muestra los valores en 0 (o estado vacío), sin error |

## C.1 Validaciones automáticas

| ID | Caso de prueba | Pasos | Resultado esperado |
|----|----------------|-------|---------------------|
| C1.1 | Estado vacío | Abrir popup de usuario sin validaciones registradas | Se muestra el mensaje "El usuario no tiene validaciones automáticas registradas" |
| C1.2 | Botón "Forzar nueva validación" visible y funcional | Con el estado vacío visible, hacer click en "Forzar nueva validación" | Se dispara la acción de forzar validación (llamada/estado de carga visible) |
| C1.3 | Estatus de validación existente (requerimiento nuevo) | Abrir popup de un usuario que **sí** tiene una validación automática registrada | Se muestra el **estatus actual** de esa validación (no el estado vacío) |
| C1.4 | Transición de estado | Forzar una nueva validación sobre un usuario sin validaciones previas | Tras completarse, la sección deja de mostrar el estado vacío y pasa a mostrar el estatus de la nueva validación |

## C.2 Contexto operativo

| ID | Caso de prueba | Pasos | Resultado esperado |
|----|----------------|-------|---------------------|
| C2.1 | Indicadores presentes | Abrir la sección Contexto operativo de un usuario con actividad | Se muestran los 5 indicadores: CVUs, Comisiones, Impuestos, Alertas, Bloqueos, más "Módulos inferidos" |
| C2.2 | Accesos directos funcionan | Click en "Ver movimientos" / "Ver impuestos" / "Ver alertas" | Cada botón navega a la vista global correspondiente ya existente, no a una vista nueva/duplicada |
| C2.3 | CVUs recientes | Verificar el listado "CVUs recientes" | Muestra el/los CVU con su estado |
| C2.4 | Últimas comisiones | Verificar el listado "Últimas comisiones" | Cada ítem muestra tipo, monto, fecha y origen |
| C2.5 | Impuestos recientes — estado vacío | Usuario sin impuestos registrados | Se muestra mensaje de estado vacío, no error ni sección en blanco |
| C2.6 | Alertas y bloqueos — estado vacío | Usuario sin alertas ni bloqueos | Se muestra mensaje de estado vacío, no error ni sección en blanco |
| C2.7 | Carga diferida | Abrir el popup y medir si el Contexto operativo se carga inmediatamente o bajo demanda | Confirmar que sigue el patrón de carga diferida (no debe cargar todo de golpe al abrir el popup, según el principio general de rendimiento) |
| C2.8 | No satura visualmente el popup | Revisión visual con un usuario con datos completos en todos los listados | La sección permanece legible, sin scroll excesivo forzado ni desbordes de layout |

## C.3 Riesgo y monitoreo

| ID | Caso de prueba | Pasos | Resultado esperado |
|----|----------------|-------|---------------------|
| C3.1 | Card "Parámetros de alertas" | Abrir la sección Riesgo y monitoreo | Se listan los parámetros de alertas específicos del usuario (ej. Depósitos por mes, Transferencias por hora, Política a menores, etc.) |
| C3.2 | Card "Parámetros de bloqueo" | Verificar la card correspondiente | Se listan los parámetros de bloqueo específicos del usuario (ej. Salarios mínimos por persona/empresa) |
| C3.3 | Edición vía modal | Click en "Editar" sobre Parámetros de alertas | Se abre un modal de edición directa (no navega fuera del popup) |
| C3.4 | Edición vía modal — bloqueos | Click en "Editar" sobre Parámetros de bloqueo | Se abre un modal de edición directa |
| C3.5 | Accesos directos | Click en "Ir a alertas" / "Ir a bloqueos" | Navega a las vistas globales de Alertas/Bloqueos ya existentes |
| C3.6 | Persistencia de cambios | Editar un parámetro desde el modal y guardar | El valor se actualiza y se refleja inmediatamente en la card, sin necesidad de recargar el popup completo |

## C.4 Módulos y productos

| ID | Caso de prueba | Pasos | Resultado esperado |
|----|----------------|-------|---------------------|
| C4.1 | Card PCT — con registros | Usuario con comercio PCT vinculado | Muestra cantidad de comercios vinculados y botón "Ver comercios PCT" |
| C4.2 | Card PCT — sin registros | Usuario sin comercio PCT | Muestra "Sin registros" y mensaje "No se encontró comercio PCT asociado por email o legajo" |
| C4.3 | Card Links de Pago — con/sin registros | Repetir C4.1/C4.2 para Links de Pago | Mismo comportamiento, con botón "Ver links de pago" |
| C4.4 | Card API Externa — con/sin registros | Repetir C4.1/C4.2 para API Externa | Mismo comportamiento, con botón "Ver usuarios API" |
| C4.5 | Botón "Recargar" | Click en "Recargar" | Vuelve a ejecutar la detección contextual de los 3 módulos y refresca las 3 cards |
| C4.6 | Navegación de los botones "Ver..." | Click en cada botón "Ver comercios PCT / links de pago / usuarios API" | Navega correctamente a la vista global correspondiente de cada módulo |

## D. Delta en "Subcuentas y CVUs"

| ID | Caso de prueba | Pasos | Resultado esperado |
|----|----------------|-------|---------------------|
| D1 | Listado de subcuentas se mantiene | Abrir la sección Subcuentas y CVUs | El listado de subcuentas ya existente sigue visible y funcional (no fue removido) |
| D2 | KPI: CVUs informadas | Verificar valor mostrado | Coincide con la cantidad real de CVUs del usuario |
| D3 | KPI: Máximo de subcuentas | Verificar valor mostrado | Refleja el límite configurado para el usuario |
| D4 | KPI: Redirección automática | Verificar valor mostrado | Refleja el estado (Activa/Inactiva) correctamente |
| D5 | KPI: Presión operativa | Verificar valor mostrado | Refleja el valor/etiqueta correspondiente (ej. "Sin tope") |
| D6 | Botón "Eximir CUIT principal" | Click en el botón | Dispara el flujo correspondiente (modal o acción) para eximir el CUIT principal |
| D7 | Botón "Ir a usuarios con CVU" | Click en el botón | Navega a la vista global de Usuarios con CVU |
| D8 | Botón "Cargar subcuentas" (nuevo) | Click en el botón | Permite iniciar el flujo de carga de subcuentas para este usuario |
| D9 | Carga eficiente del listado | Abrir la sección con un usuario con muchas subcuentas (ej. +500) | El listado completo no se consulta automáticamente al abrir; se carga solo cuando se solicita (ver principio general de rendimiento) |

## E. Restricción de alcance — exclusividad Persona Física

| ID | Caso de prueba | Pasos | Resultado esperado |
|----|----------------|-------|---------------------|
| E1 | Persona Jurídica NO muestra Validaciones automáticas | Abrir el popup de un usuario Persona Jurídica | La sección "Validaciones automáticas" no aparece |
| E2 | Persona Jurídica NO muestra Contexto operativo | Abrir el popup de un usuario Persona Jurídica | La sección "Contexto operativo" no aparece |
| E3 | Persona Jurídica NO muestra Riesgo y monitoreo | Abrir el popup de un usuario Persona Jurídica | La sección "Riesgo y monitoreo" no aparece |
| E4 | Persona Jurídica NO muestra Módulos y productos | Abrir el popup de un usuario Persona Jurídica | La sección "Módulos y productos" no aparece |
| E5 | Persona Jurídica NO muestra el delta de KPIs/botones en Subcuentas y CVUs | Abrir el popup de un usuario Persona Jurídica, sección Subcuentas y CVUs | Solo se muestra el listado base de subcuentas; no aparecen las 4 KPIs ni los 3 botones nuevos (Eximir CUIT principal, Ir a usuarios con CVU, Cargar subcuentas) |
| E6 | No solo oculto visualmente, sino no construido | Inspeccionar (vía dev tools o el propio código fuente si es accesible) el componente renderizado para Persona Jurídica | Las secciones exclusivas de Persona Física no se renderizan condicionalmente ocultas en el DOM — no deben existir en el árbol de componentes de Persona Jurídica |
| E7 | Persona Física sí muestra todo lo anterior | Repetir E1–E5 con un usuario Persona Física | Las 4 secciones y el delta de Subcuentas y CVUs sí aparecen completos |

## F. Restricciones generales — no romper lo existente

| ID | Caso de prueba | Pasos | Resultado esperado |
|----|----------------|-------|---------------------|
| F1 | Bloque "Datos del usuario" intacto | Verificar todos los campos base (Legajo, Email, Tipo de cuenta, Estado, Nombre, Apellido, CUIT, Género, Ocupación, Origen de fondos, Dirección, Número de dirección, Ciudad, Estado/Provincia, Código postal, Fecha de nacimiento, PEP) | Todos los campos siguen presentes y editables inline, sin cambios respecto a la implementación previa |
| F2 | Bloque "Documentos" intacto | Verificar tabs ID Frente / ID Dorso / Servicio / Selfie, vista previa, "Ver documento completo", acciones Bloquear/Editar datos/Rechazar/Habilitar | Sin cambios respecto a la implementación previa |
| F3 | Modal "Eximir débitos y créditos" intacto | Click en "Eximir débitos y créditos" desde la card de Estado actual | Se abre el modal con CUIT, Dirección, Motivo, Vigencia desde/hasta, sin cambios |
| F4 | No se afectó ningún otro módulo del panel | Navegar a Movimientos, Alertas, Reportes, etc. | Ningún otro módulo fue modificado como consecuencia de este cambio |
| F5 | Listado principal de Personas físicas intacto | Volver al listado de Personas físicas tras cerrar el popup | Columnas, filtros y acciones de la tabla principal permanecen sin cambios |

---

## Resumen de cobertura

- **Sección A**: 4 casos — unificación de vista.
- **Sección B**: 3 casos — extensibilidad de la card de Productos.
- **Sección C.1–C.4**: 22 casos — las 4 secciones nuevas (Validaciones automáticas, Contexto operativo, Riesgo y monitoreo, Módulos y productos).
- **Sección D**: 9 casos — delta de Subcuentas y CVUs.
- **Sección E**: 7 casos — exclusividad de Persona Física (crítico, no debe fallar ninguno).
- **Sección F**: 5 casos — no regresión sobre lo ya existente.

**Total: 50 casos de prueba.** Ningún caso de la Sección E puede quedar en NO PASA — es la restricción más crítica del alcance definido.
