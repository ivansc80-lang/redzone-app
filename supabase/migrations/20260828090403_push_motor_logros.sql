-- ============================================================
-- REDZONE - MOTOR PUSH AUTOMÁTICO
-- ============================================================

create table if not exists public.push_eventos_enviados (
  id uuid primary key default gen_random_uuid(),
  clave_evento text not null unique,
  tipo_evento text not null,
  temporada integer,
  jornada integer,
  user_id uuid references auth.users(id) on delete cascade,
  titulo text not null,
  mensaje text not null,
  metadata jsonb not null default '{}'::jsonb,
  enviado_at timestamptz not null default now()
);

create index if not exists idx_push_eventos_tipo
  on public.push_eventos_enviados(tipo_evento);

create index if not exists idx_push_eventos_temporada_jornada
  on public.push_eventos_enviados(temporada, jornada);

create index if not exists idx_push_eventos_user
  on public.push_eventos_enviados(user_id);

alter table public.push_eventos_enviados enable row level security;

-- El cliente normal no necesita escribir aquí.
-- El motor servidor trabaja mediante service role.
grant select on public.push_eventos_enviados to authenticated;
grant all on public.push_eventos_enviados to service_role;

drop policy if exists "push_eventos_select_authenticated"
  on public.push_eventos_enviados;

create policy "push_eventos_select_authenticated"
on public.push_eventos_enviados
for select
to authenticated
using (true);


-- ============================================================
-- LOGROS HISTÓRICOS PARA PALMARÉS
-- Solo PLENO_MAGICO y PLENO_REDZONE
-- ============================================================

create table if not exists public.logros (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  temporada integer not null,
  jornada integer not null,

  tipo_competicion text not null default 'regular',

  tipo_logro text not null
    check (tipo_logro in ('PLENO_MAGICO', 'PLENO_REDZONE')),

  detalle text,
  metadata jsonb not null default '{}'::jsonb,

  conseguido_at timestamptz not null default now(),

  unique (
    user_id,
    temporada,
    jornada,
    tipo_competicion,
    tipo_logro
  )
);

create index if not exists idx_logros_user
  on public.logros(user_id);

create index if not exists idx_logros_temporada
  on public.logros(temporada, jornada);

alter table public.logros enable row level security;

grant select on public.logros to authenticated;
grant all on public.logros to service_role;

drop policy if exists "logros_select_authenticated"
  on public.logros;

create policy "logros_select_authenticated"
on public.logros
for select
to authenticated
using (true);
