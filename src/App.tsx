import { Routes, Route, useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { createContext, useContext, useEffect, useRef } from 'react'
import WinterPlanIntro from './pages/WinterPlanIntro'
import WinterPlanCalendar from './pages/WinterPlanCalendar'
import WinterPlanInfo from './pages/WinterPlanInfo'
import ShiftDetails from './pages/ShiftDetails'
import CancellationPolicy from './pages/CancellationPolicy'
import ShiftsDataReceiver from './pages/ShiftsDataReceiver'
import AvailableShifts from './pages/AvailableShifts'
import { sendTrackingEvent } from './api/tracking'

// Webhook URL for tracking sessions (session_start event)
// ⚠️ IMPORTANTE: El workflow debe estar ACTIVO en n8n (botón "Active" en ON)
const WEBHOOK_URL = 'https://livomarketing.app.n8n.cloud/webhook/b695101c-3160-4721-a4de-6feeac5b913e'

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

// Send session start to webhook - executes immediately
function notifySessionStart(professionalId: string) {
  const payload = {
    event: 'session_start',
    professionalId,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  }

  console.log('🚀 Sending webhook with payload:', payload)
  console.log('🚀 Webhook URL:', WEBHOOK_URL)

  // Send POST with JSON body (n8n expects data in body, not URL params)
  // Use no-cors mode to bypass CORS restrictions (webhook will still receive the data)
  fetch(WEBHOOK_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    keepalive: true
  })
    .then(() => console.log('✅ Webhook sent successfully (no-cors mode)'))
    .catch((error) => console.error('❌ Failed to notify webhook:', error))
}

const professionalIdKey = 'winter_plan_professional_id'
const tokenKey = 'winter_plan_token'

function App() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const hasNotifiedRef = useRef(false)
  const hasRedirectedRef = useRef(false)
  
  // Read params from URL or sessionStorage (fallback)
  // Support both ENCODED_PROFESSIONAL_ID (new format) and professionalId (legacy)
  let professionalId = searchParams.get('ENCODED_PROFESSIONAL_ID') || searchParams.get('professionalId') || ''
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
    
    // Send page_enter tracking event (with empty data since plan hasn't loaded yet)
    sendTrackingEvent(
      professionalId,
      'page_enter',
      null, // plan not loaded yet
      [], // availability not loaded yet
      [] // shiftClaims not loaded yet
    )
  }, [professionalId])

  // Handle entry parameter redirect
  useEffect(() => {
    if (!professionalId || hasRedirectedRef.current) return
    if (entry === 'calendar' && location.pathname === '/') {
      hasRedirectedRef.current = true
      const queryString = professionalId ? `?ENCODED_PROFESSIONAL_ID=${professionalId}${token ? `&token=${token}` : ''}` : ''
      navigate(`/calendar${queryString}`, { replace: true })
    }
  }, [entry, professionalId, token, location.pathname, navigate])

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
        </div>
      </div>
    )
  }

  return (
    <AppContext.Provider value={{ professionalId, token }}>
      <Routes>
        <Route path="/" element={<WinterPlanIntro />} />
        <Route path="/info" element={<WinterPlanInfo />} />
        <Route path="/calendar" element={<WinterPlanCalendar />} />
        <Route path="/shifts/:shiftId" element={<ShiftDetails />} />
        <Route path="/cancellation-policy/:policyId" element={<CancellationPolicy />} />
        <Route path="/cancellation-policy" element={<CancellationPolicy />} />
        <Route path="/receive-data" element={<ShiftsDataReceiver />} />
        <Route path="/available-shifts" element={<AvailableShifts />} />
      </Routes>
    </AppContext.Provider>
  )
}

export default App
