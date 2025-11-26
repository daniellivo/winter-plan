import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { createContext, useContext, useEffect, useRef } from 'react'
import WinterPlanIntro from './pages/WinterPlanIntro'
import WinterPlanCalendar from './pages/WinterPlanCalendar'
import WinterPlanInfo from './pages/WinterPlanInfo'
import ShiftDetails from './pages/ShiftDetails'
import CancellationPolicy from './pages/CancellationPolicy'

// Webhook URL for tracking sessions
// ⚠️ IMPORTANTE: Cambiar a 'webhook' cuando el workflow esté activo en n8n
// Para testing: usar 'webhook-test' y tener el panel de test abierto en n8n
const WEBHOOK_URL = 'https://livomarketing.app.n8n.cloud/webhook-test/104d7026-2f4f-4f50-b427-1f129f060fa6'

// Context to share URL params across all pages
interface AppContextType {
  professionalId: string
  token: string | null
}

const AppContext = createContext<AppContextType>({
  professionalId: '',
  token: null
})

export const useAppContext = () => useContext(AppContext)

// Append professionalId to the webhook URL query string
function buildWebhookUrl(professionalId: string) {
  const url = new URL(WEBHOOK_URL)
  url.searchParams.set('professionalId', professionalId)
  return url.toString()
}

// Send session start to webhook - executes immediately
function notifySessionStart(professionalId: string) {
  const webhookUrl = buildWebhookUrl(professionalId)
  console.log('🚀 Sending webhook for professionalId via URL:', webhookUrl)
  
  const payload = {
    event: 'session_start',
    professionalId,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  }

  // Method 1: Try sendBeacon (fire-and-forget, works well in WebViews)
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
    const beaconSent = navigator.sendBeacon(webhookUrl, blob)
    
    if (beaconSent) {
      console.log('✅ Webhook sent via sendBeacon')
      return
    }
  }

  // Method 2: Fallback to fetch with keepalive to avoid unload cancellations
  console.log('⚠️ sendBeacon not available or failed, trying fetch fallback...')
  fetch(webhookUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify(payload),
    keepalive: true
  })
    .then(() => console.log('✅ Webhook sent via fetch'))
    .catch((error) => console.error('❌ Failed to notify webhook:', error))
}

const professionalIdKey = 'winter_plan_professional_id'
const tokenKey = 'winter_plan_token'

function App() {
  const [searchParams] = useSearchParams()
  const hasNotifiedRef = useRef(false)
  
  // Read params from URL or sessionStorage (fallback)
  let professionalId = searchParams.get('professionalId') || ''
  let token = searchParams.get('token')
  const entry = searchParams.get('entry')

  // If we have params in URL, save them to sessionStorage
  if (professionalId) {
    sessionStorage.setItem(professionalIdKey, professionalId)
    if (token) sessionStorage.setItem(tokenKey, token)
  } else {
    // Try to recover from sessionStorage
    professionalId = sessionStorage.getItem(professionalIdKey) || ''
    token = sessionStorage.getItem(tokenKey)
  }

  // Notify webhook once per page load (even if React Strict double-renders)
  useEffect(() => {
    if (!professionalId || hasNotifiedRef.current) return
    hasNotifiedRef.current = true
    notifySessionStart(professionalId)
  }, [professionalId])

  // Build query string to preserve in navigation
  const queryString = professionalId ? `?professionalId=${professionalId}${token ? `&token=${token}` : ''}` : ''

  // Determine initial route based on entry param
  const getInitialRoute = () => {
    if (entry === 'calendar') return `/winter-plan/calendar${queryString}`
    return `/winter-plan${queryString}`
  }

  // If no professionalId, show error
  if (!professionalId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            Acceso no válido
          </h1>
          <p className="text-sm text-gray-600">
            Esta página requiere un enlace válido con tu identificador de profesional.
          </p>
          <p className="text-xs text-gray-400 mt-4">
            URL esperada: ?professionalId=XXXXX
          </p>
        </div>
      </div>
    )
  }

  return (
    <AppContext.Provider value={{ professionalId, token }}>
      <Routes>
        <Route path="/" element={<Navigate to={getInitialRoute()} replace />} />
        <Route path="/winter-plan" element={<WinterPlanIntro />} />
        <Route path="/winter-plan/info" element={<WinterPlanInfo />} />
        <Route path="/winter-plan/calendar" element={<WinterPlanCalendar />} />
        <Route path="/winter-plan/shifts/:shiftId" element={<ShiftDetails />} />
        <Route path="/winter-plan/cancellation-policy/:policyId" element={<CancellationPolicy />} />
        <Route path="/winter-plan/cancellation-policy" element={<CancellationPolicy />} />
      </Routes>
    </AppContext.Provider>
  )
}

export default App
