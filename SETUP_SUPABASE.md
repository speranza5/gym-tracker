# Setup: login con Google + Supabase

Pasos para dejar listo el login con Google y la sincronización en la nube de Mi Rutina. Todo gratis. Una vez que termines esto, retomá la conversación con Claude Code (ver abajo) y te implemento el código.

## A. Crear proyecto de Supabase

1. Ir a https://supabase.com → crear cuenta/loguearse → **New Project**.
2. Elegir un nombre (ej: `gym-tracker`), una contraseña de base (guardala, no hace falta para esto pero por las dudas) y la región más cercana.
3. Cuando el proyecto esté listo, ir a **Project Settings → API** y copiar:
   - **Project URL** (`https://<project-ref>.supabase.co`)
   - **anon public key**
4. Ir a **SQL Editor** → pegar y ejecutar este script (crea las 3 tablas + seguridad por usuario):

```sql
create table public.routines (
  user_id uuid primary key references auth.users(id) on delete cascade,
  file_name text,
  days jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  date text not null,
  checked jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  day_id text not null,
  day_name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, date, day_id)
);

alter table public.routines enable row level security;
alter table public.progress enable row level security;
alter table public.history enable row level security;

create policy "own routine" on public.routines for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own progress" on public.progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own history" on public.history for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## B. Crear credenciales de Google OAuth

1. Ir a https://console.cloud.google.com → crear proyecto (o usar uno existente).
2. **APIs & Services → OAuth consent screen**: tipo "External", completar nombre de la app y mail de contacto. No hace falta verificación para uso personal (queda en modo "Testing"; si lo pide, agregá tu propio mail como usuario de prueba).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → tipo "Web application".
4. En **Authorized redirect URIs** pegar la URL de callback de **Supabase** (NO el dominio de la app):
   `https://<project-ref>.supabase.co/auth/v1/callback`
5. Copiar el **Client ID** y **Client Secret** generados.

## C. Conectar Google a Supabase Auth

1. En el dashboard de Supabase: **Authentication → Providers → Google** → activar, pegar el Client ID y Client Secret del paso B.
2. **Authentication → URL Configuration**:
   - Site URL = `https://gym-tracker.carlossperanza.fyi`
   - Redirect URLs: agregar también `http://localhost:5173/**` (para probar en local) y `https://gym-tracker.carlossperanza.fyi/**`.

## Lo que hay que tener a mano para retomar

- **Project URL** de Supabase (paso A.3)
- **anon public key** de Supabase (paso A.3)

(Las credenciales de Google del paso B quedan solo dentro de la configuración de Supabase — no hace falta pasarlas de nuevo.)

## Cómo retomar esta sesión

- Desde una terminal parada en `~/gym-tracker`, correr `claude --continue` (retoma la última conversación de esta carpeta) o `claude --resume` (te deja elegir la sesión de una lista).
- Si no la encuentra (otra máquina, pasó mucho tiempo), abrí una conversación nueva de Claude Code en `~/gym-tracker` y decí algo como: *"Retomamos el plan de login con Google + Supabase, ya tengo las claves"*. El plan completo (arquitectura, archivos a crear/modificar, estrategia de sincronización) sigue guardado en `~/.claude/plans/quiero-que-tenga-un-rosy-pike.md`, y este mismo archivo (`SETUP_SUPABASE.md`) queda en el repo como referencia.
- Pasá el **Project URL** y la **anon public key** de Supabase en ese momento, y arranco con la implementación (auth, sincronización con localStorage como caché offline, botón de login en el header y en la pantalla de carga).
