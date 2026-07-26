# Setup: Open Tracker (API pública v1)

Dos pasos para terminar de habilitar la API de Open Tracker. Una vez
hechos, retomá la conversación con Claude Code y se completa el despliegue.

## A. Correr este SQL en Supabase → SQL Editor

Crea las tablas de API Keys y de rate limiting:

```sql
create table public.api_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  api_key text not null unique,
  key_prefix text not null,
  created_at timestamptz not null default now()
);
alter table public.api_keys enable row level security;
create policy "own api key" on public.api_keys for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.api_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null default 1,
  primary key (user_id, window_start)
);
alter table public.api_rate_limits enable row level security;

create or replace function public.increment_rate_limit(p_user_id uuid, p_window timestamptz)
returns int language plpgsql as $$
declare v_count int;
begin
  insert into api_rate_limits (user_id, window_start, request_count)
  values (p_user_id, p_window, 1)
  on conflict (user_id, window_start)
  do update set request_count = api_rate_limits.request_count + 1
  returning request_count into v_count;
  return v_count;
end; $$;
```

## B. Conseguir la Service Role Key de Supabase

1. Ir a **Project Settings → API** (el mismo lugar de donde salió la
   `publishable key` que ya usa el frontend).
2. Copiar la **service_role** (a veces llamada "secret key") — **no** es la
   misma que la `publishable key`. Esta nunca va al navegador: solo se usa
   server-side, en las Netlify Functions.

## Lo que hay que pasar de vuelta

- Confirmación de que corriste el SQL de arriba.
- La **service role / secret key** de Supabase (paso B), para setearla como
  `SUPABASE_SERVICE_ROLE_KEY` en Netlify (`netlify env:set`, nunca en
  `.env.local` del frontend).

Con eso se puede probar la API end-to-end (`netlify dev` + `curl`) y
desplegar. El resto del código (dominio compartido, endpoints, UI de Open
Tracker, documentación en `docs/api.md`) ya está implementado.
