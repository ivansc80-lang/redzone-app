-- Añade CAMPEON_REDZONE al PALMARÉS histórico.
-- Localiza el CHECK existente de tipo_logro sin depender de su nombre.

do $$
declare
  constraint_name text;
begin
  select c.conname
    into constraint_name
  from pg_constraint c
  join pg_class t
    on t.oid = c.conrelid
  join pg_namespace n
    on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'logros'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%tipo_logro%'
  limit 1;

  if constraint_name is not null then
    execute format(
      'alter table public.logros drop constraint %I',
      constraint_name
    );
  end if;
end
$$;

alter table public.logros
  add constraint logros_tipo_logro_check
  check (
    tipo_logro in (
      'PLENO_MAGICO',
      'PLENO_REDZONE',
      'CAMPEON_REDZONE'
    )
  );
