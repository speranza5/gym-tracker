import { useEffect, useRef, useState } from 'react'

/** Duración real del token: onDismiss espera justo la salida, sin duplicar el valor. */
function motionBaseMs() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--motion-base')
  const ms = Number.parseFloat(raw)
  return Number.isFinite(ms) ? ms : 200
}

/** Confirmación breve: entra y sale con transición, sin librería nueva. */
export function Toast({ message, onDismiss }) {
  const [visible, setVisible] = useState(false)
  const hideTimer = useRef(null)
  const dismissTimer = useRef(null)

  useEffect(() => {
    if (!message) return
    setVisible(true)
    clearTimeout(hideTimer.current)
    clearTimeout(dismissTimer.current)
    hideTimer.current = setTimeout(() => {
      setVisible(false)
      dismissTimer.current = setTimeout(onDismiss, motionBaseMs())
    }, 2500)
    return () => {
      clearTimeout(hideTimer.current)
      clearTimeout(dismissTimer.current)
    }
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div className={visible ? 'toast toast--visible' : 'toast'} role="status">
      {message}
    </div>
  )
}
