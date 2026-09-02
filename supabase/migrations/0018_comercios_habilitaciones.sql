-- 0018_comercios_habilitaciones: agrega flags para canales de cobro
alter table public.comercios
  add column if not exists habilitado_pago_transferencia boolean not null default false,
  add column if not exists habilitado_enlaces_pago boolean not null default false;

comment on column public.comercios.habilitado_pago_transferencia is 'Habilitado para pago con transferencias (PCT)';
comment on column public.comercios.habilitado_enlaces_pago is 'Habilitado para enlaces de pago';
