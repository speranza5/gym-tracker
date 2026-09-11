# Etapa 14 — Pantalla intermedia de login

> Análisis funcional previo a implementar. Se inserta entre la
> [Etapa 12](./etapa-12-analisis.md) (landing + login obligatorio, ya en
> producción) y la Etapa 15 (welcome tour) — por eso las etapas 14-16
> originales se renumeraron a 15-17, ver [`roadmap.md`](./roadmap.md).
> Ver también: [`decisions.md`](./decisions.md)

## Objetivo

Que el salto de la landing pública a Google (un dominio externo, fuera
del control visual de la app) se sienta como un paso deliberado, no un
click que saca a alguien de Gym Tracker sin aviso. Hoy "Empezar ahora"
dispara `signInWithOAuth` directo — cero pantallas propias en el medio.

## Decisiones ya tomadas

| Pregunta | Decisión |
|---|---|
| ¿Redirect automático o pantalla propia? | Pantalla propia de Gym Tracker con su propio botón "Continuar con Google" — un click más, pero es el patrón estándar de "login checkpoint antes del proveedor externo". El CTA de la landing deja de disparar `signInWithGoogle` directo y en cambio navega (client-side, sin salir del sitio) a esta pantalla nueva |
| Contenido de la pantalla | Con contexto extra, no solo marca + botón: reusa **textualmente** la misma frase ya escrita en la FAQ de la landing sobre por qué se pide la cuenta de Google, en vez de redactar una nueva (evita el mismo riesgo de desincronización que ya se documentó en la Etapa 12 para la copy de "desconectar") |
| ¿Hay forma de volver? | Sí — flecha/botón de volver arriba a la izquierda, mismo patrón visual que ya usan `StatsView.jsx`/`OpenTracker.jsx` (`ChevronLeft`, borde, `border-radius: var(--radius-sm)`), aunque como clase propia del componente nuevo (mismo criterio que `open-tracker__back` ya duplica el patrón bajo su propio nombre en vez de compartir una clase entre pantallas) |
| Texto del botón en esta pantalla | "Continuar con Google" (sí menciona "Google" acá, a diferencia del CTA de la landing) — en la landing se evita nombrar el mecanismo a propósito (Etapa 12), pero acá la pantalla entera *es* ese paso, así que nombrarlo explícitamente es más un ancla de confianza ("esto va a Google, como esperás") que una sobre-explicación |
| ¿Dónde vive el estado de esta pantalla en `App.jsx`? | Se reusa el `screen` que ya existe (hoy solo se usaba post-login: `'open-tracker'`/`'stats'`/`'connect-mcp'`) agregando el valor `'login'`, en vez de sumar un `useState` nuevo — es seguro porque el redirect de OAuth (`redirectTo: window.location.origin`) provoca una recarga completa del navegador al volver, así que `screen` arranca limpio en `'routine'` de nuevo sin que quede ningún estado colgado |
| ¿Se toca `useAuth.js`/`signInWithGoogle`? | No — sigue siendo exactamente la misma función, solo que ahora la llama el botón de esta pantalla nueva en vez del CTA de la landing directamente |
| ¿El botón de Google muestra estado de carga? | Sí — se deshabilita y cambia a "Redirigiendo…" apenas se toca, hasta que el navegador efectivamente navega a Google. Evita doble click y confirma que algo está pasando en el instante entre el click y el redirect real |
| ¿Sobrevive esta pantalla a un refresh del navegador? | No, y está bien así — mismo comportamiento que ya tienen todas las pantallas internas hoy (`StatsView`, `OpenTracker`, el propio `screen` de `App.jsx` en general): nada sobrevive a un refresh porque no hay router. No se agrega persistencia solo para esta pantalla |
| ¿La marca "Gym Tracker" (ícono + nombre) también funciona como volver? | No — un solo mecanismo de volver (la flecha), sin ambigüedad. Mismo criterio que `StatsView`/`OpenTracker`, donde la marca del header tampoco es clickeable |
| Título de la pantalla | Se mantiene "Iniciá sesión para continuar" — directo y funcional |
| ¿Alguna animación de transición Landing↔Login? | No — instantáneo, mismo criterio que el resto de los cambios de pantalla en la app hoy (ninguno tiene animación). La app en general no tiene animaciones/microinteracciones todavía; eso queda anotado como visión a futuro en el roadmap (Etapa 17), no como parte de esta etapa puntual |

## Fuera de alcance (pospuesto)

- **Otros métodos de login** (email/password, otros proveedores OAuth)
  — sigue siendo únicamente Google, esto es solo sobre *cómo* se llega
  al mismo único método que ya existe.
- **Recordar la preferencia** de haber visto esta pantalla para saltarla
  en visitas futuras — no aplica: sin sesión, no hay dónde guardar esa
  preferencia de forma confiable (ni local ni en la nube, por diseño:
  sin `userId` no hay fila de Supabase, y confiar en `localStorage` para
  esto es frágil y de bajo valor para una pantalla de un solo click).
- **Estados de error del login** (ej. el usuario cancela el OAuth de
  Google y vuelve) — hoy `signInWithGoogle` no maneja ese caso en
  ningún lado del código existente tampoco; fuera del alcance de esta
  etapa puntual, no una regresión que introduzca.

## Componente nuevo: `Login.jsx`

```
src/components/Login.jsx
```

- Recibe `onSignIn` (`useAuth().signInWithGoogle`, sin cambios) y
  `onBack`.
- Reusa `.landing__cta` y `.landing__fine-print` de `App.css`
  (`Landing.jsx`) tal cual — mismo botón grande relleno con `--accent`,
  misma letra chica "Con tu cuenta de Google · Gratis". Se agrega
  `display: flex; align-items: center; justify-content: center; gap:
  8px;` a `.landing__cta` (cambio seguro y hacia atrás compatible: un
  botón de una sola línea de texto se ve idéntico con `flex` centrado)
  para poder sumarle el ícono `LogIn` de `lucide-react` sin duplicar la
  clase.
- Estructura, de arriba a abajo: botón de volver (`.login-screen__back`,
  `ChevronLeft`) → marca (`Dumbbell` + "Gym Tracker", misma clase
  `.landing__brand` que ya existe) → título ("Iniciá sesión para
  continuar") → párrafo de contexto (la frase reusada de la FAQ, ver
  tabla arriba) → `.landing__cta` con ícono `LogIn` + "Continuar con
  Google" → `.landing__fine-print`.
- **Estado de carga del botón:** `useState` local (`redirecting`). Al
  click: `setRedirecting(true)` y llamar `onSignIn()`; el botón queda
  `disabled`, cambia el texto a "Redirigiendo…" y oculta el ícono
  `LogIn` (o lo reemplaza por un ícono girando, mismo patrón `is-spinning`
  ya usado en `FileUpload.jsx` para el botón de refresh de la Etapa 13).
  No hace falta revertir el estado en ningún lado — el navegador navega
  fuera de la página antes de que importe.
- Layout centrado tipo `.upload-screen`/`.app-loading` (pantalla de un
  solo bloque, no secciones apiladas como `Landing.jsx`) — clase nueva
  `.login-screen`.

## Wiring en `App.jsx` y `Landing.jsx`

```jsx
// App.jsx
import { Login } from './components/Login'

if (!user) {
  if (screen === 'login') {
    return <Login onSignIn={signInWithGoogle} onBack={() => setScreen('routine')} />
  }
  return <Landing onContinue={() => setScreen('login')} />
}
```

`Landing.jsx`: la prop `onSignIn` pasa a llamarse `onContinue` (ya no
dispara el sign-in directo, navega a la pantalla nueva) — se renombra
en las dos llamadas a `LandingCta` (hero y cierre) y en la firma del
componente. El texto de los botones ("Empezar ahora") no cambia — sigue
siendo la copy correcta para "empezar", que ahora pasa por un paso más
antes de Google.

## Checklist de implementación

- [x] `Login.jsx` + CSS (`.login-screen`, `.login-screen__back`) y el
      `display: flex` agregado a `.landing__cta` en `App.css`.
- [x] `Landing.jsx` — renombrar `onSignIn` → `onContinue` en la firma y
      en los dos usos de `LandingCta`.
- [x] `App.jsx` — importar `Login`, chequeo de `screen === 'login'`
      antes del `if (!user) return <Landing />`, pasar `onContinue`
      nuevo a `Landing`.
- [x] Confirmar visualmente en el browser: verificado con una página de
      preview temporal (`?preview`, montando `Login` directo con
      callbacks no-op), borrada después de usarla — se ve bien en mobile
      y desktop, back button, título, párrafo de contexto, botón con
      ícono `LogIn` y letra chica todos en su lugar. También confirmado
      que la landing real sigue renderizando sin errores de consola tras
      el rename de `onSignIn`→`onContinue`. **No verificado con un click
      real de punta a punta** (Landing → Login → "Continuar con Google" →
      Google real → vuelta): el wiring es el mismo patrón de navegación
      por `screen` ya usado en el resto de `App.jsx`, revisado por
      lectura, pero vale un click real la primera vez.
