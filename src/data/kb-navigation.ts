/* eslint-disable */
// Archivo generado automáticamente por scripts/generate-kb-nav.mjs (disparado por el hook git post-commit).
// No editar manualmente: se regenera en cada commit a partir de src/routeTree.gen.ts.

export const KB_NAVIGATION = `Estructura actual del panel administrativo (se genera automáticamente en cada cambio):

• Root:
   - Admin  (/admin)

• Administración:
   - Registros  (/admin/administracion/registros)
   - Total de fondos — Admin Panel  (/admin/administracion/registros/total)
   - Reportes — Admin Panel  (/admin/administracion/reportes)
   - Soporte  (/admin/administracion/soporte)
   - Bloqueo de funciones — Admin Panel  (/admin/administracion/soporte/bloqueo)
   - Usuarios  (/admin/administracion/usuarios)
   - Actividad en backoffice — Admin Panel  (/admin/administracion/usuarios/actividad)
   - Roles y permisos — Admin Panel  (/admin/administracion/usuarios/roles)

• Comercios:
   - Comercios — Admin — Moli  (/admin/comercios)
   - APIs externas — Admin — Moli  (/admin/comercios/apis)
   - APIs externas — Endpoints — Admin — Moli  (/admin/comercios/apis/endpoints)
   - Resolvers — APIs externas — Admin — Moli  (/admin/comercios/apis/resolvers)
   - APIs externas — Restricciones — Admin — Moli  (/admin/comercios/apis/restricciones)
   - Impuestos — Admin — Moli  (/admin/comercios/impuestos)
   - Débitos y créditos — Admin — Moli  (/admin/comercios/impuestos/debitos-creditos)
   - Ingresos Brutos — Admin — Moli  (/admin/comercios/impuestos/ingresos-brutos)
   - Usuarios con impuestos — Admin — Moli  (/admin/comercios/impuestos/usuarios)
   - Link de pago — Admin — Moli  (/admin/comercios/link-pago)
   - Métodos de pago — Link de pago — Admin — Moli  (/admin/comercios/link-pago/metodos-pago)
   - Pagos con transferencia — Admin — Moli  (/admin/comercios/transferencia)
   - Categorias  (/admin/comercios/transferencia/categorias)

• Configuración:
   - Configuración — Admin — Moli  (/admin/configuracion)
   - Configuraciones de login — Admin — Moli  (/admin/configuracion/configuraciones)
   - Logins configurados — Admin — Moli  (/admin/configuracion/logins)

• General:
   - Alertas — Admin Molly  (/admin/general/alertas)
   - Listado de bloqueos — Admin Panel  (/admin/general/alertas/bloqueos)
   - Parámetros de alertas — Admin Panel  (/admin/general/alertas/parametros-alertas)
   - Parámetros de bloqueos — Admin Panel  (/admin/general/alertas/parametros-bloqueos)
   - Movimientos — Admin Molly  (/admin/general/movimientos)
   - Cobros QR — Movimientos — Admin Molly  (/admin/general/movimientos/cobros-qr)
   - Cobro de comisiones — Movimientos — Admin Molly  (/admin/general/movimientos/comisiones)
   - Depósitos — Movimientos — Admin Molly  (/admin/general/movimientos/depositos)
   - Impuestos cobrados — Movimientos — Admin Molly  (/admin/general/movimientos/impuestos)
   - Pagos QR — Movimientos — Admin Molly  (/admin/general/movimientos/pagos-qr)
   - Pagos con tarjeta — Movimientos — Admin Molly  (/admin/general/movimientos/pagos-tarjeta)
   - Retiros — Movimientos — Admin Molly  (/admin/general/movimientos/retiros)
   - Usuarios — Admin Molly  (/admin/general/usuarios)
   - Ficha de cliente — Admin Molly  (/admin/general/usuarios/$legajo)
   - Carga de comisiones — Usuarios — Admin Molly  (/admin/general/usuarios/comisiones)
   - Usuarios con CVU — Usuarios — Admin Molly  (/admin/general/usuarios/cvu)
   - Personas jurídicas — Usuarios — Admin Molly  (/admin/general/usuarios/juridicas)

• Comunicación:
   - Comunicación de incidentes — Admin Panel  (/admin/incidentes)

• Sistema:
   - Salud de módulos — Admin — Moli  (/admin/modulos)

• Sistema:
   - Sistema de Notificaciones — Admin — Moli  (/admin/notificaciones)

• Registros:
   - Registros  (/administracion/registros)

• Reportes:
   - Reportes  (/administracion/reportes)

• Soporte:
   - Soporte  (/administracion/soporte)

• Usuarios:
   - Usuarios  (/administracion/usuarios)

`;

export const KB_ROUTES: { path: string; title: string }[] = [
  {
    "path": "/admin",
    "title": "Admin"
  },
  {
    "path": "/admin/administracion/registros",
    "title": "Registros"
  },
  {
    "path": "/admin/administracion/registros/total",
    "title": "Total de fondos — Admin Panel"
  },
  {
    "path": "/admin/administracion/reportes",
    "title": "Reportes — Admin Panel"
  },
  {
    "path": "/admin/administracion/soporte",
    "title": "Soporte"
  },
  {
    "path": "/admin/administracion/soporte/bloqueo",
    "title": "Bloqueo de funciones — Admin Panel"
  },
  {
    "path": "/admin/administracion/usuarios",
    "title": "Usuarios"
  },
  {
    "path": "/admin/administracion/usuarios/actividad",
    "title": "Actividad en backoffice — Admin Panel"
  },
  {
    "path": "/admin/administracion/usuarios/roles",
    "title": "Roles y permisos — Admin Panel"
  },
  {
    "path": "/admin/comercios",
    "title": "Comercios — Admin — Moli"
  },
  {
    "path": "/admin/comercios/apis",
    "title": "APIs externas — Admin — Moli"
  },
  {
    "path": "/admin/comercios/apis/endpoints",
    "title": "APIs externas — Endpoints — Admin — Moli"
  },
  {
    "path": "/admin/comercios/apis/resolvers",
    "title": "Resolvers — APIs externas — Admin — Moli"
  },
  {
    "path": "/admin/comercios/apis/restricciones",
    "title": "APIs externas — Restricciones — Admin — Moli"
  },
  {
    "path": "/admin/comercios/impuestos",
    "title": "Impuestos — Admin — Moli"
  },
  {
    "path": "/admin/comercios/impuestos/debitos-creditos",
    "title": "Débitos y créditos — Admin — Moli"
  },
  {
    "path": "/admin/comercios/impuestos/ingresos-brutos",
    "title": "Ingresos Brutos — Admin — Moli"
  },
  {
    "path": "/admin/comercios/impuestos/usuarios",
    "title": "Usuarios con impuestos — Admin — Moli"
  },
  {
    "path": "/admin/comercios/link-pago",
    "title": "Link de pago — Admin — Moli"
  },
  {
    "path": "/admin/comercios/link-pago/metodos-pago",
    "title": "Métodos de pago — Link de pago — Admin — Moli"
  },
  {
    "path": "/admin/comercios/transferencia",
    "title": "Pagos con transferencia — Admin — Moli"
  },
  {
    "path": "/admin/comercios/transferencia/categorias",
    "title": "Categorias"
  },
  {
    "path": "/admin/configuracion",
    "title": "Configuración — Admin — Moli"
  },
  {
    "path": "/admin/configuracion/configuraciones",
    "title": "Configuraciones de login — Admin — Moli"
  },
  {
    "path": "/admin/configuracion/logins",
    "title": "Logins configurados — Admin — Moli"
  },
  {
    "path": "/admin/general/alertas",
    "title": "Alertas — Admin Molly"
  },
  {
    "path": "/admin/general/alertas/bloqueos",
    "title": "Listado de bloqueos — Admin Panel"
  },
  {
    "path": "/admin/general/alertas/parametros-alertas",
    "title": "Parámetros de alertas — Admin Panel"
  },
  {
    "path": "/admin/general/alertas/parametros-bloqueos",
    "title": "Parámetros de bloqueos — Admin Panel"
  },
  {
    "path": "/admin/general/movimientos",
    "title": "Movimientos — Admin Molly"
  },
  {
    "path": "/admin/general/movimientos/cobros-qr",
    "title": "Cobros QR — Movimientos — Admin Molly"
  },
  {
    "path": "/admin/general/movimientos/comisiones",
    "title": "Cobro de comisiones — Movimientos — Admin Molly"
  },
  {
    "path": "/admin/general/movimientos/depositos",
    "title": "Depósitos — Movimientos — Admin Molly"
  },
  {
    "path": "/admin/general/movimientos/impuestos",
    "title": "Impuestos cobrados — Movimientos — Admin Molly"
  },
  {
    "path": "/admin/general/movimientos/pagos-qr",
    "title": "Pagos QR — Movimientos — Admin Molly"
  },
  {
    "path": "/admin/general/movimientos/pagos-tarjeta",
    "title": "Pagos con tarjeta — Movimientos — Admin Molly"
  },
  {
    "path": "/admin/general/movimientos/retiros",
    "title": "Retiros — Movimientos — Admin Molly"
  },
  {
    "path": "/admin/general/usuarios",
    "title": "Usuarios — Admin Molly"
  },
  {
    "path": "/admin/general/usuarios/$legajo",
    "title": "Ficha de cliente — Admin Molly"
  },
  {
    "path": "/admin/general/usuarios/comisiones",
    "title": "Carga de comisiones — Usuarios — Admin Molly"
  },
  {
    "path": "/admin/general/usuarios/cvu",
    "title": "Usuarios con CVU — Usuarios — Admin Molly"
  },
  {
    "path": "/admin/general/usuarios/juridicas",
    "title": "Personas jurídicas — Usuarios — Admin Molly"
  },
  {
    "path": "/admin/incidentes",
    "title": "Comunicación de incidentes — Admin Panel"
  },
  {
    "path": "/admin/modulos",
    "title": "Salud de módulos — Admin — Moli"
  },
  {
    "path": "/admin/notificaciones",
    "title": "Sistema de Notificaciones — Admin — Moli"
  },
  {
    "path": "/administracion/registros",
    "title": "Registros"
  },
  {
    "path": "/administracion/reportes",
    "title": "Reportes"
  },
  {
    "path": "/administracion/soporte",
    "title": "Soporte"
  },
  {
    "path": "/administracion/usuarios",
    "title": "Usuarios"
  }
];
