/**
 * LandingPage — Full-viewport landing with ShapeWaves animated background.
 * Appears before login/signup. Authenticated users are redirected to /dashboard.
 */
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect } from 'react'
import ShapeWaves from '../components/ShapeWaves'
import './LandingPage.css'

const FEATURES = [
  { label: 'Kanban Board', color: 'indigo' },
  { label: 'GitHub Webhooks', color: 'emerald' },
  { label: 'Analytics Dashboard', color: 'amber' },
  { label: 'PDF Reports', color: 'rose' },
  { label: 'Team Workspaces', color: 'cyan' },
]

function LandingPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  /* If already authenticated, skip landing and go to dashboard */
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, loading, navigate])

  /* Allow keyboard enter/space to continue as well */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        navigate('/login')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  /* Don't flash the landing page while checking auth */
  if (loading) return null

  return (
    <div
      className="landing-page"
      onClick={() => navigate('/login')}
      role="button"
      tabIndex={0}
      aria-label="Click anywhere to continue to IssueTrack"
    >
      {/* Animated ShapeWaves WebGPU Background */}
      <div className="landing-bg">
        <ShapeWaves
          text="IssueTrack"
          logo={true}
          prompt="CLICK TO CONTINUE"
          fontFamily='Inter, "Geist Sans", system-ui, sans-serif'
          fontWeight={700}
          textSize={0.55}
          shapes="mixed"
          cellSize={10}
          dotSize={0.75}
          color="#929292"
          hoverColor="#ffffff"
          backgroundColor="#000000"
          speed={1}
          scale={1}
          contrast={1}
          brightness={0.45}
          flow={0}
          direction={0}
          fade={0.25}
          interactive={true}
          splashRadius={40}
          splashStrength={0.4}
          glow={0.35}
          intro={true}
          introDuration={1.6}
          paused={false}
          onError={(err) => console.warn('ShapeWaves WebGPU error:', err.message)}
        />
      </div>

      {/* Subtle vignette for contrast */}
      <div className="landing-vignette" />
    </div>
  )
}

export default LandingPage

