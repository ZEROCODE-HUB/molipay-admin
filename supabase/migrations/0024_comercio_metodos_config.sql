-- 0024_comercio_metodos_config: banderas habilitadas por comercio
-- Cada comercio puede tener N métodos de pago habilitados con comisiones específicas.
-- Se almacena como jsonb en comercios.metodos_config para evitar tabla adicional
-- (compatible con fallback localStorage cuando la columna aún no existe).
alter table public.comercios
  add column if not exists metodos_config jsonb not null default '[]'::jsonb;

comment on column public.comercios.metodos_config is 'Array JSON de ComercioMetodoConfig: {metodoId, metodoNombre, tipo, comisionMolipay, comisionPayway, comisionNeta}';
