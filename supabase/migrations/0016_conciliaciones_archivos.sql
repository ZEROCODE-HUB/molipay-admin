-- ============================================================================
-- 0016_conciliaciones_archivos.sql
-- Persistencia real para carga de CSV de conciliaciones bancarias y BLP
-- Crea tabla conciliaciones_archivos + bucket storage conciliaciones
-- Fecha: 2026-09-01
-- ============================================================================

-- Tabla: una fila = un archivo subido desde /admin/administracion/reportes
-- tipo = 'bancaria' (Conciliaciones Bancarias) | 'blp' (Conciliaciones BLP)
create table if not exists public.conciliaciones_archivos (
  id uuid primary key default gen_random_uuid(),
  nombre_archivo text not null,
  fecha_carga date not null,
  storage_path text,
  estado text not null default 'Pendiente'
    check (estado = any (array['Pendiente'::text,'Analizado'::text,'Error'::text,'Presentada'::text,'Liquidada'::text,'En proceso'::text])),
  tipo text not null default 'bancaria'
    check (tipo = any (array['bancaria'::text,'blp'::text])),
  archivo_origen text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_conciliaciones_archivos_fecha on public.conciliaciones_archivos (fecha_carga desc);
create index if not exists idx_conciliaciones_archivos_tipo on public.conciliaciones_archivos (tipo);

alter table public.conciliaciones_archivos enable row level security;

-- RLS: patron B del proyecto - authenticated ALL true/true (mismo que conciliaciones, ib_padrones, etc.)
drop policy if exists authenticated_all_conciliaciones_archivos on public.conciliaciones_archivos;
create policy authenticated_all_conciliaciones_archivos on public.conciliaciones_archivos
  for all to authenticated
  using (true)
  with check (true);

-- Storage bucket: conciliaciones (privado, acceso via RLS/storage policies)
insert into storage.buckets (id, name, public)
values ('conciliaciones', 'conciliaciones', false)
on conflict (id) do nothing;

-- Politicas de storage para bucket conciliaciones: permitir a authenticated subir/leer/borrar
-- Estas politicas se crean solo si no existen (idempotente via DO block)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='authenticated_upload_conciliaciones') then
    create policy authenticated_upload_conciliaciones on storage.objects
      for insert to authenticated
      with check (bucket_id = 'conciliaciones');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='authenticated_read_conciliaciones') then
    create policy authenticated_read_conciliaciones on storage.objects
      for select to authenticated
      using (bucket_id = 'conciliaciones');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='authenticated_delete_conciliaciones') then
    create policy authenticated_delete_conciliaciones on storage.objects
      for delete to authenticated
      using (bucket_id = 'conciliaciones');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='authenticated_update_conciliaciones') then
    create policy authenticated_update_conciliaciones on storage.objects
      for update to authenticated
      using (bucket_id = 'conciliaciones')
      with check (bucket_id = 'conciliaciones');
  end if;
end $$;

-- Verificacion post-aplicacion:
-- select * from public.conciliaciones_archivos limit 1;
-- select id, name, public from storage.buckets where id='conciliaciones';
