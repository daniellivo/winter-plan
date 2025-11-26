import type { WinterPlan, ShiftDetails, CancellationPolicy, Shift } from '../types/winterPlan'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.livo.app'

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
const USE_MOCKS = true

export async function getWinterPlan(professionalId: string, month?: string): Promise<WinterPlan> {
  if (USE_MOCKS) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return buildMockWinterPlan()
  }
  
  const params = new URLSearchParams()
  if (month) params.append('month', month)
  
  const response = await fetch(
    `${API_BASE_URL}/winter-plan/professionals/${professionalId}?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'X-Professional-Id': professionalId
      }
    }
  )
  
  if (!response.ok) throw new Error('Failed to fetch winter plan')
  return response.json()
}

export async function getShiftDetails(shiftId: string): Promise<ShiftDetails> {
  if (USE_MOCKS) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { ...mockShiftDetails, id: shiftId }
  }
  
  const response = await fetch(`${API_BASE_URL}/winter-plan/shifts/${shiftId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
  
  if (!response.ok) throw new Error('Failed to fetch shift details')
  return response.json()
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
      'Authorization': `Bearer ${localStorage.getItem('token')}`
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
      'Authorization': `Bearer ${localStorage.getItem('token')}`
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
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
  
  if (!response.ok) throw new Error('Failed to fetch cancellation policy')
  return response.json()
}
