import { useEffect } from 'react'

/** Confirmación breve y sin librería nueva — se autoescode a los pocos segundos. */
export function Toast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onDismiss, 2500)
    return () => clearTimeout(timer)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div className="toast" role="status">
      {message}
    </div>
  )
}
