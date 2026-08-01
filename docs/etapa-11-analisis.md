# Etapa 11 — Progresión de cargas por ejercicio

> Análisis funcional previo a implementar. Depende de la
> [Etapa 9](./etapa-9-analisis.md) (única fuente con historial real) y vive
> dentro de la pantalla de la [Etapa 10](./etapa-10-analisis.md). Ver
> también: [`roadmap.md`](./roadmap.md) · [`decisions.md`](./decisions.md)

## Objetivo

Que el usuario vea, para un ejercicio elegido, cómo evolucionó el peso
usado a lo largo del tiempo — la primera vez que la app grafica algo.

## Decisiones ya tomadas

| Pregunta | Decisión |
|---|---|
| Fuente de datos | Únicamente `training_sessions.exercises[].weightKg` — `exercise_benchmarks` (Etapa 8) solo guarda el valor actual, no sirve para una serie temporal |
| Selector de ejercicio | Tap en un ítem del Top 5 (Etapa 10) **+** una barra de búsqueda para cualquier otro ejercicio ya registrado |
| Rango temporal | Independiente del selector de período de la Etapa 10 — siempre "todo el historial" de ese ejercicio |
| Pesos nulos (ejercicio marcado sin peso) | Se excluyen del gráfico — no se grafican como 0 |
| Múltiples sesiones el mismo día | Cada una es su propio punto (no se agrega por día) |
| Librería de gráficos | [Recharts](https://recharts.org/) |
| Ubicación en la pantalla | Subsección nueva debajo del Top 5 en la pantalla de estadísticas (Etapa 10); elegir un ejercicio reemplaza el gráfico mostrado, no hay comparación de varios a la vez |
| Color de la línea | El `--accent` ya existente de la app (`#ff7a1a`) — ver nota de validación abajo |

## Fuera de alcance (pospuesto)

- Comparar dos o más ejercicios en el mismo gráfico.
- Cualquier filtro de rango sobre el propio gráfico de progresión (ej. "solo
  los últimos 3 meses") — siempre es la serie completa.
- Modo claro (ver nota de tema más abajo).

## Nota de diseño: color de la línea (skill `dataviz`)

Este es el primer gráfico del proyecto, así que se siguió el método de la
skill `dataviz` (forma → color → validación → marcas → interacción) antes
de escribir código. Hallazgos concretos, no a ojo:

- La app corre **`color-scheme: dark` fijo**, sin modo claro en ningún
  lado (`src/index.css:2`) — así que este análisis **no especifica una
  variante clara**, sería trabajo no pedido hasta que la app tenga un modo
  claro real.
- Se evaluaron dos opciones de color para la línea (una sola serie, sin
  leyenda — el título de la sección ya dice qué se grafica):
  - El azul por defecto de la skill (`#3987e5` en modo oscuro): pasa las
    seis validaciones sin salvedades, corrido con
    `validate_palette.js "#3987e5" --mode dark --surface "#131110"`.
  - El `--accent` naranja ya existente en toda la app (`#ff7a1a`,
    `src/index.css:10`): **falla** el check de banda de luminosidad para
    modo oscuro (mide 0.724 sobre una banda de ~0.48–0.67), pero **pasa**
    contraste contra superficie y piso de croma — confirmado corriendo
    `validate_palette.js "#ff7a1a,#3987e5" --mode dark --surface
    "#131110"`.
  - **Decisión: usar el naranja existente.** Prioriza consistencia visual
    con el resto de la app (botones, acentos) por sobre una validación
    perfecta que de todos modos está pensada para sets de varios colores a
    la vez, no una sola línea. Queda documentado acá como una desviación
    consciente del default de la skill, no un error.

## Especificación visual del gráfico

- **Forma:** línea (`LineChart` de Recharts) — "trend over time" con una
  sola serie, la forma por defecto según la skill.
- **Marca:** línea de 2px, join/cap redondeado. Punto final (y cada punto,
  dado que son pocos) con marcador ≥8px (r≥4), relleno `--accent`, con un
  anillo de 2px en el color de superficie (`--bg`, `#131110`) para que se
  lea aunque cruce la línea.
- **Sin leyenda:** una sola serie — el título de la subsección
  ("Progresión: {nombre del ejercicio}") ya dice qué se muestra.
- **Etiqueta directa:** solo el último punto lleva su valor en kg al lado
  (ej. "62 kg") — nunca un número en cada punto.
- **Ejes:**
  - Y: peso en kg, ticks redondeados a números limpios, en `--text-muted`.
  - X: fecha de cada sesión (no solo el día — usa `recorded_at`, para que
    dos sesiones el mismo día no colapsen en un solo tick), con los ticks
    reducidos para no chocar en una pantalla angosta (mobile-first).
  - Gridlines: solo horizontales, hairline de 1px sólida (nunca punteada),
    en `--border` (`#35302a`, ya definido en `index.css`) — recesivas.
- **Interacción:** crosshair vertical que se ajusta al punto más cercano +
  tooltip con fecha y peso (el peso en negrita/destacado, la fecha
  secundaria) — mismo comportamiento en hover y en foco de teclado.
- **Vista de tabla:** además del gráfico, un toggle o sección colapsable
  con la misma serie en forma de lista/tabla (fecha + peso) — para que el
  dato exista sin depender del gráfico ni del tooltip. **Asunción a
  confirmar:** se propone como un simple `<details>`/acordeón "Ver como
  lista" debajo del gráfico, no una tabla con estilos propios.
- **Contenedor:** la altura del contenedor incluye la banda del eje X
  (nunca un chart que recorta las etiquetas de fecha con scroll interno).

## Casos de datos dispersos

| Cantidad de puntos | Qué se muestra |
|---|---|
| 0 | Mensaje vacío, sin gráfico — mismo criterio que el estado vacío de la Etapa 10 |
| 1 | Un solo punto (Recharts no dibuja línea con 1 dato) + texto breve debajo ("Registrá otra sesión para ver una tendencia"). **Asunción a confirmar.** |
| 2+ | Línea completa con el spec de arriba |

## Selector de ejercicio

- **Top 5 (Etapa 10):** cada ítem de la lista ya existente es tappable —
  al tocar uno, la subsección de progresión aparece/se actualiza con ese
  ejercicio.
- **Barra de búsqueda:** input de texto arriba de la subsección de
  progresión, filtra en vivo sobre el listado de nombres de ejercicio
  distintos que el usuario alguna vez registró (no limitado al Top 5).
  Tocar un resultado hace lo mismo que tocar un ítem del Top 5.
- **De dónde sale la lista de nombres:** no hay (ni se agrega) un query
  `DISTINCT` en Supabase para esto — se deriva en el cliente de un fetch
  único de **todas** las `training_sessions` del usuario (ver Sync abajo),
  aplanando `exercises[].exerciseName` y sacando duplicados. Razonable
  para el volumen esperado (app de uso personal, mismo criterio ya usado
  en otras ADRs del proyecto).

## Sync

Nueva función en `cloudSync.js`, sin filtro de rango (a diferencia de
`pullSessionsInRange` de la Etapa 10 — acá se necesita el historial
completo, no un período):

```js
export async function pullAllSessions(userId) {
  return supabase.from('training_sessions')
    .select('date, recorded_at, exercises')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: true })
}
```

Se llama una sola vez al abrir la pantalla de estadísticas (o al abrir por
primera vez la subsección de progresión), y de ahí se derivan tanto la
lista de nombres para la búsqueda como la serie del ejercicio elegido —
sin un segundo query por cada selección.

## Checklist de implementación

- [ ] `npm install recharts`.
- [ ] `pullAllSessions` en `src/utils/cloudSync.js`.
- [ ] Utilidad pura: de `training_sessions[]` → `{ exerciseNames: string[],
      seriesByExercise: Map<name, {recordedAt, weightKg}[]> }`, filtrando
      `weightKg == null`.
- [ ] Componente `ExerciseProgressChart.jsx` (Recharts `LineChart`, spec
      visual de arriba, usando `--accent`/`--bg`/`--border`/`--text-muted`
      ya definidos en `index.css`).
- [ ] Barra de búsqueda de ejercicios dentro de `StatsView.jsx`.
- [ ] Wiring: tap en Top 5 o en un resultado de búsqueda → setea el
      ejercicio seleccionado → renderiza `ExerciseProgressChart`.
- [ ] Estados de 0/1/2+ puntos.
- [ ] Vista de tabla/lista alternativa (accordeón).
- [ ] Confirmar visualmente en el browser (contenedor no recorta el eje
      X, tooltip funciona con teclado, crosshair se ajusta al punto más
      cercano).
