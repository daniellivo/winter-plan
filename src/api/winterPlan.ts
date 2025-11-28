import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../config/firebase'
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

// n8n format types
interface N8nShift {
  id: number | string
  externalId?: string
  facility: {
    id: number | string
    name: string
    logo?: string
    address?: string
    addressCity?: string
    mapLink?: string
    facilityReview?: {
      averageRating: number
      totalReviews: number
    }
    shiftGuidanceDocumentUrl?: string
    generalInfoDocumentUrl?: string
    allowInternalProsToCancelApprovedClaims?: boolean
  }
  localStartTime: string
  localFinishTime: string
  shiftTimeInDay?: 'MORNING_SHIFT' | 'AFTERNOON_SHIFT' | 'NIGHT_SHIFT'
  specialization?: {
    name?: string
    displayText?: string
  }
  unit?: string
  shiftTotalPay: number
  paymentBreakdown?: Array<{
    label: string
    amount: string
  }>
  tags?: string[]
  details?: string
  status?: string
}

interface N8nShiftsByDate {
  date: string
  shifts: N8nShift[]
}

interface N8nData {
  shiftsByDate: N8nShiftsByDate[]
}

// Storage key for shifts data
const SHIFTS_STORAGE_KEY = 'winter_plan_shifts_data'

// Mutable state for mocks - this simulates a backend database
let mockShiftsState: Map<string, Shift['status']> = new Map()

// Initialize default states
const initializeShiftStates = () => {
  if (mockShiftsState.size === 0) {
    // All shifts start as pending by default
    for (let i = 1; i <= 30; i++) {
      const shiftId = `shift_${String(i).padStart(3, '0')}`
      mockShiftsState.set(shiftId, 'pending')
    }
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
            date: '2025-12-05',
            shifts: [
              { id: 'shift_011', label: 'TM', startTime: '07:00', endTime: '14:00', facilityName: 'Hospital Universitario Vall d\'Hebron', unit: 'Cardiología', field: 'Quirófano', status: getShiftStatus('shift_011'), price: 270 },
              { id: 'shift_012', label: 'TM', startTime: '08:00', endTime: '15:00', facilityName: 'Hospital de la Santa Creu i Sant Pau', unit: 'Cirugía', field: 'Quirófano', status: getShiftStatus('shift_012'), price: 265 },
              { id: 'shift_013', label: 'TT', startTime: '14:00', endTime: '21:00', facilityName: 'Hospital Clínic', unit: 'Urgencias', field: 'Enfermería', status: getShiftStatus('shift_013'), price: 280 }
            ].filter(s => s.status !== 'rejected')
          },
          {
            date: '2025-12-10',
            shifts: [
              { id: 'shift_001', label: 'TM', startTime: '07:00', endTime: '14:00', facilityName: 'Hospital General de Catalunya', unit: 'Cardiología', field: 'Quirófano', status: getShiftStatus('shift_001'), price: 275 },
              { id: 'shift_002', label: 'TT', startTime: '14:00', endTime: '21:00', facilityName: 'Hospital Clínic', unit: 'Urgencias', field: 'Enfermería', status: getShiftStatus('shift_002'), price: 285 },
              { id: 'shift_014', label: 'TT', startTime: '15:00', endTime: '22:00', facilityName: 'Hospital del Mar', unit: 'Pediatría', field: 'Enfermería', status: getShiftStatus('shift_014'), price: 280 },
              { id: 'shift_015', label: 'TT', startTime: '14:30', endTime: '21:30', facilityName: 'Hospital Vall d\'Hebron', unit: 'Oncología', field: 'Hospitalización', status: getShiftStatus('shift_015'), price: 290 },
              { id: 'shift_003', label: 'TN', startTime: '21:00', endTime: '07:00', facilityName: 'Hospital del Mar', unit: 'UCI', field: 'Intensivos', status: getShiftStatus('shift_003'), price: 310 }
            ].filter(s => s.status !== 'rejected')
          },
          {
            date: '2025-12-15',
            shifts: [
              { id: 'shift_016', label: 'TM', startTime: '07:00', endTime: '14:00', facilityName: 'Hospital Sant Joan de Déu', unit: 'Pediatría', field: 'Hospitalización', status: getShiftStatus('shift_016'), price: 260 },
              { id: 'shift_017', label: 'TM', startTime: '08:00', endTime: '15:00', facilityName: 'Hospital Clínic', unit: 'Cardiología', field: 'Quirófano', status: getShiftStatus('shift_017'), price: 280 },
              { id: 'shift_018', label: 'TN', startTime: '21:00', endTime: '07:00', facilityName: 'Hospital del Mar', unit: 'Urgencias', field: 'Enfermería', status: getShiftStatus('shift_018'), price: 300 },
              { id: 'shift_019', label: 'TN', startTime: '22:00', endTime: '08:00', facilityName: 'Hospital Germans Trias i Pujol', unit: 'UCI', field: 'Intensivos', status: getShiftStatus('shift_019'), price: 320 }
            ].filter(s => s.status !== 'rejected')
          },
          {
            date: '2025-12-18',
            shifts: [
              { id: 'shift_004', label: 'TM', startTime: '07:00', endTime: '14:00', facilityName: 'Hospital General de Catalunya', unit: 'Traumatología', field: 'Quirófano', status: getShiftStatus('shift_004'), price: 275 }
            ].filter(s => s.status !== 'rejected')
          },
          {
            date: '2025-12-20',
            shifts: [
              { id: 'shift_020', label: 'TM', startTime: '07:00', endTime: '14:00', facilityName: 'Hospital Parc Taulí', unit: 'Cardiología', field: 'Quirófano', status: getShiftStatus('shift_020'), price: 270 },
              { id: 'shift_021', label: 'TM', startTime: '07:30', endTime: '14:30', facilityName: 'Hospital del Mar', unit: 'Traumatología', field: 'Quirófano', status: getShiftStatus('shift_021'), price: 265 },
              { id: 'shift_022', label: 'TM', startTime: '08:00', endTime: '15:00', facilityName: 'Hospital Clínic', unit: 'Neurología', field: 'Quirófano', status: getShiftStatus('shift_022'), price: 280 },
              { id: 'shift_005', label: 'TT', startTime: '14:00', endTime: '21:00', facilityName: 'Hospital Clínic', unit: 'Pediatría', field: 'Enfermería', status: getShiftStatus('shift_005'), price: 285 },
              { id: 'shift_023', label: 'TT', startTime: '15:00', endTime: '22:00', facilityName: 'Hospital Vall d\'Hebron', unit: 'Urgencias', field: 'Enfermería', status: getShiftStatus('shift_023'), price: 275 },
              { id: 'shift_006', label: 'TN', startTime: '21:00', endTime: '07:00', facilityName: 'Hospital del Mar', unit: 'Neurología', field: 'Intensivos', status: getShiftStatus('shift_006'), price: 310 }
            ].filter(s => s.status !== 'rejected')
          },
          {
            date: '2025-12-23',
            shifts: [
              { id: 'shift_007', label: 'TT', startTime: '14:00', endTime: '21:00', facilityName: 'Hospital Clínic', unit: 'Oncología', field: 'Enfermería', status: getShiftStatus('shift_007'), price: 290 },
              { id: 'shift_008', label: 'TN', startTime: '21:00', endTime: '07:00', facilityName: 'Hospital del Mar', unit: 'Medicina Interna', field: 'Enfermería', status: getShiftStatus('shift_008'), price: 305 }
            ].filter(s => s.status !== 'rejected')
          },
          {
            date: '2025-12-27',
            shifts: [
              { id: 'shift_024', label: 'TN', startTime: '21:00', endTime: '07:00', facilityName: 'Hospital Clínic', unit: 'UCI', field: 'Intensivos', status: getShiftStatus('shift_024'), price: 320 },
              { id: 'shift_025', label: 'TN', startTime: '22:00', endTime: '08:00', facilityName: 'Hospital del Mar', unit: 'Urgencias', field: 'Enfermería', status: getShiftStatus('shift_025'), price: 300 },
              { id: 'shift_026', label: 'TN', startTime: '21:30', endTime: '07:30', facilityName: 'Hospital Germans Trias', unit: 'UCI', field: 'Intensivos', status: getShiftStatus('shift_026'), price: 315 }
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
              { id: 'shift_009', label: 'TM', startTime: '07:00', endTime: '14:00', facilityName: 'Hospital General de Catalunya', unit: 'Cardiología', field: 'Quirófano', status: getShiftStatus('shift_009'), price: 275 }
            ].filter(s => s.status !== 'rejected')
          },
          {
            date: '2026-01-08',
            shifts: [
              { id: 'shift_027', label: 'TM', startTime: '07:00', endTime: '14:00', facilityName: 'Hospital Clínic', unit: 'Cardiología', field: 'Quirófano', status: getShiftStatus('shift_027'), price: 280 },
              { id: 'shift_028', label: 'TM', startTime: '08:00', endTime: '15:00', facilityName: 'Hospital del Mar', unit: 'Traumatología', field: 'Quirófano', status: getShiftStatus('shift_028'), price: 270 },
              { id: 'shift_029', label: 'TT', startTime: '14:00', endTime: '21:00', facilityName: 'Hospital Vall d\'Hebron', unit: 'Urgencias', field: 'Enfermería', status: getShiftStatus('shift_029'), price: 285 },
              { id: 'shift_030', label: 'TT', startTime: '15:00', endTime: '22:00', facilityName: 'Hospital Sant Pau', unit: 'Pediatría', field: 'Enfermería', status: getShiftStatus('shift_030'), price: 280 }
            ].filter(s => s.status !== 'rejected')
          },
          {
            date: '2026-01-12',
            shifts: [
              { id: 'shift_010', label: 'TT', startTime: '14:00', endTime: '21:00', facilityName: 'Hospital Clínic', unit: 'Urgencias', field: 'Enfermería', status: getShiftStatus('shift_010'), price: 285 }
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
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=C.+de+Cartagena+340,+08025+Barcelona',
    allowInternalProsToCancelApprovedClaims: true,
    generalInfoDocumentUrl: 'https://storage.googleapis.com/livo-backend-prod/shift-guidance-documents/informacion_general_Hospital_General_Catalunya.pdf',
    images: {
      logo: 'https://storage.googleapis.com/livo-backend-prod/facility-images/hospital-logo.jpg'
    }
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

// Get shift label based on time of day (for n8n format)
function getShiftLabel(shift: N8nShift): string {
  if (shift.shiftTimeInDay) {
    switch (shift.shiftTimeInDay) {
      case 'MORNING_SHIFT': return 'TM'
      case 'AFTERNOON_SHIFT': return 'TT'
      case 'NIGHT_SHIFT': return 'TN'
    }
  }
  const hour = parseInt(shift.localStartTime.split(':')[0])
  if (hour >= 7 && hour < 14) return 'TM'
  if (hour >= 14 && hour < 21) return 'TT'
  return 'TN'
}

// Transform n8n format (shiftsByDate) to WinterPlan format
function transformN8nToWinterPlan(data: N8nData, professionalId: string): WinterPlan {
  const monthsMap = new Map<string, Map<string, Shift[]>>()
  
  data.shiftsByDate.forEach(({ date, shifts }) => {
    const month = date.substring(0, 7)
    
    if (!monthsMap.has(month)) {
      monthsMap.set(month, new Map())
    }
    
    const daysMap = monthsMap.get(month)!
    if (!daysMap.has(date)) {
      daysMap.set(date, [])
    }
    
    shifts.forEach(shift => {
      // Skip shifts that are in waiting list
      if (shift.tags?.includes('inWaitingList')) {
        return
      }
      
      daysMap.get(date)!.push({
        id: String(shift.id),
        label: getShiftLabel(shift),
        startTime: shift.localStartTime,
        endTime: shift.localFinishTime,
        facilityName: shift.facility.name,
        unit: shift.unit || shift.specialization?.displayText || '',
        field: shift.specialization?.displayText || '',
        status: 'pending',
        price: shift.shiftTotalPay
      })
    })
  })
  
  const months = Array.from(monthsMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, daysMap]) => ({
      month,
      days: Array.from(daysMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, shifts]) => ({
          date,
          shifts: shifts.sort((a, b) => a.startTime.localeCompare(b.startTime))
        }))
    }))
  
  return {
    professionalId,
    status: 'ready',
    generatedAt: new Date().toISOString(),
    months
  }
}

// Check if data is in n8n format
function isN8nFormat(data: unknown): data is N8nData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'shiftsByDate' in data &&
    Array.isArray((data as N8nData).shiftsByDate)
  )
}

// Transform API response to WinterPlan format (legacy format)
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
  const storedResult = getStoredShiftsData()
  if (storedResult) {
    await new Promise(resolve => setTimeout(resolve, 100)) // Simulate network delay
    
    if (storedResult.isN8n) {
      console.log('📦 Using stored n8n format data')
      return transformN8nToWinterPlan(storedResult.data as N8nData, professionalId)
    } else {
      const legacyData = storedResult.data as ShiftDetailsResponse[]
      if (legacyData.length > 0) {
        console.log('📦 Using stored shifts data:', legacyData.length, 'shifts')
        return transformShiftsToWinterPlan(legacyData, professionalId)
      }
    }
  }

  // Second, try to fetch from Firebase (one-time fetch)
  // Note: For real-time updates, use the useFirebaseShifts hook instead
  if (isFirebaseConfigured()) {
    console.log('🔥 Trying Firebase...')
    const firebaseData = await getShiftsFromFirebase(professionalId)
    if (firebaseData) {
      console.log('✅ Got data from Firebase')
      // Store in sessionStorage for future use
      sessionStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(firebaseData))
      
      // Check format and transform accordingly
      if (isN8nFormat(firebaseData)) {
        return transformN8nToWinterPlan(firebaseData, professionalId)
      } else if (Array.isArray(firebaseData) && firebaseData.length > 0) {
        return transformShiftsToWinterPlan(firebaseData, professionalId)
      }
    }
  }
  
  // Third, try to fetch from proxy server (if available)
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
  const storedResult = getStoredShiftsData()
  if (storedResult) {
    await new Promise(resolve => setTimeout(resolve, 100)) // Simulate network delay
    
    if (storedResult.isN8n) {
      // n8n format - search in shiftsByDate
      const n8nData = storedResult.data as N8nData
      for (const dayData of n8nData.shiftsByDate) {
        const found = dayData.shifts.find(s => String(s.id) === shiftId)
        if (found) {
          console.log('📦 Using stored n8n shift details for:', shiftId)
          // Transform n8n shift to ShiftDetails format
          return {
            id: String(found.id),
            externalId: found.externalId || String(found.id),
            professionalId: '',
            facility: {
              id: String(found.facility.id),
              name: found.facility.name,
              rating: found.facility.facilityReview?.averageRating || 0,
              reviewsCount: found.facility.facilityReview?.totalReviews || 0,
              address: found.facility.address || '',
              city: found.facility.addressCity || '',
              googleMapsUrl: found.facility.mapLink || '',
              generalInfoDocumentUrl: found.facility.generalInfoDocumentUrl,
              allowInternalProsToCancelApprovedClaims: found.facility.allowInternalProsToCancelApprovedClaims
            },
            unit: found.unit || found.specialization?.displayText || '',
            field: found.specialization?.displayText || '',
            date: dayData.date,
            startTime: found.localStartTime,
            endTime: found.localFinishTime,
            remuneration: {
              facilityAmount: found.shiftTotalPay,
              bonusAmount: 0,
              currency: 'EUR',
              total: found.shiftTotalPay
            },
            tags: {
              parking: found.tags?.includes('parking') || false,
              food: found.tags?.includes('food') || false,
              cafeteria: found.tags?.includes('cafeteria') || false,
              casiopea: found.tags?.includes('casiopea') || false
            },
            description: found.details || ''
          }
        }
      }
    } else {
      // Legacy format
      const legacyData = storedResult.data as ShiftDetailsResponse[]
      const foundShift = legacyData.find(item => item.shiftDetails.id === shiftId)
      if (foundShift) {
        console.log('📦 Using stored shift details for:', shiftId)
        return foundShift.shiftDetails
      }
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
 * Supports both legacy format and n8n format (shiftsByDate)
 * 
 * @returns Object with data and format type, or null if no data stored
 */
export function getStoredShiftsData(): { data: ShiftDetailsResponse[] | N8nData; isN8n: boolean } | null {
  try {
    const stored = sessionStorage.getItem(SHIFTS_STORAGE_KEY)
    if (!stored) return null
    
    const parsed = JSON.parse(stored)
    
    // Check if it's n8n format
    if (isN8nFormat(parsed)) {
      return { data: parsed, isN8n: true }
    }
    
    // Legacy format (array of ShiftDetailsResponse)
    if (Array.isArray(parsed)) {
      return { data: parsed, isN8n: false }
    }
    
    return null
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

// ============================================
// Firebase Integration Functions
// ============================================

/**
 * Save shifts data to Firebase Firestore
 * This can be called from the proxy server or directly from n8n
 * 
 * @param professionalId - ID of the professional
 * @param shiftsData - Array of shift details
 * @returns Success status
 */
export async function saveShiftsToFirebase(
  professionalId: string,
  shiftsData: ShiftDetailsResponse[]
): Promise<{ status: string; count: number }> {
  if (!isFirebaseConfigured() || !db) {
    console.log('⚠️ Firebase not configured, falling back to sessionStorage')
    // Fall back to sessionStorage
    sessionStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(shiftsData))
    return { status: 'fallback', count: shiftsData.length }
  }

  try {
    const docRef = doc(db, 'shifts', professionalId)
    
    await setDoc(docRef, {
      shifts: shiftsData,
      updatedAt: new Date().toISOString(),
      professionalId
    })

    console.log('✅ Shifts saved to Firebase:', shiftsData.length, 'shifts')
    
    // Also save to sessionStorage as backup
    sessionStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(shiftsData))
    
    return { status: 'success', count: shiftsData.length }
  } catch (error) {
    console.error('❌ Failed to save to Firebase:', error)
    // Fall back to sessionStorage
    sessionStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(shiftsData))
    return { status: 'fallback', count: shiftsData.length }
  }
}

/**
 * Get shifts data from Firebase Firestore (one-time fetch, not real-time)
 * For real-time updates, use the useFirebaseShifts hook instead
 * Supports both n8n format (shiftsByDate) and legacy format
 * 
 * @param professionalId - ID of the professional
 * @returns Data object (n8n or legacy format) or null
 */
export async function getShiftsFromFirebase(
  professionalId: string
): Promise<N8nData | ShiftDetailsResponse[] | null> {
  if (!isFirebaseConfigured() || !db) {
    console.log('⚠️ Firebase not configured')
    return null
  }

  try {
    const docRef = doc(db, 'shifts', professionalId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      
      // Check for n8n format first
      if (data.shiftsByDate && Array.isArray(data.shiftsByDate)) {
        console.log('📥 Got n8n format data from Firebase:', data.shiftsByDate.length, 'dates')
        return data as N8nData
      }
      
      // Fall back to legacy format
      const shifts = data.shifts || data.data || []
      if (Array.isArray(shifts) && shifts.length > 0) {
        console.log('📥 Got legacy shifts from Firebase:', shifts.length)
        return shifts
      }
    }

    console.log('📭 No shifts found in Firebase for:', professionalId)
    return null
  } catch (error) {
    console.error('❌ Failed to get from Firebase:', error)
    return null
  }
}

/**
 * Check if Firebase is available and configured
 */
export function isFirebaseAvailable(): boolean {
  return isFirebaseConfigured() && db !== null
}
