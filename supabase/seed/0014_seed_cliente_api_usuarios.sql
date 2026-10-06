-- ============================================================================
-- seed 0014_seed_cliente_api_usuarios.sql
-- Vincula api_usuarios reales a clientes para que el tab "API Externa"
-- en /admin/general/usuarios/[legajo] muestre datos reales (no mocks).
-- Idempotente: usa ON CONFLICT DO NOTHING.
-- Correr DESPUES de 0022_cliente_api_usuarios.sql.
-- Si no hay api_usuarios, crea 2 de demo y los vincula al primer cliente.
-- ============================================================================

do $$
declare
  v_cliente_legajo text;
  v_api_id uuid;
  v_cant_api int;
begin
  select legajo into v_cliente_legajo from public.clientes order by created_at limit 1;
  if v_cliente_legajo is null then
    raise notice 'No hay clientes, seed abortado';
    return;
  end if;

  select count(*) into v_cant_api from public.api_usuarios;
  if v_cant_api = 0 then
    insert into public.api_usuarios (codigo_usuario_api, usuario, nombre_completo, estado)
    values
      ('9001', 'api.demo1@molipay.test', 'Demo API 1', 'Producción'),
      ('9002', 'api.demo2@molipay.test', 'Demo API 2', 'Homologación')
    returning id into v_api_id;
  end if;

  -- vincular hasta 2 api_usuarios al primer cliente (demo)
  insert into public.cliente_api_usuarios (cliente_legajo, api_usuario_id)
  select v_cliente_legajo, id from public.api_usuarios order by created_at limit 2
  on conflict (cliente_legajo, api_usuario_id) do nothing;

  -- opcional: crear endpoints/logs de demo para el primer api_usuario vinculado
  -- para verificar que el detalle (endpoints/logs) tambien sea real
  select api_usuario_id into v_api_id from public.cliente_api_usuarios where cliente_legajo = v_cliente_legajo order by created_at limit 1;
  if v_api_id is not null then
    if not exists (select 1 from public.api_usuario_endpoints where api_usuario_id = v_api_id) then
      insert into public.api_usuario_endpoints (api_usuario_id, grupo, path, metodo, estado)
      values
        (v_api_id, 'Transfer', '/api/v1/transfer', 'POST', 'Habilitado'),
        (v_api_id, 'User', '/api/v1/user', 'GET', 'Habilitado');
    end if;
    if not exists (select 1 from public.api_usuario_logs where api_usuario_id = v_api_id) then
      insert into public.api_usuario_logs (api_usuario_id, fecha_hora, ip, cliente_id, metodo, endpoint, status, tiempo_respuesta_ms, detalle)
      values
        (v_api_id, now(), '10.0.0.1', v_cliente_legajo, 'POST', '/api/v1/transfer', 200, 124,
         jsonb_build_object('usuarioId', v_api_id, 'ip', '10.0.0.1', 'metodoHttp', 'POST', 'endpoint', '/api/v1/transfer', 'estadoHttp', 200, 'tiempoRespuesta', '124ms', 'userAgent', 'molipay-admin/1.0', 'fecha', now()::text, 'requestBody', '{}', 'responseBody', '{}')),
        (v_api_id, now() - interval '1 day', '10.0.0.2', v_cliente_legajo, 'GET', '/api/v1/user', 200, 89,
         jsonb_build_object('usuarioId', v_api_id, 'ip', '10.0.0.2', 'metodoHttp', 'GET', 'endpoint', '/api/v1/user', 'estadoHttp', 200, 'tiempoRespuesta', '89ms', 'userAgent', 'molipay-admin/1.0', 'fecha', (now() - interval '1 day')::text, 'requestBody', '{}', 'responseBody', '{}'));
    end if;
  end if;
end $$;
