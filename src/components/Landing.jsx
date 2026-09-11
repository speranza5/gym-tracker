import { useState } from 'react'
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  FileSpreadsheet,
  LineChart,
  ListChecks,
  MessageCircle,
  Share2,
} from 'lucide-react'

const LOOP_STEPS = [
  { icon: FileSpreadsheet, label: 'Armás tu rutina' },
  { icon: Dumbbell, label: 'Entrenás' },
  { icon: ListChecks, label: 'Gym Tracker registra' },
  { icon: Bot, label: 'Tu IA entiende' },
  { icon: LineChart, label: 'Ajustás y mejorás' },
]

const TRACKING_POINTS = [
  { icon: ListChecks, title: 'Checklist diaria.', body: 'Marcá cada ejercicio a medida que entrenás, sin fricción.' },
  {
    icon: CalendarCheck,
    title: 'Consistencia real.',
    body: 'Cuántos días entrenaste por semana, mes o año — sin llevar la cuenta vos.',
  },
  { icon: LineChart, title: 'Progresión con gráfico.', body: 'Cómo subís de peso en cada ejercicio, sesión a sesión.' },
]

const AI_POINTS = [
  {
    icon: Bot,
    title: 'Armala charlando.',
    body: 'Pedile que arme tu rutina desde cero o la ajuste cuando cambies de objetivo.',
  },
  { icon: MessageCircle, title: 'Preguntale qué toca hoy.', body: 'Tu asistente lee tu rutina real — no inventa nada.' },
]

const MENTAL_MODEL_NODES = [
  { label: 'Vos', body: 'Entrenás y decidís.' },
  { label: 'Gym Tracker', body: 'Donde vive tu entrenamiento — rutina, progreso, historial.' },
  { label: 'Tu IA', body: 'Lo entiende y te ayuda a manejarlo, conectada a través de Open Tracker.' },
]

const FAQ_ITEMS = [
  { question: '¿Es gratis?', answer: 'Sí. Gym Tracker no tiene planes pagos ni versión premium.' },
  {
    question: '¿Para qué necesito iniciar sesión con Google?',
    answer: 'Para identificarte y sincronizar tu rutina, progreso e historial entre tus dispositivos.',
  },
  {
    question: '¿Qué puede hacer exactamente mi asistente de IA con mi cuenta?',
    answer:
      'Tu asistente se conecta con tu propia API Key, que hoy le da acceso de lectura y escritura de tu rutina — no a tu progreso, pesos ni historial, eso no es accesible por esta vía todavía. Esa key no expira ni se puede regenerar por ahora, así que compartila solo con asistentes en los que confíes.',
  },
]

function LandingCta({ onClick }) {
  return (
    <button type="button" className="landing__cta" onClick={onClick}>
      Empezar ahora
    </button>
  )
}

function Loop() {
  return (
    <div className="landing__loop">
      {LOOP_STEPS.map((step, i) => (
        <div className="landing__loop-step" key={step.label}>
          <div className="landing__loop-item">
            <step.icon size={20} />
            <span>{step.label}</span>
          </div>
          {i < LOOP_STEPS.length - 1 && <ArrowRight size={16} className="landing__loop-arrow" />}
        </div>
      ))}
    </div>
  )
}

function PillarPoints({ points }) {
  return (
    <ul className="landing__points">
      {points.map((point) => (
        <li className="landing__point" key={point.title}>
          <point.icon size={20} className="landing__point-icon" />
          <div>
            <strong>{point.title}</strong>
            <p>{point.body}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function MentalModel() {
  return (
    <div className="landing__mental-model">
      {MENTAL_MODEL_NODES.map((node, i) => (
        <div className="landing__mental-model-step" key={node.label}>
          <div className="landing__mental-model-node">
            <strong>{node.label}</strong>
            <p>{node.body}</p>
          </div>
          {i < MENTAL_MODEL_NODES.length - 1 && <ArrowRight size={16} className="landing__loop-arrow" />}
        </div>
      ))}
    </div>
  )
}

function Faq() {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <ul className="landing__faq-list">
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <li className="landing__faq-item" key={item.question}>
            <button
              type="button"
              className="landing__faq-question"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? null : i)}
            >
              <span>{item.question}</span>
              {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {isOpen && <p className="landing__faq-answer">{item.answer}</p>}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Landing pública, mostrada a quien no tiene sesión (Etapa 12). Spec
 * completo en docs/etapa-12-analisis.md — copy, orden de secciones y
 * decisiones de precisión (qué le promete a la IA, permisos reales de
 * la API Key) documentados ahí, no repetidos acá como comentarios.
 */
export function Landing({ onContinue }) {
  return (
    <div className="landing">
      <section className="landing__hero">
        <div className="landing__brand">
          <Dumbbell size={22} />
          <span>Gym Tracker</span>
        </div>
        <h1 className="landing__title">Tu entrenamiento, conectado con tu IA.</h1>
        <p className="landing__subtitle">
          Registrá cada entrenamiento en Gym Tracker y dejá que tu asistente de IA lo entienda — te ayuda a armar tu
          rutina, seguirla y ajustarla cuando lo necesites.
        </p>
        <Loop />
        <LandingCta onClick={onContinue} />
        <p className="landing__fine-print">Con tu cuenta de Google · Gratis</p>
      </section>

      <section className="landing__pillar">
        <h2 className="landing__pillar-title">No entrenés de memoria. Entrená con datos.</h2>
        <p className="landing__pillar-lead">
          Cada entrenamiento que registrás se convierte en consistencia, cargas y progreso reales — no en memoria que
          se pierde.
        </p>
        <PillarPoints points={TRACKING_POINTS} />
      </section>

      <section className="landing__pillar">
        <h2 className="landing__pillar-title">Usá tu IA favorita para manejar tu rutina.</h2>
        <p className="landing__pillar-lead">
          Pedile a Claude, ChatGPT o el asistente que uses que arme tu rutina, la lea o la ajuste — vos entrenás, tu
          IA se encarga de la parte administrativa.
        </p>
        <p className="landing__pillar-lead landing__pillar-lead--secondary">
          Por atrás, se conecta a través de Open Tracker — te contamos cómo más abajo.
        </p>
        <PillarPoints points={AI_POINTS} />
        <p className="landing__note">¿Ya tenés tu rutina armada en un Excel? También podés subirla tal cual está.</p>
      </section>

      <section className="landing__open-tracker">
        <MentalModel />
        <div className="landing__open-tracker-header">
          <Share2 size={20} />
          <h2 className="landing__pillar-title">Open Tracker: así se conecta tu IA con tu entrenamiento.</h2>
        </div>
        <p className="landing__pillar-lead">
          Gym Tracker es donde vive tu entrenamiento. Open Tracker es la API abierta que le da acceso a tu IA — el
          mismo motor que usa esta app. Hoy Claude y ChatGPT; mañana, lo que uses.
        </p>
      </section>

      <section className="landing__faq">
        <h2 className="landing__pillar-title">Preguntas frecuentes</h2>
        <Faq />
      </section>

      <section className="landing__closing-cta">
        <h2 className="landing__pillar-title">Tu entrenamiento, conectado con tu IA.</h2>
        <LandingCta onClick={onContinue} />
        <p className="landing__fine-print">Con tu cuenta de Google · Gratis</p>
      </section>
    </div>
  )
}
