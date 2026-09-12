import { useEffect, useRef, useState } from 'react'
import { Joyride, ACTIONS, EVENTS, STATUS } from 'react-joyride'
import { markWelcomeTourSeen } from '../utils/profile'

const STEPS = [
  {
    target: '#upload-option-excel',
    content: 'Tocando acá podés subir el Excel con tu rutina tal como está, sin cambiarle el formato.',
    skipBeacon: true,
  },
  {
    target: '#upload-option-template',
    content: 'Tocando acá podés descargar una plantilla con el formato correcto y un ejemplo ya completado.',
  },
  {
    target: '#upload-option-ai',
    content: 'Tocando acá podés conectar tu IA favorita para que arme tu primera rutina por vos.',
  },
]

/**
 * Recorrido guiado del empty state (3 tarjetas de FileUpload). Se marca
 * como visto al arrancar, no al completar: si se interrumpe no se vuelve
 * a mostrar. `shouldMark` distingue el camino de primera vez del link
 * "Ver tutorial de nuevo" (ese re-muestra sin escribir en Supabase).
 */
export function WelcomeTour({ userId, run, shouldMark }) {
  const markedRef = useRef(false)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    if (run && shouldMark && userId && !markedRef.current) {
      markedRef.current = true
      markWelcomeTourSeen(userId)
    }
  }, [run, shouldMark, userId])

  if (!run || finished) return null

  const handleCallback = ({ action, status, type }) => {
    if (
      (type === EVENTS.STEP_AFTER && (action === ACTIONS.CLOSE || action === ACTIONS.SKIP)) ||
      status === STATUS.FINISHED ||
      status === STATUS.SKIPPED
    ) {
      setFinished(true)
    }
  }

  return (
    <Joyride
      steps={STEPS}
      run
      continuous
      showSkipButton
      showProgress={false}
      disableScrolling={false}
      callback={handleCallback}
      locale={{
        back: 'Atrás',
        close: 'Cerrar',
        last: 'Entendido',
        next: 'Siguiente',
        skip: 'Saltar',
      }}
      styles={{
        options: {
          primaryColor: 'var(--accent)',
          textColor: 'var(--text)',
          backgroundColor: 'var(--bg-card)',
          overlayColor: 'rgba(19, 17, 16, 0.8)',
          arrowColor: 'var(--bg-card)',
          zIndex: 1000,
        },
        tooltip: {
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text)',
        },
        buttonNext: {
          backgroundColor: 'var(--accent)',
          color: 'var(--accent-contrast)',
        },
        buttonBack: {
          color: 'var(--text-muted)',
        },
        buttonSkip: {
          color: 'var(--text-muted)',
        },
        // Sin fade del tooltip (decisión Etapa 15). El recorte del
        // spotlight conserva un opacity 0.2s hardcodeado interno de
        // Joyride, no desactivable por prop — excepción aceptada.
        floater: {
          transition: 'none',
        },
      }}
    />
  )
}
