import { LogOut } from 'lucide-react'

/**
 * Siempre renderiza la rama "con sesión" — desde la Etapa 12, login es
 * obligatorio (gate en App.jsx), así que `user` nunca es null acá.
 */
export function AuthButton({ user, onSignOut }) {
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email
  const avatarUrl = user.user_metadata?.avatar_url

  return (
    <div className="auth-button auth-button--signed-in">
      {avatarUrl ? (
        <img className="auth-button__avatar" src={avatarUrl} alt="" referrerPolicy="no-referrer" />
      ) : null}
      <span className="auth-button__name">{name}</span>
      <button type="button" className="auth-button__signout" onClick={onSignOut} title="Cerrar sesión">
        <LogOut size={16} />
      </button>
    </div>
  )
}
