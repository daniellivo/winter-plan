import type { WinterPlan } from '../types/winterPlan'
import type { AvailabilitySlot, ShiftClaim } from './winterPlan'
import { getClaimedShiftIds } from './winterPlan'

// Webhook URL for tracking events
const TRACKING_WEBHOOK_URL = 'https://livomarketing.app.n8n.cloud/webhook/981394b5-166b-4ecd-ad13-340406449379'

/**
 * Tracking event payload structure
 */
export interface TrackingEvent {
  encodedUserId: string        // professionalId from URL
  action: string               // Event name: page_enter, view_plan_click, save_availability, submit_shifts
  timestamp: string           // ISO timestamp
  availableDaysCount: number   // Days with at least 1 slot available
  availableSlotsCount: number  // Total slots (TM+TT+TN) available
  offeredShiftsCount: number   // Shifts offered to the nurse
  reservedShiftsCount: number // Shifts already confirmed in the app
  selectedShiftsIds?: string[] // IDs of selected shifts (only for submit_shifts)
}

/**
 * Calculate available days count from availability array
 * Counts unique days where at least one slot (day, evening, or night) is true
 */
export function calculateAvailableDaysCount(availability: AvailabilitySlot[]): number {
  const availableDays = new Set<string>()
  availability.forEach(slot => {
    if (slot.day || slot.evening || slot.night) {
      availableDays.add(slot.date)
    }
  })
  return availableDays.size
}

/**
 * Calculate total available slots count
 * Sums all true values for day, evening, and night across all availability slots
 */
export function calculateAvailableSlotsCount(availability: AvailabilitySlot[]): number {
  return availability.reduce((count, slot) => {
    if (slot.day) count++
    if (slot.evening) count++
    if (slot.night) count++
    return count
  }, 0)
}

/**
 * Calculate offered shifts count from plan
 * Counts all shifts with status 'pending' (offered but not yet claimed)
 */
export function calculateOfferedShiftsCount(plan: WinterPlan | null): number {
  if (!plan) return 0
  
  let count = 0
  plan.months.forEach(month => {
    month.days.forEach(day => {
      day.shifts.forEach(shift => {
        if (shift.status === 'pending') {
          count++
        }
      })
    })
  })
  return count
}

/**
 * Calculate reserved shifts count
 * Counts shifts that are already confirmed (status 'confirmed' or from shiftClaims)
 */
export function calculateReservedShiftsCount(
  plan: WinterPlan | null,
  shiftClaims: ShiftClaim[]
): number {
  // Count from shiftClaims (these are confirmed shifts from API)
  if (shiftClaims.length > 0) {
    return shiftClaims.length
  }
  
  // Fallback: count from plan shifts with status 'confirmed'
  if (!plan) return 0
  
  let count = 0
  plan.months.forEach(month => {
    month.days.forEach(day => {
      day.shifts.forEach(shift => {
        if (shift.status === 'confirmed') {
          count++
        }
      })
    })
  })
  return count
}

/**
 * Get selected shifts IDs from sessionStorage
 */
export function getSelectedShiftsIds(): string[] {
  return getClaimedShiftIds()
}

/**
 * Calculate all metrics for tracking event
 */
export function calculateTrackingMetrics(
  plan: WinterPlan | null,
  availability: AvailabilitySlot[],
  shiftClaims: ShiftClaim[]
): {
  availableDaysCount: number
  availableSlotsCount: number
  offeredShiftsCount: number
  reservedShiftsCount: number
} {
  return {
    availableDaysCount: calculateAvailableDaysCount(availability),
    availableSlotsCount: calculateAvailableSlotsCount(availability),
    offeredShiftsCount: calculateOfferedShiftsCount(plan),
    reservedShiftsCount: calculateReservedShiftsCount(plan, shiftClaims)
  }
}

/**
 * Send tracking event to webhook
 */
export async function sendTrackingEvent(
  encodedUserId: string,
  action: string,
  plan: WinterPlan | null,
  availability: AvailabilitySlot[],
  shiftClaims: ShiftClaim[],
  includeSelectedShifts: boolean = false
): Promise<void> {
  const metrics = calculateTrackingMetrics(plan, availability, shiftClaims)
  
  const payload: TrackingEvent = {
    encodedUserId,
    action,
    timestamp: new Date().toISOString(),
    availableDaysCount: metrics.availableDaysCount,
    availableSlotsCount: metrics.availableSlotsCount,
    offeredShiftsCount: metrics.offeredShiftsCount,
    reservedShiftsCount: metrics.reservedShiftsCount
  }
  
  // Only include selected shifts for submit_shifts action
  if (includeSelectedShifts) {
    payload.selectedShiftsIds = getSelectedShiftsIds()
  }
  
  console.log('📊 Sending tracking event:', payload)
  
  try {
    await fetch(TRACKING_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true
    })
    console.log('✅ Tracking event sent successfully')
  } catch (error) {
    console.error('❌ Failed to send tracking event:', error)
    // Don't throw - tracking failures shouldn't break the app
  }
}

