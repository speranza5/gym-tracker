import { useEffect, useState } from 'react'
import { Dumbbell, Menu } from 'lucide-react'
import { Landing } from './components/Landing'
import { FileUpload } from './components/FileUpload'
import { ConnectMcp } from './components/openTracker/ConnectMcp'
import { DayTabs } from './components/DayTabs'
import { ProgressBar } from './components/ProgressBar'
import { ExerciseList } from './components/ExerciseList'
import { ViewToggle } from './components/ViewToggle'
import { FocusView } from './components/FocusView'
import { SideMenu } from './components/SideMenu'
import { OpenTracker } from './components/OpenTracker'
import { StatsView } from './components/StatsView'
import { RecordSessionModal } from './components/RecordSessionModal'
import { Toast } from './components/Toast'
import { useWorkoutData } from './hooks/useWorkoutData'
import { useProgress } from './hooks/useProgress'
import { useAuth } from './hooks/useAuth'
import { loadViewMode, saveViewMode } from './utils/storage'
import './App.css'

function App() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth()
  const { workoutData, uploadFile, error, loading, resetWorkoutData, refreshFromCloud } = useWorkoutData(user?.id)
  const { toggleExercise, resetDay, getDayChecked, getDayPercent, getBenchmark, recordSession } =
    useProgress(workoutData, user?.id)
  const showWeight = Boolean(user)

  const [activeDayId, setActiveDayId] = useState(null)
  const [viewMode, setViewMode] = useState(() => loadViewMode())
  const [menuOpen, setMenuOpen] = useState(false)
  const [screen, setScreen] = useState('routine')
  const [recordModalOpen, setRecordModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  useEffect(() => {
    saveViewMode(viewMode)
  }, [viewMode])

  // Selecciona el primer día por defecto y se acomoda si el día activo
  // deja de existir (ej: se sube un Excel nuevo con menos hojas).
  useEffect(() => {
    if (!workoutData?.days?.length) return
    const stillExists = workoutData.days.some((d) => d.id === activeDayId)
    if (!activeDayId || !stillExists) {
      setActiveDayId(workoutData.days[0].id)
    }
  }, [workoutData, activeDayId])

  if (authLoading) {
    return <div className="app-loading">Cargando…</div>
  }

  if (!user) {
    return <Landing onSignIn={signInWithGoogle} />
  }

  // Chequeo antes del `!workoutData` a propósito (Etapa 13): ConnectMcp
  // no depende de tener una rutina — es el camino para pedirle a una IA
  // que arme la primera, así que tiene que ser alcanzable sin una.
  if (screen === 'connect-mcp') {
    return <ConnectMcp onBack={() => setScreen('routine')} />
  }

  // a partir de acá, `user` siempre existe — FileUpload y el resto del
  // árbol ya no necesitan authLoading/onSignIn
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

  if (screen === 'open-tracker') {
    return <OpenTracker user={user} onBack={() => setScreen('routine')} />
  }

  if (screen === 'stats') {
    return <StatsView user={user} onBack={() => setScreen('routine')} />
  }

  const activeDay = workoutData.days.find((d) => d.id === activeDayId) || workoutData.days[0]
  const checkedSet = getDayChecked(activeDay.id)
  const percent = getDayPercent(activeDay)

  const handleChangeFile = () => {
    if (window.confirm('¿Cambiar de archivo? Se va a perder el progreso del día actual.')) {
      resetWorkoutData()
    }
  }

  const handleRecordSession = (notes) => {
    recordSession(activeDay, notes)
    setToastMessage('Sesión registrada')
  }

  return (
    <>
      <div className="app">
        <header className="app__header">
          <div className="app__title">
            <Dumbbell size={20} />
            <span>Mi Rutina</span>
          </div>
          <button
            type="button"
            className="app__menu-button"
            onClick={() => setMenuOpen(true)}
            title="Menú"
          >
            <Menu size={20} />
          </button>
        </header>

        <ViewToggle mode={viewMode} onChange={setViewMode} />

        {viewMode === 'list' ? (
          <>
            <DayTabs days={workoutData.days} activeDayId={activeDay.id} onSelect={setActiveDayId} />

            <ProgressBar
              percent={percent}
              onReset={() => resetDay(activeDay.id)}
              onRecordSession={() => setRecordModalOpen(true)}
              canRecord={showWeight}
            />

            <main className="app__content">
              <ExerciseList
                day={activeDay}
                checkedSet={checkedSet}
                onToggle={(exerciseId, exerciseName, weightKg) =>
                  toggleExercise(activeDay.id, exerciseId, exerciseName, weightKg)
                }
                getBenchmark={getBenchmark}
                showWeight={showWeight}
              />
            </main>
          </>
        ) : (
          <main className="app__content">
            <FocusView
              key={activeDay.id}
              day={activeDay}
              checkedSet={checkedSet}
              onToggle={(exerciseId, exerciseName, weightKg) =>
                toggleExercise(activeDay.id, exerciseId, exerciseName, weightKg)
              }
              onExitToList={() => setViewMode('list')}
              getBenchmark={getBenchmark}
              showWeight={showWeight}
              onRecordSession={() => setRecordModalOpen(true)}
              canRecord={showWeight}
            />
          </main>
        )}
      </div>

      <SideMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        user={user}
        onSignOut={signOut}
        onChangeFile={handleChangeFile}
        onOpenTracker={() => setScreen('open-tracker')}
        onStats={() => setScreen('stats')}
      />

      <RecordSessionModal
        open={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        onSubmit={handleRecordSession}
      />

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </>
  )
}

export default App
