import type { WinterPlan, ShiftDetails, CancellationPolicy, Shift } from '../types/winterPlan'

// ⚠️ TODO: Reemplazar con la URL real de tu API
// Ejemplo: 'https://livomarketing.app.n8n.cloud/webhook/tu-endpoint'
// o 'https://api.livo.app/v1'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.livo.app/winter-plan'

// Proxy server URL for local development with HTTP POST
const PROXY_SERVER_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001'

// API response type - wraps shiftDetails
interface ShiftDetailsResponse {
  shiftDetails: ShiftDetails
}

// Storage key for shifts data
const SHIFTS_STORAGE_KEY = 'winter_plan_shifts_data'

// Mutable state for mocks - this simulates a backend database
let mockShiftsState: Map<string, Shift['status']> = new Map()

// Initialize default states
const initializeShiftStates = () => {
  if (mockShiftsState.size === 0) {
    // All shifts start as pending by default
    mockShiftsState.set('shift_001', 'pending')
    mockShiftsState.set('shift_002', 'pending')
    mockShiftsState.set('shift_003', 'pending')
    mockShiftsState.set('shift_004', 'pending')
    mockShiftsState.set('shift_005', 'pending')
    mockShiftsState.set('shift_006', 'pending')
    mockShiftsState.set('shift_007', 'pending')
    mockShiftsState.set('shift_008', 'pending')
    mockShiftsState.set('shift_009', 'pending')
    mockShiftsState.set('shift_010', 'pending')
  }
}

// Get shift status from state
const getShiftStatus = (shiftId: string): Shift['status'] => {
  initializeShiftStates()
  return mockShiftsState.get(shiftId) || 'pending'
}

// Update shift status
const updateShiftStatus = (shiftId: string, status: Shift['status']) => {
  initializeShiftStates()
  mockShiftsState.set(shiftId, status)
}

// Build mock winter plan with current states
const buildMockWinterPlan = (): WinterPlan => {
  initializeShiftStates()
  
  return {
    professionalId: 'pro_123',
    status: 'ready',
    generatedAt: '2025-11-20T10:30:00Z',
    months: [
      {
        month: '2025-12',
        days: [
          {
            date: '2025-12-10',
            shifts: [
              { id: 'shift_001', label: 'TM', startTime: '07:00', endTime: '14:00', facilityName: 'Hospital General de Catalunya', unit: 'Cardiología', field: 'Quirófano', status: getShiftStatus('shift_001') },
              { id: 'shift_002', label: 'TT', startTime: '14:00', endTime: '21:00', facilityName: 'Hospital Clínic', unit: 'Urgencias', field: 'Enfermería', status: getShiftStatus('shift_002') },
              { id: 'shift_003', label: 'TN', startTime: '21:00', endTime: '07:00', facilityName: 'Hospital del Mar', unit: 'UCI', field: 'Intensivos', status: getShiftStatus('shift_003') }
            ].filter(s => s.status !== 'rejected') // Hide rejected shifts
          },
          {
            date: '2025-12-18',
            shifts: [
              { id: 'shift_004', label: 'TM', startTime: '07:00', endTime: '14:00', facilityName: 'Hospital General de Catalunya', unit: 'Traumatología', field: 'Quirófano', status: getShiftStatus('shift_004') }
            ].filter(s => s.status !== 'rejected')
          },
          {
            date: '2025-12-20',
            shifts: [
              { id: 'shift_005', label: 'TT', startTime: '14:00', endTime: '21:00', facilityName: 'Hospital Clínic', unit: 'Pediatría', field: 'Enfermería', status: getShiftStatus('shift_005') },
              { id: 'shift_006', label: 'TN', startTime: '21:00', endTime: '07:00', facilityName: 'Hospital del Mar', unit: 'Neurología', field: 'Intensivos', status: getShiftStatus('shift_006') }
            ].filter(s => s.status !== 'rejected')
          },
          {
            date: '2025-12-23',
            shifts: [
              { id: 'shift_007', label: 'TT', startTime: '14:00', endTime: '21:00', facilityName: 'Hospital Clínic', unit: 'Oncología', field: 'Enfermería', status: getShiftStatus('shift_007') },
              { id: 'shift_008', label: 'TN', startTime: '21:00', endTime: '07:00', facilityName: 'Hospital del Mar', unit: 'Medicina Interna', field: 'Enfermería', status: getShiftStatus('shift_008') }
            ].filter(s => s.status !== 'rejected')
          }
        ].filter(d => d.shifts.length > 0) // Hide days with no shifts
      },
      {
        month: '2026-01',
        days: [
          {
            date: '2026-01-05',
            shifts: [
              { id: 'shift_009', label: 'TM', startTime: '07:00', endTime: '14:00', facilityName: 'Hospital General de Catalunya', unit: 'Cardiología', field: 'Quirófano', status: getShiftStatus('shift_009') }
            ].filter(s => s.status !== 'rejected')
          },
          {
            date: '2026-01-12',
            shifts: [
              { id: 'shift_010', label: 'TT', startTime: '14:00', endTime: '21:00', facilityName: 'Hospital Clínic', unit: 'Urgencias', field: 'Enfermería', status: getShiftStatus('shift_010') }
            ].filter(s => s.status !== 'rejected')
          }
        ].filter(d => d.shifts.length > 0)
      }
    ]
  }
}

const mockShiftDetails: ShiftDetails = {
  id: 'shift_001',
  professionalId: 'pro_123',
  facility: {
    id: 'fac_001',
    name: 'Hospital General de Catalunya',
    rating: 4.1,
    reviewsCount: 10,
    address: 'C. de Cartagena 340, 08025',
    city: 'Barcelona',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=C.+de+Cartagena+340,+08025+Barcelona'
  },
  unit: 'Quirófano - Instrumentista',
  field: 'Cardiología',
  date: '2025-04-27',
  startTime: '07:00',
  endTime: '16:00',
  remuneration: {
    facilityAmount: 250,
    bonusAmount: 50,
    currency: 'EUR',
    total: 300
  },
  tags: {
    parking: true,
    food: false,
    cafeteria: true,
    casiopea: true
  },
  description: 'Trabaja cuando, donde y como quieras usando la App de Livo para conseguir los turnos que mejor se ajustan a tus necesidades.'
}

const mockCancellationPolicy: CancellationPolicy = {
  id: 'winter_default',
  title: 'Política de cancelación',
  sections: [
    {
      title: 'Turno sin confirmar',
      body: 'Podrás cancelar desde la app en cualquier momento.'
    },
    {
      title: 'A más de 7 días de iniciar el turno',
      body: 'Deberás contactar con soporte e indicar que deseas cancelar el turno.'
    },
    {
      title: 'A menos de 7 días de iniciar el turno',
      body: 'Deberás contactar con soporte y dar una de causa razón mayor. De lo contrario tu cuenta podrá recibir restricciones.'
    },
    {
      title: 'Si no te presentas al turno de acogida',
      body: 'Se cancelará automáticamente el turno de cobertura.'
    }
  ]
}

// Use mocks in development, real API in production
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

// Transform API response to WinterPlan format
function transformShiftsToWinterPlan(shiftsResponse: ShiftDetailsResponse[], professionalId: string): WinterPlan {
  // Group shifts by month and date
  const monthsMap = new Map<string, Map<string, Shift[]>>()
  
  shiftsResponse.forEach(({ shiftDetails }) => {
    const date = shiftDetails.date // YYYY-MM-DD
    const month = date.substring(0, 7) // YYYY-MM
    
    if (!monthsMap.has(month)) {
      monthsMap.set(month, new Map())
    }
    
    const daysMap = monthsMap.get(month)!
    if (!daysMap.has(date)) {
      daysMap.set(date, [])
    }
    
    // Determine shift label based on start time
    let label = 'TM' // Default morning
    const hour = parseInt(shiftDetails.startTime.split(':')[0])
    if (hour >= 14 && hour < 21) label = 'TT' // Afternoon
    else if (hour >= 21 || hour < 7) label = 'TN' // Night
    
    daysMap.get(date)!.push({
      id: shiftDetails.id,
      label,
      startTime: shiftDetails.startTime,
      endTime: shiftDetails.endTime,
      facilityName: shiftDetails.facility.name,
      unit: shiftDetails.unit,
      field: shiftDetails.field,
      status: 'pending'
    })
  })
  
  // Convert maps to arrays
  const months = Array.from(monthsMap.entries()).map(([month, daysMap]) => ({
    month,
    days: Array.from(daysMap.entries()).map(([date, shifts]) => ({
      date,
      shifts
    }))
  }))
  
  return {
    professionalId,
    status: 'ready',
    generatedAt: new Date().toISOString(),
    months
  }
}

export async function getWinterPlan(professionalId: string, month?: string): Promise<WinterPlan> {
  if (USE_MOCKS) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return buildMockWinterPlan()
  }
  
  // First, try to use stored shifts data (from receiveShiftsData or POST endpoint)
  const storedShifts = getStoredShiftsData()
  if (storedShifts && storedShifts.length > 0) {
    console.log('📦 Using stored shifts data:', storedShifts.length, 'shifts')
    await new Promise(resolve => setTimeout(resolve, 100)) // Simulate network delay
    return transformShiftsToWinterPlan(storedShifts, professionalId)
  }
  
  // Second, try to fetch from proxy server (if available)
  try {
    console.log('🔄 Trying proxy server...')
    const proxyResponse = await fetch(`${PROXY_SERVER_URL}/api/shifts/${professionalId}`)
    if (proxyResponse.ok) {
      const proxyData = await proxyResponse.json()
      if (proxyData.status === 'success' && proxyData.data) {
        console.log('✅ Got data from proxy server')
        // Store in sessionStorage for future use
        sessionStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(proxyData.data))
        return transformShiftsToWinterPlan(proxyData.data, professionalId)
      }
    }
  } catch (error) {
    console.log('⚠️ Proxy server not available, trying main API...')
  }
  
  // Finally, fetch from main API
  console.log('🌐 Fetching shifts from main API...')
  const params = new URLSearchParams()
  if (month) params.append('month', month)
  
  const response = await fetch(
    `${API_BASE_URL}/professionals/${professionalId}?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('winter_plan_token') || ''}`,
        'X-Professional-Id': professionalId
      }
    }
  )
  
  if (!response.ok) throw new Error('Failed to fetch winter plan')
  
  const data: ShiftDetailsResponse[] = await response.json()
  return transformShiftsToWinterPlan(data, professionalId)
}

export async function getShiftDetails(shiftId: string): Promise<ShiftDetails> {
  if (USE_MOCKS) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { ...mockShiftDetails, id: shiftId }
  }
  
  // First, try to find in stored shifts data
  const storedShifts = getStoredShiftsData()
  if (storedShifts) {
    const foundShift = storedShifts.find(item => item.shiftDetails.id === shiftId)
    if (foundShift) {
      console.log('📦 Using stored shift details for:', shiftId)
      await new Promise(resolve => setTimeout(resolve, 100)) // Simulate network delay
      return foundShift.shiftDetails
    }
  }
  
  // If not found in storage, fetch from API
  console.log('🌐 Fetching shift details from API:', shiftId)
  const response = await fetch(`${API_BASE_URL}/shifts/${shiftId}`, {
    headers: {
      'Authorization': `Bearer ${sessionStorage.getItem('winter_plan_token') || ''}`
    }
  })
  
  if (!response.ok) throw new Error('Failed to fetch shift details')
  
  const data: ShiftDetailsResponse = await response.json()
  return data.shiftDetails
}

export async function claimShift(shiftId: string, professionalId: string): Promise<{ status: string; claimId: string }> {
  if (USE_MOCKS) {
    await new Promise(resolve => setTimeout(resolve, 300))
    // Update the shift status to claimed
    updateShiftStatus(shiftId, 'claimed')
    return { status: 'success', claimId: `claim_${Date.now()}` }
  }
  
  const response = await fetch(`${API_BASE_URL}/winter-plan/shifts/${shiftId}/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionStorage.getItem('winter_plan_token') || ''}`
    },
    body: JSON.stringify({ professionalId, source: 'winter_plan' })
  })
  
  if (!response.ok) throw new Error('Failed to claim shift')
  return response.json()
}

export async function sendFeedback(
  shiftId: string, 
  professionalId: string, 
  reason: 'not_available' | 'not_interested'
): Promise<{ status: string }> {
  if (USE_MOCKS) {
    await new Promise(resolve => setTimeout(resolve, 300))
    // Update the shift status to rejected (will be hidden)
    updateShiftStatus(shiftId, 'rejected')
    return { status: 'ok' }
  }
  
  const response = await fetch(`${API_BASE_URL}/winter-plan/shifts/${shiftId}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionStorage.getItem('winter_plan_token') || ''}`
    },
    body: JSON.stringify({ professionalId, reason, source: 'winter_plan' })
  })
  
  if (!response.ok) throw new Error('Failed to send feedback')
  return response.json()
}

export async function getCancellationPolicy(policyId: string): Promise<CancellationPolicy> {
  if (USE_MOCKS) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return mockCancellationPolicy
  }
  
  const response = await fetch(`${API_BASE_URL}/winter-plan/cancellation-policies/${policyId}`, {
    headers: {
      'Authorization': `Bearer ${sessionStorage.getItem('winter_plan_token') || ''}`
    }
  })
  
  if (!response.ok) throw new Error('Failed to fetch cancellation policy')
  return response.json()
}

/**
 * Receive and store shifts data (POST endpoint)
 * This allows external systems (like n8n) to push shift data to the app
 * 
 * @param shiftsData - Array of shift details wrapped in shiftDetails objects
 * @param professionalId - ID of the professional (optional, for validation)
 * @returns Success status
 */
export async function receiveShiftsData(
  shiftsData: ShiftDetailsResponse[],
  professionalId?: string
): Promise<{ status: string; count: number }> {
  try {
    // Validate data structure
    if (!Array.isArray(shiftsData)) {
      throw new Error('Invalid data format: expected array')
    }

    // Validate each shift has the required structure
    const validShifts = shiftsData.filter(item => 
      item.shiftDetails && 
      item.shiftDetails.id && 
      item.shiftDetails.date
    )

    if (validShifts.length === 0) {
      throw new Error('No valid shifts found in data')
    }

    // If professionalId is provided, filter shifts for that professional
    const filteredShifts = professionalId
      ? validShifts.filter(item => item.shiftDetails.professionalId === professionalId)
      : validShifts

    // Store in sessionStorage (persists during the session)
    sessionStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(filteredShifts))

    console.log(`✅ Received and stored ${filteredShifts.length} shifts`)

    return {
      status: 'success',
      count: filteredShifts.length
    }
  } catch (error) {
    console.error('❌ Error receiving shifts data:', error)
    throw error
  }
}

/**
 * Get stored shifts data from sessionStorage
 * This is used internally to retrieve shifts that were pushed via receiveShiftsData
 * 
 * @returns Array of shift details or null if no data stored
 */
export function getStoredShiftsData(): ShiftDetailsResponse[] | null {
  try {
    const stored = sessionStorage.getItem(SHIFTS_STORAGE_KEY)
    if (!stored) return null
    
    return JSON.parse(stored)
  } catch (error) {
    console.error('❌ Error reading stored shifts:', error)
    return null
  }
}

/**
 * Clear stored shifts data
 */
export function clearStoredShiftsData(): void {
  sessionStorage.removeItem(SHIFTS_STORAGE_KEY)
  console.log('🗑️ Cleared stored shifts data')
}

/**
 * Send completed plan to n8n webhook
 * Sends only the IDs of shifts that have been claimed (confirmed)
 * 
 * @param professionalId - ID of the professional
 * @param confirmedShiftIds - Array of shift IDs that have been claimed
 * @returns Success status
 */
export async function sendCompletedPlan(
  professionalId: string,
  confirmedShiftIds: string[]
): Promise<{ status: string }> {
  // Use the same webhook URL as session tracking
  const WEBHOOK_URL = 'https://livomarketing.app.n8n.cloud/webhook/104d7026-2f4f-4f50-b427-1f129f060fa6'
  
  const payload = {
    event: 'plan_completed',
    professionalId,
    confirmedShiftIds,
    timestamp: new Date().toISOString(),
    confirmedCount: confirmedShiftIds.length
  }

  console.log('📤 Sending completed plan to webhook:', payload)

  try {
    // Use no-cors mode to bypass CORS restrictions (webhook will still receive the data)
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true
    })
    
    console.log('✅ Completed plan sent successfully')
    return { status: 'success' }
  } catch (error) {
    console.error('❌ Failed to send completed plan:', error)
    throw error
  }
}
