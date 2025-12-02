import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../config/firebase'
import type { WinterPlan, ShiftDetails, CancellationPolicy, Shift, AvailableShiftsResponse, AvailableShift, AvailableShiftsByDate } from '../types/winterPlan'

// ⚠️ TODO: Reemplazar con la URL real de tu API
// Ejemplo: 'https://livomarketing.app.n8n.cloud/webhook/tu-endpoint'
// o 'https://api.livo.app/v1'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.livo.app/winter-plan'

// New availability API base URL
const AVAILABILITY_API_BASE_URL = 'https://api.getlivo.com'

// Proxy server URL for local development with HTTP POST
const _PROXY_SERVER_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001'

// ============================================
// New Availability API Types
// ============================================

interface AvailabilitySlot {
  date: string // "2025-12-01"
  day: boolean
  evening: boolean
  night: boolean
}

interface ShiftClaim {
  claimId: string
  shiftId: string
  livoUnit: string
  livoField: string
  totalPay: number
  startTimeUtc: string // "2025-12-01T19:04:43.785Z"
  endTimeUtc: string
  shiftTimeInDay: string // "MORNING_SHIFT", "AFTERNOON_SHIFT", "NIGHT_SHIFT"
  status: string
}

interface AvailabilityApiResponse {
  availability: AvailabilitySlot[]
  shiftClaims: ShiftClaim[]
}

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

// Storage key for available shifts from the new API
const AVAILABLE_SHIFTS_STORAGE_KEY = 'winter_plan_available_shifts_data'

// Storage key for claimed shifts (persists across navigation)
const CLAIMED_SHIFTS_KEY = 'winter_plan_claimed_shifts'

// ============================================
// Translation Maps for Units and Fields
// ============================================

const FIELDS_TRANSLATION: Record<string, string> = {
  // Códigos en mayúsculas
  'ALLERGOLOGY': 'Alergología',
  'TRAVEL_HEALTH': 'Atención al viajero',
  'HOME_CARE': 'Atención domiciliaria',
  'CARDIOLOGY': 'Cardiología',
  'ELECTROPHYSIOLOGY': 'Electrofisiologia',
  'GENERAL_SURGERY': 'Cirugía general',
  'VASCULAR_SURGERY': 'Cirugía vascular',
  'MEDICAL_EVENT_COVERAGE': 'Cobertura de eventos',
  'WOUND_CARE': 'Curas',
  'EXTRACTIONS': 'Extracciones',
  'INTRAVENOUS_THERAPY_TEAM': 'Equipo de terapia intravenosa',
  'DERMATOLOGY': 'Dermatología',
  'GASTROENTEROLOGY': 'Digestivo',
  'PEOPLE_WITH_DISABILITIES': 'Diversidad funcional',
  'MEDICAL_EDUCATION': 'Docencia',
  'ENDOCRINOLOGY_AND_NUTRITION': 'Endocrinología',
  'GERIATRICS': 'Geriatría',
  'INFECTIOUS_DISEASES': 'Infecciosas',
  'MIDWIVES': 'Matronas',
  'MAXILLOFACIAL': 'Maxilofacial',
  'AESTHETIC_MEDICINE': 'Medicina estética',
  'INTERNAL_MEDICINE': 'Medicina Interna',
  'NEPHROLOGY_AND_UROLOGY': 'Nefrología y Urología',
  'NEONATOLOGY': 'Neonatos',
  'PULMONOLOGY': 'Neumología',
  'NEUROSURGERY': 'Neurocirugía',
  'NEUROLOGY': 'Neurología',
  'OBSTETRICS_AND_GYNECOLOGY': 'Ginecología',
  'DENTISTRY': 'Odontología',
  'OPHTHALMOLOGY': 'Oftalmología',
  'ONCOLOGY_AND_HEMATOLOGY': 'Oncohematología',
  'BLOOD_BANK': 'Banco de sangre',
  'OSTOMIES': 'Ostomías',
  'OTOLARYNGOLOGY': 'Otorrinolaringología',
  'PALLIATIVE_CARE': 'Paliativos',
  'PADES': 'PADES',
  'PEDIATRICS': 'Pediatría',
  'VERSATILE': 'Polivalente',
  'REHABILITATION': 'Rehabilitación',
  'FERTILITY': 'Reproducción asistida',
  'RHEUMATOLOGY': 'Reumatología',
  'MEDICAL_CHECK_UPS': 'Revisiones médicas',
  'MENTAL_HEALTH_ADDICTIONS': 'S. Mental adicciones',
  'ADULT_MENTAL_HEALTH': 'S. Mental adultos',
  'CHILD_MENTAL_HEALTH': 'S. Mental infantil',
  'MENTAL_HEALTH_PSYCHOGERIATRICS': 'S. Mental psicogeriatría',
  'MENTAL_HEALTH_TCA': 'S. Mental TCA',
  'SUPERVISION': 'Supervisión',
  'MEDICAL_TRANSFERS': 'Traslados sanitarios',
  'TRAUMATOLOGY': 'Traumatología',
  'MATERNAL_AND_CHILD': 'Materno-Infantil',
  // Textos en inglés (del API)
  'Allergology': 'Alergología',
  'Travel health': 'Atención al viajero',
  'Home care': 'Atención domiciliaria',
  'Cardiology': 'Cardiología',
  'Electrophysiology': 'Electrofisiologia',
  'General surgery': 'Cirugía general',
  'Vascular surgery': 'Cirugía vascular',
  'Medical event coverage': 'Cobertura de eventos',
  'Wound care': 'Curas',
  'Extractions': 'Extracciones',
  'Intravenous therapy team': 'Equipo de terapia intravenosa',
  'Dermatology': 'Dermatología',
  'Gastroenterology': 'Digestivo',
  'People with disabilities': 'Diversidad funcional',
  'Medical education': 'Docencia',
  'Endocrinology and nutrition': 'Endocrinología',
  'Geriatrics': 'Geriatría',
  'Infectious diseases': 'Infecciosas',
  'Midwives': 'Matronas',
  'Maxillofacial': 'Maxilofacial',
  'Aesthetic medicine': 'Medicina estética',
  'Internal medicine': 'Medicina Interna',
  'Nephrology and urology': 'Nefrología y Urología',
  'Neonatology': 'Neonatos',
  'Pulmonology': 'Neumología',
  'Neurosurgery': 'Neurocirugía',
  'Neurology': 'Neurología',
  'Obstetrics and gynecology': 'Ginecología',
  'Gynecology': 'Ginecología',
  'Dentistry': 'Odontología',
  'Ophthalmology': 'Oftalmología',
  'Oncology and hematology': 'Oncohematología',
  'Blood bank': 'Banco de sangre',
  'Ostomies': 'Ostomías',
  'Otolaryngology': 'Otorrinolaringología',
  'Palliative care': 'Paliativos',
  'Pediatrics': 'Pediatría',
  'Versatile': 'Polivalente',
  'Rehabilitation': 'Rehabilitación',
  'Fertility': 'Reproducción asistida',
  'Rheumatology': 'Reumatología',
  'Medical check-ups': 'Revisiones médicas',
  'Mental health addictions': 'S. Mental adicciones',
  'Adult mental health': 'S. Mental adultos',
  'Child mental health': 'S. Mental infantil',
  'Mental health psychogeriatrics': 'S. Mental psicogeriatría',
  'Mental health TCA': 'S. Mental TCA',
  'Supervision': 'Supervisión',
  'Medical transfers': 'Traslados sanitarios',
  'Traumatology': 'Traumatología',
  'Maternal and child': 'Materno-Infantil'
}

const UNITS_TRANSLATION: Record<string, string> = {
  // Códigos en mayúsculas
  'MEDICAL_HOSPITALIZATION': 'Hospitalización médica',
  'SURGICAL_HOSPITALIZATION': 'Hospitalización quirúrgica',
  'MEDICAL_SURGICAL_HOSPITALIZATION': 'Hospitalización medico-quirúrgica',
  'EMERGENCY': 'Urgencias',
  'INTENSIVE_CARE_UNIT': 'UCI',
  'INTERMEDIATE_CARE_UNIT': 'Semicríticos',
  'HEMODIALYSIS': 'Hemodiálisis',
  'DELIVERY_ROOM': 'Sala de partos',
  'ENDOSCOPY': 'Endoscopias',
  'URODYNAMICS_ROOM': 'Sala de Urodinamia',
  'OPERATING_ROOM_ANESTHESIA': 'Quirófano - Anestesia',
  'OPERATING_ROOM_INSTRUMENTALIST': 'Quirófano - Instrumentista',
  'OPERATING_ROOM_CIRCULATING': 'Quirófano - Circulante',
  'OPERATING_ROOM_STERILIZATION': 'Quirófano - Esterilización',
  'OPERATING_ROOM_PERFUSIONIST': 'Quirófano - Perfusionista',
  'OPERATING_ROOM_REA': 'Quirófano - REA/URPA',
  'SHORT_STAY_UNIT': 'Unidad de corta estancia',
  'MAJOR_AMBULATORY_SURGERY_UNIT': 'Unidad de cirugía ambulatoria',
  'RADIOLOGY': 'Radiología diagnóstica',
  'INTERVENTIONAL_RADIOLOGY': 'Radiología intervencionista',
  'HEMODYNAMICS_ROOM': 'Sala de hemodinámica',
  'HOME_HOSPITALIZATION': 'Hospitalización a domicilio',
  'DAY_CARE_HOSPITAL': 'Hospital de día',
  'CONVALESCENCE': 'Convalecencia',
  'OUTPATIENT_CLINICS': 'Consultas externas',
  'EXTRACTIONS': 'Extracciones',
  'LABORATORY': 'Laboratorio',
  'OUTPATIENT_SURGERY_UNIT': 'UCMA/UCSI',
  // Textos en inglés (del API)
  'Medical hospitalization': 'Hospitalización médica',
  'Surgical hospitalization': 'Hospitalización quirúrgica',
  'Medical-surgical hospitalization': 'Hospitalización medico-quirúrgica',
  'Medical surgical hospitalization': 'Hospitalización medico-quirúrgica',
  'Emergency': 'Urgencias',
  'Intensive care unit': 'UCI',
  'ICU': 'UCI',
  'Intermediate care unit': 'Semicríticos',
  'Hemodialysis': 'Hemodiálisis',
  'Delivery room': 'Sala de partos',
  'Endoscopy': 'Endoscopias',
  'Urodynamics room': 'Sala de Urodinamia',
  'Operating room - Anesthesia': 'Quirófano - Anestesia',
  'Operating room - Instrumentalist': 'Quirófano - Instrumentista',
  'Operating room - Circulating': 'Quirófano - Circulante',
  'Operating room - Sterilization': 'Quirófano - Esterilización',
  'Operating room - Perfusionist': 'Quirófano - Perfusionista',
  'Operating room - REA': 'Quirófano - REA/URPA',
  'Operating room': 'Quirófano',
  'Short stay unit': 'Unidad de corta estancia',
  'Major ambulatory surgery unit': 'Unidad de cirugía ambulatoria',
  'Radiology': 'Radiología diagnóstica',
  'Interventional radiology': 'Radiología intervencionista',
  'Hemodynamics room': 'Sala de hemodinámica',
  'Home hospitalization': 'Hospitalización a domicilio',
  'Day care hospital': 'Hospital de día',
  'Convalescence': 'Convalecencia',
  'Outpatient clinics': 'Consultas externas',
  'Laboratory': 'Laboratorio',
  'Outpatient surgery unit': 'UCMA/UCSI'
}

/**
 * Translate a field code to Spanish display text
 */
export function translateField(fieldCode: string | undefined): string {
  if (!fieldCode) return ''
  
  // First check if it's already a Spanish display text
  if (Object.values(FIELDS_TRANSLATION).includes(fieldCode)) return fieldCode
  
  // Try direct match
  if (FIELDS_TRANSLATION[fieldCode]) return FIELDS_TRANSLATION[fieldCode]
  
  // Try case-insensitive match
  const lowerCode = fieldCode.toLowerCase()
  for (const [key, value] of Object.entries(FIELDS_TRANSLATION)) {
    if (key.toLowerCase() === lowerCode || key.toLowerCase().replace(/_/g, ' ') === lowerCode) {
      return value
    }
  }
  
  // Return original if no translation found
  return fieldCode
}

/**
 * Translate a unit code to Spanish display text
 */
export function translateUnit(unitCode: string | undefined): string {
  if (!unitCode) return ''
  
  // First check if it's already a Spanish display text
  if (Object.values(UNITS_TRANSLATION).includes(unitCode)) return unitCode
  
  // Try direct match
  if (UNITS_TRANSLATION[unitCode]) return UNITS_TRANSLATION[unitCode]
  
  // Try case-insensitive match
  const lowerCode = unitCode.toLowerCase()
  for (const [key, value] of Object.entries(UNITS_TRANSLATION)) {
    if (key.toLowerCase() === lowerCode || key.toLowerCase().replace(/_/g, ' ') === lowerCode) {
      return value
    }
  }
  
  // Return original if no translation found
  return unitCode
}

// Storage key for rejected slots (persists across navigation)
const REJECTED_SLOTS_KEY = 'winter_plan_rejected_slots'

// ============================================
// Rejected Slots Persistence Functions
// ============================================

/**
 * Save a slot as rejected in sessionStorage
 * @param date - Date string (YYYY-MM-DD)
 * @param label - Slot label (TM, TT, TN)
 */
export function saveRejectedSlot(date: string, label: string): void {
  const rejected = getRejectedSlots()
  const key = `${date}-${label}`
  if (!rejected.includes(key)) {
    rejected.push(key)
    sessionStorage.setItem(REJECTED_SLOTS_KEY, JSON.stringify(rejected))
    console.log('❌ Saved rejected slot:', key, 'Total:', rejected.length)
  }
}

/**
 * Remove a slot from rejected in sessionStorage
 * @param date - Date string (YYYY-MM-DD)
 * @param label - Slot label (TM, TT, TN)
 */
export function removeRejectedSlot(date: string, label: string): void {
  const rejected = getRejectedSlots()
  const key = `${date}-${label}`
  const filtered = rejected.filter(k => k !== key)
  sessionStorage.setItem(REJECTED_SLOTS_KEY, JSON.stringify(filtered))
  console.log('🔄 Removed rejected slot:', key, 'Total:', filtered.length)
}

/**
 * Get all rejected slot keys from sessionStorage
 * @returns Array of keys in format "YYYY-MM-DD-TM"
 */
export function getRejectedSlots(): string[] {
  try {
    const stored = sessionStorage.getItem(REJECTED_SLOTS_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch {
    return []
  }
}

/**
 * Check if a specific slot is rejected
 * @param date - Date string (YYYY-MM-DD)
 * @param label - Slot label (TM, TT, TN)
 */
export function isSlotRejected(date: string, label: string): boolean {
  const key = `${date}-${label}`
  return getRejectedSlots().includes(key)
}

/**
 * Clear all rejected slots from sessionStorage
 */
export function clearRejectedSlots(): void {
  sessionStorage.removeItem(REJECTED_SLOTS_KEY)
  console.log('🗑️ Cleared all rejected slots')
}

// ============================================
// Claimed Shifts Persistence Functions
// ============================================

/**
 * Save a shift as claimed in sessionStorage
 */
export function saveClaimedShift(shiftId: string): void {
  const claimed = getClaimedShiftIds()
  if (!claimed.includes(shiftId)) {
    claimed.push(shiftId)
    sessionStorage.setItem(CLAIMED_SHIFTS_KEY, JSON.stringify(claimed))
    console.log('✅ Saved claimed shift:', shiftId, 'Total:', claimed.length)
  }
}

/**
 * Remove a shift from claimed in sessionStorage
 */
export function removeClaimedShift(shiftId: string): void {
  const claimed = getClaimedShiftIds()
  const filtered = claimed.filter(id => id !== shiftId)
  sessionStorage.setItem(CLAIMED_SHIFTS_KEY, JSON.stringify(filtered))
  console.log('🗑️ Removed claimed shift:', shiftId, 'Total:', filtered.length)
}

/**
 * Get all claimed shift IDs from sessionStorage
 */
export function getClaimedShiftIds(): string[] {
  try {
    const stored = sessionStorage.getItem(CLAIMED_SHIFTS_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch {
    return []
  }
}

/**
 * Clear all claimed shifts from sessionStorage
 */
export function clearClaimedShifts(): void {
  sessionStorage.removeItem(CLAIMED_SHIFTS_KEY)
  console.log('🗑️ Cleared all claimed shifts')
}

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

// Check if a shift status indicates it's already confirmed (APPROVED or PENDING_APPROVAL)
function isConfirmedStatus(status?: string): boolean {
  if (!status) return false
  const upperStatus = status.toUpperCase()
  return upperStatus === 'APPROVED' || upperStatus === 'PENDING_APPROVAL'
}

// Transform n8n format (shiftsByDate) to WinterPlan format
function _transformN8nToWinterPlan(data: N8nData, professionalId: string): WinterPlan {
  const monthsMap = new Map<string, Map<string, Shift[]>>()
  // Track confirmed slots per day: Map<date, Set<label>>
  const confirmedSlots = new Map<string, Set<string>>()
  
  // First pass: identify all confirmed shifts and their slots
  data.shiftsByDate.forEach(({ date, shifts }) => {
    shifts.forEach(shift => {
      if (isConfirmedStatus(shift.status)) {
        if (!confirmedSlots.has(date)) {
          confirmedSlots.set(date, new Set())
        }
        confirmedSlots.get(date)!.add(getShiftLabel(shift))
      }
    })
  })
  
  // Second pass: process all shifts
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
      
      const shiftLabel = getShiftLabel(shift)
      const isConfirmed = isConfirmedStatus(shift.status)
      
      // Skip available shifts in slots that already have a confirmed shift
      if (!isConfirmed && confirmedSlots.has(date) && confirmedSlots.get(date)!.has(shiftLabel)) {
        console.log(`⏭️ Skipping shift ${shift.id} - slot ${shiftLabel} on ${date} already has a confirmed shift`)
        return
      }
      
      const shiftStatus: Shift['status'] = isConfirmed ? 'confirmed' : 'pending'
      
      daysMap.get(date)!.push({
        id: String(shift.id),
        label: shiftLabel,
        startTime: shift.localStartTime,
        endTime: shift.localFinishTime,
        facilityName: shift.facility.name,
        unit: shift.unit || shift.specialization?.displayText || '',
        field: shift.specialization?.displayText || '',
        status: shiftStatus,
        price: shift.shiftTotalPay
      })
      
      // Log confirmed shifts
      if (isConfirmed) {
        console.log(`✅ Confirmed shift: ${shift.id} (${shiftLabel}) on ${date} - status: ${shift.status}`)
      }
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

// ============================================
// New Availability API Functions
// ============================================

/**
 * Map shiftTimeInDay to label
 */
function mapTimeInDayToLabel(timeInDay: string): string {
  switch (timeInDay.toUpperCase()) {
    case 'MORNING_SHIFT': return 'TM'
    case 'AFTERNOON_SHIFT': return 'TT'
    case 'NIGHT_SHIFT': return 'TN'
    default: return 'TM'
  }
}

/**
 * Extract time from UTC date string (returns HH:MM in local time)
 */
function extractTimeFromUtc(utcString: string): string {
  const date = new Date(utcString)
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })
}

/**
 * Extract date from UTC date string (returns YYYY-MM-DD)
 */
function extractDateFromUtc(utcString: string): string {
  const date = new Date(utcString)
  return date.toISOString().split('T')[0]
}

/**
 * Transform availability API response to WinterPlan format
 */
function transformAvailabilityToWinterPlan(
  data: AvailabilityApiResponse,
  professionalId: string
): WinterPlan {
  const monthsMap = new Map<string, Map<string, Shift[]>>()
  
  // Process availability slots - create placeholder shifts for available slots
  data.availability.forEach(slot => {
    const month = slot.date.substring(0, 7) // YYYY-MM
    
    if (!monthsMap.has(month)) {
      monthsMap.set(month, new Map())
    }
    
    const daysMap = monthsMap.get(month)!
    if (!daysMap.has(slot.date)) {
      daysMap.set(slot.date, [])
    }
    
    const shifts = daysMap.get(slot.date)!
    
    // Add available slots as pending shifts
    if (slot.day) {
      shifts.push({
        id: `avail_${slot.date}_TM`,
        label: 'TM',
        startTime: '07:00',
        endTime: '14:00',
        facilityName: 'Disponible',
        unit: '',
        field: '',
        status: 'pending',
        price: 0
      })
    }
    
    if (slot.evening) {
      shifts.push({
        id: `avail_${slot.date}_TT`,
        label: 'TT',
        startTime: '14:00',
        endTime: '21:00',
        facilityName: 'Disponible',
        unit: '',
        field: '',
        status: 'pending',
        price: 0
      })
    }
    
    if (slot.night) {
      shifts.push({
        id: `avail_${slot.date}_TN`,
        label: 'TN',
        startTime: '21:00',
        endTime: '07:00',
        facilityName: 'Disponible',
        unit: '',
        field: '',
        status: 'pending',
        price: 0
      })
    }
  })
  
  // Process shift claims - these are actual shifts
  data.shiftClaims.forEach(claim => {
    const date = extractDateFromUtc(claim.startTimeUtc)
    const month = date.substring(0, 7)
    const label = mapTimeInDayToLabel(claim.shiftTimeInDay)
    
    if (!monthsMap.has(month)) {
      monthsMap.set(month, new Map())
    }
    
    const daysMap = monthsMap.get(month)!
    if (!daysMap.has(date)) {
      daysMap.set(date, [])
    }
    
    const shifts = daysMap.get(date)!
    
    // Remove placeholder for this slot if exists
    const placeholderIndex = shifts.findIndex(
      s => s.id.startsWith('avail_') && s.label === label
    )
    if (placeholderIndex !== -1) {
      shifts.splice(placeholderIndex, 1)
    }
    
    // Determine status based on claim status
    let status: Shift['status'] = 'pending'
    const upperStatus = claim.status.toUpperCase()
    if (upperStatus === 'APPROVED' || upperStatus === 'PENDING_APPROVAL') {
      status = 'confirmed'
    } else if (upperStatus === 'CLAIMED') {
      status = 'claimed'
    } else if (upperStatus === 'REJECTED') {
      status = 'rejected'
    }
    
    shifts.push({
      id: claim.shiftId,
      label,
      startTime: extractTimeFromUtc(claim.startTimeUtc),
      endTime: extractTimeFromUtc(claim.endTimeUtc),
      facilityName: claim.livoUnit || 'Hospital',
      unit: claim.livoUnit,
      field: claim.livoField,
      status,
      price: claim.totalPay
    })
  })
  
  // Convert maps to arrays and sort
  const months = Array.from(monthsMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, daysMap]) => ({
      month,
      days: Array.from(daysMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, shifts]) => ({
          date,
          shifts: shifts
            .filter(s => s.status !== 'rejected')
            .sort((a, b) => {
              // Sort by label order: TM, TT, TN
              const order = { 'TM': 0, 'TT': 1, 'TN': 2 }
              return (order[a.label as keyof typeof order] || 0) - (order[b.label as keyof typeof order] || 0)
            })
        }))
        .filter(day => day.shifts.length > 0)
    }))
  
  return {
    professionalId,
    status: 'ready',
    generatedAt: new Date().toISOString(),
    months
  }
}

// Fixed date range for Winter Plan (Dec 2025 - Jan 2026)
const WINTER_PLAN_START_DATE = '2025-12-01'
const WINTER_PLAN_END_DATE = '2026-01-31'

/**
 * Fetch available shifts from the API
 * GET /professional/winter-plan/available-shifts
 * 
 * @param userId - Encoded professional ID from URL (required)
 * @returns AvailableShiftsResponse with shiftsByDate array
 */
export async function fetchAvailableShifts(userId: string): Promise<AvailableShiftsResponse> {
  const params = new URLSearchParams({ userId })
  const url = `${AVAILABILITY_API_BASE_URL}/professional/winter-plan/available-shifts?${params}`
  
  console.log('🌐 Fetching available shifts from:', url)
  console.log('📋 Using userId (encodedId):', userId)
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details')
      console.error('❌ API Error:', response.status, response.statusText, errorText)
      throw new Error(`Failed to fetch available shifts: ${response.status} ${response.statusText}`)
    }
    
    const data: AvailableShiftsResponse = await response.json()
    
    console.log('📥 Available shifts API response:', {
      totalDates: data.shiftsByDate?.length || 0,
      totalShifts: data.shiftsByDate?.reduce((acc, d) => acc + (d.shifts?.length || 0), 0) || 0
    })
    
    // Store raw data in sessionStorage for potential future use
    sessionStorage.setItem('available_shifts_api_data', JSON.stringify(data))
    
    return data
  } catch (error) {
    console.error('❌ Fetch available shifts error:', error)
    throw error
  }
}

/**
 * Transform available shifts to WinterPlan format for calendar display
 * @param data - Available shifts response from API
 * @param professionalId - User ID for WinterPlan
 */
export function transformAvailableShiftsToWinterPlan(
  data: AvailableShiftsResponse,
  professionalId: string
): WinterPlan {
  const monthsMap = new Map<string, Map<string, Shift[]>>()
  
  data.shiftsByDate.forEach(({ date, shifts }) => {
    if (!shifts || shifts.length === 0) return
    
    const month = date.substring(0, 7) // YYYY-MM
    
    if (!monthsMap.has(month)) {
      monthsMap.set(month, new Map())
    }
    
    const daysMap = monthsMap.get(month)!
    if (!daysMap.has(date)) {
      daysMap.set(date, [])
    }
    
    const dayShifts = daysMap.get(date)!
    
    shifts.forEach(shift => {
      // Determine shift label based on shiftTimeInDay
      let label = 'TM'
      if (shift.shiftTimeInDay) {
        switch (shift.shiftTimeInDay) {
          case 'MORNING_SHIFT':
          case 'DAY_SHIFT':
            label = 'TM'
            break
          case 'AFTERNOON_SHIFT':
          case 'EVENING_SHIFT':
            label = 'TT'
            break
          case 'NIGHT_SHIFT':
            label = 'TN'
            break
        }
      } else if (shift.localStartTime) {
        // Fallback: determine from start time
        const hour = parseInt(shift.localStartTime.split(':')[0])
        if (hour >= 7 && hour < 14) label = 'TM'
        else if (hour >= 14 && hour < 21) label = 'TT'
        else label = 'TN'
      }
      
      // Determine status
      let status: Shift['status'] = 'pending'
      if (shift.status) {
        switch (shift.status) {
          case 'APPROVED':
          case 'PENDING_APPROVAL':
            status = 'confirmed'
            break
          case 'CLAIMED':
            status = 'claimed'
            break
          case 'REJECTED':
            status = 'rejected'
            break
          default:
            status = 'pending'
        }
      }
      
      // Get raw values and translate them
      const rawUnit = shift.unit || shift.livoUnit || shift.specialization?.displayText || ''
      const rawField = shift.professionalField || shift.specialization?.name || ''
      
      dayShifts.push({
        id: String(shift.id),
        label,
        startTime: shift.localStartTime || '',
        endTime: shift.localFinishTime || '',
        facilityName: shift.facility.name,
        unit: translateUnit(rawUnit),
        field: translateField(rawField),
        status,
        price: shift.shiftTotalPay || 0
      })
    })
  })
  
  // Convert maps to arrays and sort
  const months = Array.from(monthsMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, daysMap]) => ({
      month,
      days: Array.from(daysMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, shifts]) => ({
          date,
          shifts: shifts
            .filter(s => s.status !== 'rejected')
            .sort((a, b) => {
              const order = { 'TM': 0, 'TT': 1, 'TN': 2 }
              return (order[a.label as keyof typeof order] || 0) - (order[b.label as keyof typeof order] || 0)
            })
        }))
        .filter(day => day.shifts.length > 0)
    }))
  
  return {
    professionalId,
    status: 'ready',
    generatedAt: new Date().toISOString(),
    months
  }
}

// Re-export types for use in components
export type { AvailableShiftsResponse, AvailableShift, AvailableShiftsByDate }

/**
 * Fetch availability from the new API
 * Uses the encodedId from URL as userId
 * Fixed date range: Dec 2025 - Jan 2026
 * 
 * @param userId - Encoded professional ID from URL (required)
 */
export async function fetchAvailability(userId: string): Promise<WinterPlan> {
  const params = new URLSearchParams({ 
    userId,
    startDate: WINTER_PLAN_START_DATE,
    endDate: WINTER_PLAN_END_DATE
  })
  
  const url = `${AVAILABILITY_API_BASE_URL}/professional/winter-plan/availability?${params}`
  
  console.log('🌐 Fetching availability from:', url)
  console.log('📋 Using userId (encodedId):', userId)
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      // Don't set Content-Type for GET requests - it triggers CORS preflight
      headers: {
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details')
      console.error('❌ API Error:', response.status, response.statusText, errorText)
      throw new Error(`Failed to fetch availability: ${response.status} ${response.statusText}`)
    }
    
    const data: AvailabilityApiResponse = await response.json()
    
    console.log('📥 Availability API response:', {
      availabilityCount: data.availability?.length || 0,
      shiftClaimsCount: data.shiftClaims?.length || 0
    })
    
    // Store raw data in sessionStorage for potential future use
    sessionStorage.setItem('availability_api_data', JSON.stringify(data))
    
    return transformAvailabilityToWinterPlan(data, userId)
  } catch (error) {
    console.error('❌ Fetch error (possibly CORS):', error)
    throw error
  }
}

// Transform API response to WinterPlan format (legacy format)
function _transformShiftsToWinterPlan(shiftsResponse: ShiftDetailsResponse[], professionalId: string): WinterPlan {
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

export async function getWinterPlan(professionalId: string, _month?: string): Promise<WinterPlan> {
  if (USE_MOCKS) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return buildMockWinterPlan()
  }
  
  // Use the available-shifts API to get real shift data
  console.log('🌐 Calling available-shifts API with userId:', professionalId)
  const availableShiftsData = await fetchAvailableShifts(professionalId)
  
  // Store the raw data for use in getShiftDetails
  sessionStorage.setItem(AVAILABLE_SHIFTS_STORAGE_KEY, JSON.stringify(availableShiftsData))
  
  return transformAvailableShiftsToWinterPlan(availableShiftsData, professionalId)
}

/**
 * Get stored available shifts data from sessionStorage
 */
function getStoredAvailableShiftsData(): AvailableShiftsResponse | null {
  try {
    const stored = sessionStorage.getItem(AVAILABLE_SHIFTS_STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored)
  } catch (error) {
    console.error('❌ Error reading stored available shifts:', error)
    return null
  }
}

export async function getShiftDetails(shiftId: string): Promise<ShiftDetails> {
  if (USE_MOCKS) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { ...mockShiftDetails, id: shiftId }
  }
  
  // First, try to find in stored available-shifts data (from new API)
  const availableShiftsData = getStoredAvailableShiftsData()
  if (availableShiftsData) {
    await new Promise(resolve => setTimeout(resolve, 100)) // Simulate network delay
    
    for (const dayData of availableShiftsData.shiftsByDate) {
      const found = dayData.shifts?.find(s => String(s.id) === shiftId)
      if (found) {
        console.log('📦 Using stored available-shifts data for:', shiftId)
        
        // Parse payment breakdown to extract bonus if present
        let facilityAmount = found.shiftTotalPay || 0
        let bonusAmount = 0
        
        if (found.paymentBreakdown && found.paymentBreakdown.length > 0) {
          found.paymentBreakdown.forEach(item => {
            const amount = parseFloat(item.amount.replace(/[^0-9.-]+/g, '')) || 0
            if (item.label.toLowerCase().includes('bonus') || item.label.toLowerCase().includes('livo')) {
              bonusAmount = amount
            } else {
              facilityAmount = amount
            }
          })
        }
        
        // Get raw values and translate them
        const rawUnit = found.unit || found.livoUnit || found.specialization?.displayText || ''
        const rawField = found.professionalField || found.specialization?.name || ''
        
        // Transform AvailableShift to ShiftDetails format
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
            shiftGuidanceDocumentUrl: found.facility.shiftGuidanceDocumentUrl,
            allowInternalProsToCancelApprovedClaims: found.facility.allowInternalProsToCancelApprovedClaims,
            images: {
              logo: found.facility.logo,
              banner: found.facility.banner
            }
          },
          unit: translateUnit(rawUnit),
          field: translateField(rawField),
          date: dayData.date,
          startTime: found.localStartTime,
          endTime: found.localFinishTime,
          remuneration: {
            facilityAmount: facilityAmount,
            bonusAmount: bonusAmount,
            currency: found.currency || 'EUR',
            total: found.shiftTotalPay || 0
          },
          tags: {
            parking: found.tags?.includes('parking') || found.perks?.some(p => p.label?.displayText?.toLowerCase().includes('parking')) || false,
            food: found.tags?.includes('food') || found.perks?.some(p => p.label?.displayText?.toLowerCase().includes('dieta')) || false,
            cafeteria: found.tags?.includes('cafeteria') || found.perks?.some(p => p.label?.displayText?.toLowerCase().includes('cafetería')) || false,
            casiopea: found.tags?.includes('casiopea') || found.perks?.some(p => p.label?.displayText?.toLowerCase().includes('casiopea')) || false
          },
          description: found.details || ''
        }
      }
    }
  }
  
  // Fallback: try to find in legacy stored shifts data
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
          
          // Get raw values and translate them
          const rawUnitN8n = found.unit || found.specialization?.displayText || ''
          const rawFieldN8n = found.specialization?.displayText || ''
          
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
            unit: translateUnit(rawUnitN8n),
            field: translateField(rawFieldN8n),
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

export async function claimShift(shiftId: string, _professionalId: string): Promise<{ status: string; claimId: string }> {
  // Local only - no API call, just update local state and persist
  await new Promise(resolve => setTimeout(resolve, 100)) // Small delay for UX
  updateShiftStatus(shiftId, 'claimed')
  saveClaimedShift(shiftId) // Persist to sessionStorage
  return { status: 'success', claimId: `claim_${Date.now()}` }
}

/**
 * Unclaim a shift (remove from claimed list)
 */
export function unclaimShift(shiftId: string): void {
  updateShiftStatus(shiftId, 'pending')
  removeClaimedShift(shiftId)
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
  
  const response = await fetch(`${API_BASE_URL}/shifts/${shiftId}/feedback`, {
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
  
  const response = await fetch(`${API_BASE_URL}/cancellation-policies/${policyId}`, {
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
 * Sends userId and array of shift IDs that have been claimed
 * 
 * @param userId - Encoded user ID (professionalId)
 * @param shiftIds - Array of shift IDs that have been claimed
 * @returns Success status
 */
export async function sendCompletedPlan(
  userId: string,
  shiftIds: string[]
): Promise<{ status: string }> {
  const WEBHOOK_URL = 'https://livomarketing.app.n8n.cloud/webhook/104d7026-2f4f-4f50-b427-1f129f060fa6'
  
  const payload = {
    userId,
    shiftIds
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
