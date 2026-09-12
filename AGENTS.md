# Gym Tracker — instrucciones para agentes

App de rutina de gimnasio (React 19 + Vite, JS plano) que evoluciona hacia
**Open Tracker**: la rutina de un usuario expuesta como API REST pública para
que agentes de IA, un servidor MCP, SDKs y apps la lean/escriban.

## Antes de tocar código

La documentación de este repo es la fuente de verdad, no el código. Leé en
este orden según lo que vayas a hacer:

| Archivo | Cuándo leerlo |
|---|---|
| `docs/handoff.md` | **Siempre.** Estado actual, qué está hecho, qué no, deuda técnica. |
| `docs/CONTRIBUTING_AI.md` | **Siempre.** Filosofía, principios, proceso para cambios grandes. |
| `docs/decisions.md` | Antes de cambiar arquitectura, auth, storage, API o dominio. 13 decisiones con alternativas y motivos. |
| `docs/architecture.md` | Antes de agregar un módulo o mover lógica entre capas. |
| `docs/api.md` | Antes de tocar `netlify/functions/` o el contrato `/api/v1`. |
| `docs/roadmap.md` | Antes de proponer qué hacer próximo. |
| `docs/etapa-N-analisis.md` | Historial de cada etapa de trabajo. Consultá la más alta para ver el último análisis. |

`docs/handoff.md` y `docs/CONTRIBUTING_AI.md` se cargan automáticamente vía
`instructions` en `opencode.json` — no hace falta leerlos con una tool.
El resto son lectura on-demand.

## Capas (no mezclar)

```
src/components/  → UI pura. NO accede a Supabase ni tiene reglas de negocio.
src/hooks/       → estado React y orquestación (cuándo leer/guardar).
src/domain/      → funciones puras de negocio. Sin dependencias externas.
src/utils/       → transporte y helpers (Excel, Supabase, storage).
netlify/functions/ → la API REST. No valida "a mano" lo que valida el dominio.
```

`src/domain/routine.js` es la única fuente de verdad de "qué es una rutina
válida". Excel, la API y el futuro MCP la llaman por igual — no se duplica.

## Convenciones

- **Sin TypeScript.** JS plano + JSDoc donde el tipo no es obvio (referencia de estilo: `src/domain/routine.js`).
- **Sin CSS framework.** Variables en `src/index.css` (`--bg`, `--accent`, `--border`, `--radius`). Reusalas, no inventes colores.
- **Comentarios explican el "por qué", nunca el "qué".** El código se nombra para explicarse solo.
- **Nombres:** componentes `PascalCase.jsx`, hooks `useAlgo.js`, utils/dominio `camelCase.js`.
- **Idioma:** código, comentarios y docs en español. Mensajes de commit en inglés, imperativos ("Add X", "Fix Y").
- **Subcarpetas en `components/`** solo cuando una feature ya tiene 3+ componentes propios (ej. `openTracker/`).

## Comandos

```bash
npm run dev      # vite dev server
npm run build    # build de producción
npm run lint     # oxlint
netlify dev      # dev con las Functions de la API andando
```

**No hay tests.** La verificación es manual: `npm run lint`, `npm run build`,
y `curl` contra `netlify dev` o producción. Si agregás algo al dominio,
proponé tests (es la pieza más crítica y más fácil de testear).

## Líneas rojas

- **No** mover validación/mapeo de rutina fuera de `src/domain/routine.js`.
- **No** poner `SUPABASE_SERVICE_ROLE_KEY` detrás de `VITE_` ni usarla desde código de cliente.
- **No** eliminar el fallback offline-first (`localStorage` como fuente de verdad inmediata). Es requisito de producto.
- **No** cambiar la forma del DTO público `Routine` (`fileName`, `days`, `updatedAt`) sin versionar a `/api/v2`.
- **No** hacer que `mcp-identity.js` devuelva la API Key real (solo `{userId, email}`).
- **No** aflojar el CORS de `mcp-api-key.js` (hoy sin CORS en absoluto, a propósito).
- **No** asumir que el frontend es el único cliente de la API al diseñar endpoints nuevos.

## Proceso para cambios grandes

Seguí `docs/CONTRIBUTING_AI.md#cómo-proponer-cambios-grandes`: analizar,
explicar alternativas, recomendar una, **recién ahí** implementar. No
arranques a escribir código para un cambio estructural sin ese paso.

Cuando cierres una decisión no obvia, agregala a `docs/decisions.md` con
alternativas y motivo. Cuando cambie el estado del proyecto, actualizá
`docs/handoff.md`.
