# Etapa 13 — Empty state para usuario logueado sin rutina

> Análisis funcional previo a implementar. Depende de la
> [Etapa 12](./etapa-12-analisis.md) (login obligatorio ya en
> producción). Ver también: [`roadmap.md`](./roadmap.md) ·
> [`decisions.md`](./decisions.md)

## Objetivo

Que la pantalla que ve cualquier usuario logueado sin rutina todavía
(`FileUpload.jsx`, hoy solo un dropzone de Excel) ofrezca **tres**
caminos con el mismo peso para arrancar: subir un Excel ya armado,
descargar una plantilla para llenar, o pedirle a un asistente de IA que
la arme por chat vía Open Tracker/MCP — continuando el positioning de
la Etapa 12 ("Tu entrenamiento, conectado con tu IA") en el primer
momento real de uso, no solo en la landing.

## Hallazgo antes de especificar: bug de alcance, no solo falta de UI

`ConnectMcp.jsx` (la guía "Conectar MCP") existe y no depende de nada —
recibe únicamente `onBack`, ningún `user`/`apiKey`/`workoutData`. Pero
hoy es **inalcanzable** antes de tener una rutina: en `App.jsx`, la rama
`screen === 'open-tracker'` (que es como hoy se llega a `ConnectMcp`,
anidado dentro del hub de `OpenTracker.jsx`) está *después* del
`if (!workoutData) return <FileUpload ... />`, y el menú lateral
(`SideMenu.jsx`, único lugar con el ítem "Open Tracker") solo se
renderiza dentro del árbol principal de la app — que tampoco existe sin
`workoutData`. Es decir: hoy es literalmente imposible pedirle a una IA
que arme tu rutina por primera vez, porque el camino para conectarla
está enterrado detrás de la rutina que se supone que la IA te ayuda a
crear. Esta etapa no es solo "agregar dos botones" — primero corrige
ese candado.

## Decisiones ya tomadas

| Pregunta | Decisión |
|---|---|
| ¿Cuántos caminos y cuáles? | Tres, mismo peso visual: **Subir Excel** (ya existe), **Descargar plantilla**, **Armarla con IA** — decisión explícita del usuario, no el patrón "Excel primario + 2 secundarios" que sugería la redacción literal del roadmap |
| ¿La plantilla tiene contenido de ejemplo o placeholders vacíos? | Contenido de ejemplo ya completado (2 hojas, "Día 1"/"Día 2", con ejercicios reales de muestra) — decisión explícita: le muestra a la persona el formato exacto en vez de dejarla adivinar frente a celdas vacías |
| ¿Cómo se genera la plantilla? | Client-side con `xlsx` (SheetJS, ya es dependencia — lo usa `excelParser.js`), cargado de forma diferida igual que el parser, no committeada como archivo estático en `public/` |
| ¿Por qué no un archivo estático en `public/`? | Generarla con las mismas utilidades que ya define el formato evita que quede desincronizada si el formato cambia — un `.xlsx` estático commiteado no se actualiza solo si mañana cambian los headers reconocidos en `excelParser.js` |
| Camino "Armarla con IA" | Navega directo a `ConnectMcp.jsx` (reusando el componente existente tal cual, sin cambios) — requiere primero destrabar el bug de alcance de arriba |
| ¿Cómo se entera la app de que la IA ya armó la rutina? | Sin polling automático — se agrega un botón manual "Ya la armé, buscar mi rutina" en el propio empty state que re-ejecuta el pull de Supabase (mismo `pullCloudState` que ya corre una vez al montar en `useWorkoutData.js`). Ver "Fuera de alcance" — decisión de no sobre-construir con polling |
| ¿Se toca `SideMenu.jsx` para sumar un acceso directo a "Conectar MCP"? | No — fuera del alcance de esta etapa, que es específicamente sobre el estado vacío. El acceso vía Open Tracker → Conectar MCP sigue existiendo igual que hoy para cuando ya hay rutina |

## Fuera de alcance (pospuesto)

- **Welcome tour** (Etapa 14) — depende de esta etapa, no al revés.
- **Polling/tiempo real** para detectar que la IA terminó de armar la
  rutina — un botón de refresco manual alcanza; agregar polling o un
  websocket para este caso de uso (una sola vez, al arrancar) sería
  sobre-ingeniería.
- **Editar la plantilla generada desde la propia app** (ej. un wizard
  para armar la rutina campo por campo sin Excel) — sigue siendo
  "descargá, editá en Excel/Sheets, subí", no un formulario nuevo.
- **Cambiar el flujo de "Cambiar archivo"** (`handleChangeFile` en
  `App.jsx`, ya existe) — esta etapa es sobre la pantalla *sin* rutina,
  no sobre resetear una que ya existe.

## Bug fix: destrabar `ConnectMcp` antes de tener rutina

En `App.jsx`, mover el chequeo de un nuevo estado de pantalla
(`screen === 'connect-mcp'`) **antes** del `if (!workoutData)`:

```jsx
if (screen === 'connect-mcp') {
  return <ConnectMcp onBack={() => setScreen('routine')} />
}

if (!workoutData) {
  return (
    <FileUpload
      onFile={uploadFile}
      loading={loading}
      error={error}
      user={user}
      onSignOut={signOut}
      onConnectAi={() => setScreen('connect-mcp')}
      onRefresh={refreshFromCloud}
    />
  )
}
```

`ConnectMcp` se importa directo en `App.jsx` (no a través de
`OpenTracker.jsx`, que sigue siendo el único punto de entrada *cuando ya
hay rutina* vía el menú lateral — ahí no cambia nada). Duplicar el
`import` es preferible a inventar una ruta compartida entre dos árboles
de navegación distintos por un componente que ya es completamente
autónomo.

## `useWorkoutData.js`: exponer un refresh manual

Hoy el pull de Supabase (`pullCloudState`) corre una sola vez, en un
`useEffect` disparado por `userId`. Se agrega una función `refreshFromCloud`
que repite esa misma lógica bajo demanda (no un hook nuevo, no un
cambio de arquitectura — mismo `pullCloudState` ya existente, expuesto
como acción en vez de solo como efecto):

```js
const refreshFromCloud = useCallback(async () => {
  if (!userId) return
  const cloud = await pullCloudState(userId)
  if (cloud?.routine) {
    saveWorkoutData(cloud.routine)
    setWorkoutData(cloud.routine)
  }
}, [userId])
```

Devuelta junto al resto de `useWorkoutData` (`{ workoutData, uploadFile,
error, loading, resetWorkoutData, refreshFromCloud }`).

## Plantilla descargable: `src/utils/routineTemplate.js`

Nuevo archivo, mismo criterio de carga diferida que `excelParser.js`
(el comentario de ese archivo ya explica por qué: `xlsx` es pesado y la
mayoría de las visitas no lo necesita):

```js
export async function downloadRoutineTemplate() {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  const HEADERS = ['Bloque', 'Ejercicio', 'Series', 'Reps/Tiempo', 'Descripción']
  const dia1 = [
    HEADERS,
    ['Entrada en calor', 'Trote suave', '1', '5 min', 'Ritmo cómodo.'],
    ['Tren Superior', 'Press banca', '4', '10 reps', 'Bajar controlado, no rebotar en el pecho.'],
    ['Tren Superior', 'Remo con barra', '4', '10 reps', ''],
  ]
  const dia2 = [
    HEADERS,
    ['Tren Inferior', 'Sentadilla', '4', '12 reps', 'Rodillas alineadas con los pies.'],
    ['Tren Inferior', 'Zancadas', '3', '10 reps c/pierna', ''],
  ]

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dia1), 'Día 1')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dia2), 'Día 2')

  XLSX.writeFile(wb, 'plantilla-gym-tracker.xlsx')
}
```

- **Una hoja por día** (dos hojas en la plantilla) para que la
  convención "cada hoja de Excel es un día de rutina" —no documentada
  en ningún lado de la UI hoy— quede demostrada, no solo explicada.
- Mismos headers exactos que reconoce `HEADER_PATTERNS` en
  `excelParser.js` (`Bloque`, `Ejercicio`, `Series`, `Reps/Tiempo`,
  `Descripción`) — la plantilla generada tiene que poder subirse tal
  cual sin editar y funcionar.
- `XLSX.writeFile` en el navegador dispara la descarga sola (Blob +
  `<a>` interno de SheetJS) — no hace falta ningún manejo de archivo
  propio.

## `FileUpload.jsx`: tres caminos, mismo peso visual

Reestructura la pantalla de un único dropzone a tres tarjetas del mismo
tamaño/peso (columna en mobile, fila en desktop — mismo breakpoint
`720px` ya usado en `Landing.jsx`/`App.css`):

1. **Subí tu Excel** — el dropzone actual, sin cambios funcionales,
   ahora dentro de una tarjeta con el mismo padding/borde que las otras
   dos (hoy es el único elemento de la pantalla, sin "marco" propio).
2. **Descargá una plantilla** — ícono `Download`, un botón que llama
   `downloadRoutineTemplate()` directo (import local, sin pasar por
   `App.jsx` — es una acción de UI autocontenida, no cambia ningún
   estado que otra pantalla necesite conocer).
3. **Armala con tu IA** — ícono `Bot`, un botón que llama la prop nueva
   `onConnectAi` (sí pasa por `App.jsx`, porque cambia `screen`).

Arriba de las tres tarjetas: botón chico "Ya la armé, buscar mi rutina"
(ícono `RefreshCw`), llama a la prop nueva `onRefresh`
(`refreshFromCloud`) — visible siempre, no solo tras volver de
"Armala con tu IA", porque tampoco hace daño ofrecerlo si alguien subió
la rutina por otro dispositivo mientras tanto.

## Checklist de implementación

- [x] `src/utils/routineTemplate.js` — `downloadRoutineTemplate()`.
- [x] `useWorkoutData.js` — agregar `refreshFromCloud` (reusa
      `pullCloudState`, no lógica nueva) y devolverla.
- [x] `App.jsx` — chequeo de `screen === 'connect-mcp'` antes del
      `if (!workoutData)`; pasar `onConnectAi`/`onRefresh` nuevas a
      `FileUpload`.
- [x] `FileUpload.jsx` — reestructurar a 3 tarjetas + botón de refresh
      manual arriba; CSS nuevo reusando `--accent`/`--bg-card`/`--border`
      de `index.css`, mismo breakpoint `720px` que la landing.
- [x] Confirmar visualmente en el browser: las 3 tarjetas se ven con el
      mismo peso en mobile (apiladas) y desktop (en fila) — verificado
      con una página de preview temporal (`?preview`, montando
      `FileUpload` directo con un `user` de prueba, sin pasar por
      Supabase/Google), borrada después de usarla. La generación de la
      plantilla se validó aparte, en Node, confirmando que el `.xlsx`
      resultante tiene exactamente los headers que `excelParser.js`
      reconoce (round-trip real: se generó, se releyó, y las filas
      coinciden). **No verificado en un browser real con sesión real**:
      que "Armala con tu IA" lleve a `ConnectMcp` y "volver" traiga de
      nuevo al empty state, y que el botón de refresh manual efectivamente
      traiga una rutina nueva desde Supabase — ambos son wiring de
      `App.jsx` ya revisado por lectura (mismo patrón que el resto de la
      navegación por `screen`, sin lógica nueva propia), pero vale la
      pena un click real la primera vez que alguien use este flujo.
