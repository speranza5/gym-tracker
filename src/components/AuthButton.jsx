import { LogIn, LogOut } from 'lucide-react'

export function AuthButton({ user, loading, onSignIn, onSignOut }) {
  if (loading) return null

  if (!user) {
    return (
      <button type="button" className="auth-button auth-button--signin" onClick={onSignIn}>
        <LogIn size={16} />
        <span>Continuar con Google</span>
      </button>
    )
  }

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
