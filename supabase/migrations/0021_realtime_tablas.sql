-- 0021_realtime_tablas.sql
-- Habilita Realtime para tablas que deben refrescarse en vivo en Admin
-- usuarios, movimientos, puntos_venta (Pagos con QR), cliente_links_pago (Enlaces)

do $$ begin
  -- clientes
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='clientes') then
    alter publication supabase_realtime add table public.clientes;
  end if;
  -- movimientos
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='movimientos') then
    alter publication supabase_realtime add table public.movimientos;
  end if;
  -- puntos_venta (QR/POS)
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='puntos_venta') then
    alter publication supabase_realtime add table public.puntos_venta;
  end if;
  -- enlaces de pago
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='cliente_links_pago') then
    alter publication supabase_realtime add table public.cliente_links_pago;
  end if;
exception when others then
  -- si la publicacion no existe o ya esta, ignora (polling cubre igual)
  null;
end $$;
