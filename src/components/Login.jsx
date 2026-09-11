import { useState } from 'react'
import { ChevronLeft, Dumbbell, LogIn } from 'lucide-react'

/**
 * Checkpoint propio antes de saltar a Google (Etapa 14) — el CTA de
 * Landing ya no dispara signInWithGoogle directo, navega acá primero.
 * Spec completo en docs/etapa-14-analisis.md.
 */
export function Login({ onSignIn, onBack }) {
  const [redirecting, setRedirecting] = useState(false)

  const handleSignIn = () => {
    setRedirecting(true)
    onSignIn()
  }

  return (
    <div className="login-screen">
      <button type="button" className="login-screen__back" onClick={onBack} aria-label="Volver">
        <ChevronLeft size={20} />
      </button>

      <div className="landing__brand">
        <Dumbbell size={22} />
        <span>Gym Tracker</span>
      </div>

      <h1 className="login-screen__title">Iniciá sesión para continuar</h1>
      <p className="login-screen__body">
        Para identificarte y sincronizar tu rutina, progreso e historial entre tus dispositivos.
      </p>

      <button type="button" className="landing__cta" onClick={handleSignIn} disabled={redirecting}>
        {redirecting ? (
          <span>Redirigiendo…</span>
        ) : (
          <>
            <LogIn size={18} />
            <span>Continuar con Google</span>
          </>
        )}
      </button>
      <p className="landing__fine-print">Con tu cuenta de Google · Gratis</p>
    </div>
  )
}
