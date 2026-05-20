import { useState, useEffect, useCallback } from 'react'
import { IconHeadset, IconCheck, IconChevronLeft } from '@tabler/icons-react'
import Calendar from '../components/Calendar/Calendar'
import MonthSelector from '../components/Calendar/MonthSelector'
import ShiftListModal from '../components/ShiftCard/ShiftListModal'
import AvailabilityPopup from '../components/AvailabilityPopup'
import AvailabilitySelector from '../components/AvailabilitySelector'
import SummerEarlyAccessPopup from '../components/SummerEarlyAccessPopup'
import { getWinterPlan, claimShift, unclaimShift, claimShiftsToApi, getClaimedShiftIds, clearClaimedShifts, getRejectedSlots, getRejectedShiftIds, fetchProfessionalAvailability, updateAvailability, type AvailabilityUpdate } from '../api/winterPlan'
import { upsertSummerPlanning, type SummerPlanningRow } from '../config/supabase'
import { useFirebaseShifts } from '../hooks/useFirebaseShifts'
import { useAppContext } from '../App'
import { useAppNavigation } from '../hooks/useAppNavigation'
import { sendTrackingEvent } from '../api/tracking'
import type { WinterPlan, Shift } from '../types/winterPlan'
import type { AvailabilitySlot, ShiftClaim } from '../api/winterPlan'

// Webhook for tracking "Add availability" button clicks
const ADD_AVAILABILITY_WEBHOOK_URL = 'https://livomarketing.app.n8n.cloud/webhook/981394b5-166b-4ecd-ad13-340406449379'

interface WinterPlanCalendarProps {
  variant?: 'winter' | 'summer'
  locationLabel?: string
  // List of valid per-day slot combinations. When provided, clicking a date toggles
  // the active slot in/out of the date's set and snaps to the active slot only if
  // the resulting set is not in this list.
  allowedCombinations?: string[][]
  // Center + specialty identifiers persisted alongside each availability row.
  center?: string
  specialty?: string
}

const SLOT_LABEL_ES: Record<string, string> = {
  DAY: 'Mañana',
  EVENING: 'Tarde',
  NIGHT: 'Noche',
}

function describeCombination(combo: string[]): string {
  const order = ['DAY', 'EVENING', 'NIGHT']
  const sorted = [...combo].sort((a, b) => order.indexOf(a) - order.indexOf(b))
  if (sorted.length === 1) return `Solo ${SLOT_LABEL_ES[sorted[0]].toLowerCase()}`
  if (sorted.length === 3) return 'Todo el día'
  return sorted.map(s => SLOT_LABEL_ES[s].toLowerCase()).join(' y ').replace(/^./, c => c.toUpperCase())
}

function isCombinationAllowed(slots: Set<string>, allowed: string[][]): boolean {
  if (slots.size === 0) return true
  return allowed.some(combo =>
    combo.length === slots.size && combo.every(s => slots.has(s))
  )
}

export default function WinterPlanCalendar({
  variant = 'winter',
  locationLabel = 'Hospitalización de Teknon',
  allowedCombinations,
  center,
  specialty,
}: WinterPlanCalendarProps = {}) {
  const isSummer = variant === 'summer'
  const navigate = useAppNavigation()
  const { professionalId } = useAppContext()

  const headerTitle = isSummer ? '🏖️ Tu Plan de Verano 🏖️' : '🎄 Tu Plan de Turnos 🎄'
  // Summer: June (5) – September (8) 2026. Winter: December 2025 – January 2026.
  const initialMonth = isSummer ? 5 : 11
  const initialYear = isSummer ? 2026 : 2025

  const [plan, setPlan] = useState<WinterPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [currentMonth, setCurrentMonth] = useState(initialMonth)
  const [currentYear, setCurrentYear] = useState(initialYear)
  
  // Modal state
  const [selectedShifts, setSelectedShifts] = useState<Shift[] | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  
  // Plan completion state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  
  // Rejected slots state (array of "YYYY-MM-DD-TM" format strings)
  const [rejectedSlots, setRejectedSlots] = useState<string[]>(() => getRejectedSlots())
  
  // Rejected individual shift IDs
  const [rejectedShiftIds, setRejectedShiftIds] = useState<string[]>(() => getRejectedShiftIds())

  // Availability and shift claims state
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
  const [shiftClaims, setShiftClaims] = useState<ShiftClaim[]>([])

  // Popup state
  const [showAvailabilityPopup, setShowAvailabilityPopup] = useState(false)
  const [availableDaysCount, setAvailableDaysCount] = useState(0)

  // Availability editor state — opens by default in summer flow
  const [showAvailabilityEditor, setShowAvailabilityEditor] = useState(isSummer)

  // Summer-only early access FOMO popup — shows on every mount
  const [showSummerPopup, setShowSummerPopup] = useState(isSummer)

  // Summer success screen — shown after a successful "Guardar cambios"
  const [showSummerSuccess, setShowSummerSuccess] = useState(false)
  const [activeSlot, setActiveSlot] = useState<'all' | 'day' | 'evening' | 'night' | 'delete' | null>(null)
  const [pendingSlotsByDate, setPendingSlotsByDate] = useState<Map<string, Set<string>>>(new Map())
  const [isSavingAvailability, setIsSavingAvailability] = useState(false)

  // Firebase real-time listener
  const { 
    winterPlan: firebasePlan, 
    loading: firebaseLoading, 
    isConnected: firebaseConnected
  } = useFirebaseShifts(professionalId)

  // Apply claimed shifts from sessionStorage to a plan
  const applyClaimedShiftsToPlan = useCallback((planData: WinterPlan): WinterPlan => {
    const claimedIds = getClaimedShiftIds()
    if (claimedIds.length === 0) return planData
    
    console.log('📦 Applying claimed shifts from storage:', claimedIds)
    
    return {
      ...planData,
      months: planData.months.map(month => ({
        ...month,
        days: month.days.map(day => ({
          ...day,
          shifts: day.shifts.map(shift => 
            claimedIds.includes(shift.id) 
              ? { ...shift, status: 'claimed' as const }
              : shift
          )
        }))
      }))
    }
  }, [])

  const loadPlan = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      // Call both APIs in parallel
      const [planData, availabilityData] = await Promise.all([
        getWinterPlan(professionalId),
        fetchProfessionalAvailability(professionalId).catch(err => {
          console.error('Failed to fetch availability:', err)
          return { availability: [], shiftClaims: [] }
        })
      ])
      // Apply any claimed shifts from sessionStorage
      const planWithClaimed = applyClaimedShiftsToPlan(planData)
      setPlan(planWithClaimed)
      // Set availability and shiftClaims
      setAvailability(availabilityData.availability || [])
      setShiftClaims(availabilityData.shiftClaims || [])
    } catch {
      setError('No pudimos cargar tu plan. Por favor, inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [professionalId, applyClaimedShiftsToPlan])

  // Load initial data if Firebase is not connected
  useEffect(() => {
    if (!firebaseConnected) {
      loadPlan()
    }
  }, [loadPlan, firebaseConnected])

  // Use Firebase data when available (real-time updates)
  useEffect(() => {
    if (firebasePlan) {
      console.log('🔥 Using Firebase real-time data')
      // Apply any claimed shifts from sessionStorage
      const planWithClaimed = applyClaimedShiftsToPlan(firebasePlan)
      setPlan(planWithClaimed)
      setLoading(false)
    }
  }, [firebasePlan, applyClaimedShiftsToPlan])

  // Check if popup should be shown based on availability count
  useEffect(() => {
    // Don't show popup while still loading
    if (loading || firebaseLoading) return
    
    // Count unique days with availability (where day, evening, or night is true)
    // If availability array is empty, count will be 0
    const availableDays = new Set<string>()
    availability.forEach(slot => {
      if (slot.day || slot.evening || slot.night) {
        availableDays.add(slot.date)
      }
    })
    
    const count = availableDays.size
    setAvailableDaysCount(count)
    
    // Check if popup was dismissed in this session
    const popupDismissed = sessionStorage.getItem('availability_popup_dismissed') === 'true'
    
    // Show popup if less than 10 days available (including 0) and not dismissed.
    // Summer flow opens the editor directly, so skip the suggestion popup.
    if (count < 10 && !popupDismissed && !isSummer) {
      setShowAvailabilityPopup(true)
    }
  }, [availability, loading, firebaseLoading, isSummer])

  const handleClosePopup = () => {
    setShowAvailabilityPopup(false)
    sessionStorage.setItem('availability_popup_dismissed', 'true')
  }

  const handleAddAvailability = () => {
    // Close the availability popup if it's open
    setShowAvailabilityPopup(false)
    sessionStorage.setItem('availability_popup_dismissed', 'true')
    // Open the availability editor
    setShowAvailabilityEditor(true)
    setActiveSlot(null)
    setPendingSlotsByDate(new Map())
  }

  const handleCancelAvailabilityEditor = () => {
    setShowAvailabilityEditor(false)
    setActiveSlot(null)
    setPendingSlotsByDate(new Map())
  }

  const handleDayClick = (date: string, shifts: Shift[]) => {
    // If in availability editor mode and a slot is active, apply slot to date
    if (showAvailabilityEditor && activeSlot) {
      setPendingSlotsByDate(prev => {
        const newMap = new Map(prev)

        if (activeSlot === 'delete') {
          newMap.set(date, new Set())
          return newMap
        }

        const slotMap: Record<string, string[]> = {
          'all': ['DAY', 'EVENING', 'NIGHT'],
          'day': ['DAY'],
          'evening': ['EVENING'],
          'night': ['NIGHT'],
        }
        const slotsToApply = slotMap[activeSlot]

        if (!allowedCombinations) {
          // Legacy behavior: replace whatever was there
          newMap.set(date, new Set(slotsToApply))
          return newMap
        }

        // Combine behavior: toggle the active slot against the date's effective state
        // (pending edit if it exists, otherwise the saved availability).
        const baseSlots = newMap.has(date)
          ? new Set(newMap.get(date)!)
          : (() => {
              const existing = availability.find(s => s.date === date)
              const set = new Set<string>()
              if (existing?.day) set.add('DAY')
              if (existing?.evening) set.add('EVENING')
              if (existing?.night) set.add('NIGHT')
              return set
            })()

        if (activeSlot === 'all') {
          const candidate = new Set(slotsToApply)
          newMap.set(date, isCombinationAllowed(candidate, allowedCombinations)
            ? candidate
            : new Set(slotsToApply))
          return newMap
        }

        const slot = slotsToApply[0]
        if (baseSlots.has(slot)) {
          baseSlots.delete(slot)
        } else {
          baseSlots.add(slot)
        }

        if (isCombinationAllowed(baseSlots, allowedCombinations)) {
          newMap.set(date, baseSlots)
        } else {
          // Resulting combo isn't valid — snap to just the slot we just clicked
          newMap.set(date, new Set([slot]))
        }
        return newMap
      })
      return
    }

    // Normal mode: navigate to shift details
    if (shifts.length === 1) {
      navigate(`/shifts/${shifts[0].id}`)
    } else if (shifts.length > 1) {
      setSelectedShifts(shifts)
      setSelectedDate(date)
    }
  }

  const handleSlotSelect = (slotType: 'all' | 'day' | 'evening' | 'night' | 'delete') => {
    setActiveSlot(slotType)
  }

  const handleSaveAvailability = async () => {
    if (isSavingAvailability) return

    // If no changes, just close the editor
    if (pendingSlotsByDate.size === 0) {
      handleCancelAvailabilityEditor()
      return
    }

    try {
      setIsSavingAvailability(true)

      // Create a map of current availability for quick lookup
      const currentAvailabilityMap = new Map<string, { day: boolean, evening: boolean, night: boolean }>()
      availability.forEach(slot => {
        currentAvailabilityMap.set(slot.date, {
          day: slot.day,
          evening: slot.evening,
          night: slot.night
        })
      })

      // Build addedSlots and removedSlots by comparing pending with current
      const addedSlotsMap = new Map<string, Set<string>>()
      const removedSlotsMap = new Map<string, Set<string>>()

      pendingSlotsByDate.forEach((pendingSlots, date) => {
        const current = currentAvailabilityMap.get(date) || { day: false, evening: false, night: false }
        const currentSlots = new Set<string>()
        if (current.day) currentSlots.add('DAY')
        if (current.evening) currentSlots.add('EVENING')
        if (current.night) currentSlots.add('NIGHT')

        // If pendingSlots is empty, remove all current slots
        if (pendingSlots.size === 0) {
          if (currentSlots.size > 0) {
            removedSlotsMap.set(date, currentSlots)
          }
        } else {
          // Find slots to add (in pending but not in current)
          const toAdd = new Set<string>()
          pendingSlots.forEach(slot => {
            if (!currentSlots.has(slot)) {
              toAdd.add(slot)
            }
          })
          if (toAdd.size > 0) {
            addedSlotsMap.set(date, toAdd)
          }

          // Find slots to remove (in current but not in pending)
          const toRemove = new Set<string>()
          currentSlots.forEach(slot => {
            if (!pendingSlots.has(slot)) {
              toRemove.add(slot)
            }
          })
          if (toRemove.size > 0) {
            removedSlotsMap.set(date, toRemove)
          }
        }
      })

      // Convert maps to arrays - always include both arrays (can be empty)
      const addedSlots = Array.from(addedSlotsMap.entries())
        .map(([date, slots]) => ({
          date,
          slots: Array.from(slots)
        }))

      const removedSlots = Array.from(removedSlotsMap.entries())
        .map(([date, slots]) => ({
          date,
          slots: Array.from(slots)
        }))

      // Always make API call with both arrays (can be empty)
      // Format matches API spec: both arrays are always present, even if empty
      const payload: AvailabilityUpdate = {
        professionalId,
        addedSlots: addedSlots.length > 0 ? addedSlots : [],
        removedSlots: removedSlots.length > 0 ? removedSlots : []
      }

      await updateAvailability(payload).catch(() => {
        // Silently ignore errors as per spec
      })

      // Send webhook with modified availability data
      const availabilityArray = Array.from(pendingSlotsByDate.entries()).map(([date, pendingSlots]) => {
        return {
          date,
          TM: pendingSlots.has('DAY'),
          TT: pendingSlots.has('EVENING'),
          TN: pendingSlots.has('NIGHT')
        }
      })

      const webhookPayload = {
        encodedId: professionalId,
        timestamp: new Date().toISOString(),
        center: center ?? null,
        specialty: specialty ?? null,
        availability: availabilityArray
      }

      console.log('🚀 Sending save availability webhook:', webhookPayload)

      fetch(ADD_AVAILABILITY_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
        keepalive: true
      })
        .then(() => console.log('✅ Save availability webhook sent'))
        .catch((error) => console.error('❌ Failed to send save availability webhook:', error))

      // Persist summer planning rows in Supabase (one row per edited date)
      if (isSummer && center && specialty) {
        const supabaseRows: SummerPlanningRow[] = Array.from(pendingSlotsByDate.entries()).map(([date, slots]) => ({
          professional_id: professionalId,
          date,
          morning: slots.has('DAY'),
          evening: slots.has('EVENING'),
          night: slots.has('NIGHT'),
          center,
          specialty,
        }))
        upsertSummerPlanning(supabaseRows).catch((err) => {
          console.error('❌ Failed to upsert to Supabase:', err)
        })
      }

      // Reload availability data and available shifts
      try {
        const [availabilityData, availableShiftsData] = await Promise.all([
          fetchProfessionalAvailability(professionalId).catch(() => ({ availability: [], shiftClaims: [] })),
          getWinterPlan(professionalId).catch(() => null)
        ])
        
        const updatedAvailability = availabilityData.availability || []
        const updatedShiftClaims = availabilityData.shiftClaims || []
        
        setAvailability(updatedAvailability)
        setShiftClaims(updatedShiftClaims)
        
        let updatedPlan = null
        if (availableShiftsData) {
          updatedPlan = applyClaimedShiftsToPlan(availableShiftsData)
          setPlan(updatedPlan)
        }
        
        // Tracking is disabled in the summer flow — the n8n save webhook already carries the data
        if (!isSummer) {
          sendTrackingEvent(
            professionalId,
            'save_availability',
            updatedPlan,
            updatedAvailability,
            updatedShiftClaims
          )
        }
      } catch {
        // Silently ignore errors as per spec
      }

      // Reset editor state (always close, even on error)
      handleCancelAvailabilityEditor()

      // Summer flow ends here with a success screen
      if (isSummer) {
        setShowSummerSuccess(true)
      }
    } catch (error) {
      // Silently ignore errors as per spec
      console.error('Error saving availability:', error)
      handleCancelAvailabilityEditor()
    } finally {
      setIsSavingAvailability(false)
    }
  }
  
  // Reload rejected shift IDs from storage whenever component renders
  // This ensures we pick up any changes made in ShiftDetails page
  useEffect(() => {
    setRejectedShiftIds(getRejectedShiftIds())
  }, [plan]) // Reload when plan changes (after navigating back)

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const handleShiftSelect = (shiftId: string) => {
    closeModal()
    navigate(`/shifts/${shiftId}`)
  }

  const handleClaimFromModal = async (shiftId: string) => {
    if (!selectedShifts) return
    
    const shift = selectedShifts.find(s => s.id === shiftId)
    if (!shift) return
    
    // Toggle behavior: if already claimed, unclaim it
    if (shift.status === 'claimed') {
      // Unclaim - update state and remove from sessionStorage
      unclaimShift(shiftId)
      
      const updatedShifts = selectedShifts.map(s => 
        s.id === shiftId ? { ...s, status: 'pending' as const } : s
      )
      setSelectedShifts(updatedShifts)
      
      // Update the plan state
      if (plan) {
        const updatedPlan = {
          ...plan,
          months: plan.months.map(month => ({
            ...month,
            days: month.days.map(day => ({
              ...day,
              shifts: day.shifts.map(s => 
                s.id === shiftId ? { ...s, status: 'pending' as const } : s
              )
            }))
          }))
        }
        setPlan(updatedPlan)
      }
      return
    }
    
    // Find if there's another claimed shift in the same slot to unclaim
    const previousClaimedInSlot = selectedShifts.find(
      s => s.status === 'claimed' && s.label === shift.label && s.id !== shiftId
    )
    
    // Unclaim previous shift in same slot from sessionStorage
    if (previousClaimedInSlot) {
      unclaimShift(previousClaimedInSlot.id)
    }
    
    // Claiming a shift - saves to sessionStorage
    await claimShift(shiftId, professionalId)
    
    // Update local state immediately for better UX
    // Also unclaim any other shift in the same slot
    const updatedShifts = selectedShifts.map(s => {
      if (s.id === shiftId) {
        return { ...s, status: 'claimed' as const }
      } else if (s.status === 'claimed' && s.label === shift.label) {
        // Unclaim other shift in the same slot
        return { ...s, status: 'pending' as const }
      }
      return s
    })
    setSelectedShifts(updatedShifts)
    
    // Update the plan state directly (same as unclaim does)
    if (plan) {
      const updatedPlan = {
        ...plan,
        months: plan.months.map(month => ({
          ...month,
          days: month.days.map(day => ({
            ...day,
            shifts: day.shifts.map(s => {
              if (s.id === shiftId) {
                return { ...s, status: 'claimed' as const }
              } else if (s.status === 'claimed' && s.label === shift.label && day.date === selectedDate) {
                // Unclaim other shift in the same slot on the same day
                return { ...s, status: 'pending' as const }
              }
              return s
            })
          }))
        }))
      }
      setPlan(updatedPlan)
    }
  }

  const handleRejectFromModal = async () => {
    // Rejection is now local-only in the modal component
    // This is only called when all shifts in a slot are rejected to close the modal
    closeModal()
  }

  const closeModal = () => {
    setSelectedShifts(null)
    setSelectedDate(null)
  }

  const handleCompletePlan = async () => {
    try {
      setIsSubmitting(true)
      
      // Get claimed shift IDs from sessionStorage (source of truth)
      const shiftIdStrings = getClaimedShiftIds()
      
      if (shiftIdStrings.length === 0) {
        alert('No has seleccionado ningún turno')
        setIsSubmitting(false)
        return
      }

      // Tracking is disabled in the summer flow
      if (!isSummer) {
        sendTrackingEvent(
          professionalId,
          'submit_shifts',
          plan,
          availability,
          shiftClaims,
          true // include selected shifts IDs
        )
      }

      // Convert shift IDs to numbers for the API
      const shiftIds = shiftIdStrings.map(id => parseInt(id, 10)).filter(id => !isNaN(id))
      
      // Call the shifts-claim API endpoint
      const response = await claimShiftsToApi(professionalId, shiftIds)
      
      console.log('📥 Claim response:', response)
      
      // Clear claimed shifts after successful send
      clearClaimedShifts()
      
      // Show success message briefly
      setShowSuccessMessage(true)
      
      // Redirect to app after short delay
      setTimeout(() => {
        window.location.href = 'https://livo-385512.web.app/app/ShiftStack/Feed?tab=SHIFTS'
      }, 1500)
      
    } catch (error) {
      console.error('Error completing plan:', error)
      alert('Error al enviar el plan. Por favor, inténtalo de nuevo.')
      setIsSubmitting(false)
    }
  }

  // Count confirmed shifts from sessionStorage (source of truth)
  const confirmedCount = getClaimedShiftIds().length

  // Get current month data
  const getMonthKey = () => `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
  const currentMonthData = plan?.months.find(m => m.month === getMonthKey())

  // Navigation limits: Summer Mayo–Septiembre 2026, Winter Dic 2025–Ene 2026
  const canGoPrevious = isSummer
    ? !(currentYear === 2026 && currentMonth === 5)
    : !(currentYear === 2025 && currentMonth === 11)
  const canGoNext = isSummer
    ? !(currentYear === 2026 && currentMonth === 8)
    : !(currentYear === 2026 && currentMonth === 0)

  // Show loading state
  const isLoading = loading || (firebaseLoading && !plan)
  
  if (isLoading && !plan) {
    return (
      <div className="min-h-screen bg-white">
        <header className="sticky top-0 z-50 bg-white">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="w-10" />
            <h1 className="text-base font-semibold text-gray-900 text-center flex-1">
              {isSummer ? '🏖️ Tu Plan de Verano 🏖️' : '🎄 Aquí está tu Plan 🎄'}
            </h1>
            <div className="w-10" />
          </div>
        </header>
        <div className="px-5 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <header className="sticky top-0 z-50 bg-white">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="w-10" />
            <h1 className="text-base font-semibold text-gray-900 text-center flex-1">
              {isSummer ? '🏖️ Tu Plan de Verano 🏖️' : '🎄 Aquí está tu Plan 🎄'}
            </h1>
            <div className="w-10" />
          </div>
        </header>
        <div className="px-5 py-8 text-center">
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadPlan}
            className="px-4 py-2 bg-[#2cbeff] text-white rounded-full font-medium"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (plan?.status === 'processing' || plan?.status === 'not_started') {
    return (
      <div className="min-h-screen bg-white">
        <header className="sticky top-0 z-50 bg-white">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="w-10" />
            <h1 className="text-base font-semibold text-gray-900 text-center flex-1">
              {isSummer ? '🏖️ Tu Plan de Verano 🏖️' : '🎄 Aquí está tu Plan 🎄'}
            </h1>
            <div className="w-10" />
          </div>
        </header>
        <div className="px-5 py-12 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-[#2cbeff]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⏳</span>
            </div>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Estamos preparando tu plan
          </h2>
          <p className="text-gray-600 text-sm">
            Vuelve a intentarlo en unos minutos.
          </p>
        </div>
      </div>
    )
  }

  if (isSummer && showSummerSuccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="sticky top-0 z-50 bg-white">
          <div className="flex items-center justify-between h-12 px-4">
            <div className="w-10" />
            <h1 className="text-base font-semibold text-gray-900 text-center flex-1">
              {headerTitle}
            </h1>
            <button
              onClick={() => {
                window.location.href = 'https://livo-385512.web.app/app/chat'
              }}
              className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
              <IconHeadset size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-6">
            <IconCheck size={44} className="text-green-500" strokeWidth={2.5} />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            ¡Listo!
          </h2>

          <p className="text-base text-gray-700 leading-relaxed mb-2 max-w-sm">
            Hemos guardado tu disponibilidad.
          </p>

          <p className="text-base text-gray-600 leading-relaxed max-w-sm">
            Los turnos seleccionados se te asignarán en las próximas <span className="font-semibold text-gray-900">48&nbsp;horas</span>.
          </p>

          <div className="mt-8 bg-gray-50 rounded-xl px-4 py-3 max-w-sm">
            <p className="text-xs text-gray-500 leading-relaxed">
              Te avisaremos por la app de Livo cuando estén confirmados. Si necesitas cambiar algo, contacta con soporte.
            </p>
          </div>

          <button
            onClick={() => {
              window.location.href = 'https://livo-385512.web.app/app/ShiftStack/Feed?tab=SHIFTS'
            }}
            className="mt-8 w-full max-w-sm py-3 px-4 rounded-full bg-[#2cbeff] hover:bg-[#1ea8e0] text-white font-semibold text-base transition-all duration-200 active:scale-98"
          >
            Ir a la app
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white">
        <div className="flex items-center justify-between h-12 px-4">
          {isSummer ? (
            <div className="w-10" />
          ) : (
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1 text-[#2cbeff] font-medium text-sm hover:opacity-80 transition-opacity"
            >
              <IconChevronLeft size={20} />
              <span>Atrás</span>
            </button>
          )}
          <h1 className="text-base font-semibold text-gray-900 text-center flex-1">
            {headerTitle}
          </h1>
          {isSummer ? (
            <button
              onClick={() => {
                window.location.href = 'https://livo-385512.web.app/app/chat'
              }}
              className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
              <IconHeadset size={20} />
            </button>
          ) : (
            <button
              onClick={() => {
                const phoneNumber = '34930491425' // Remove + for wa.me URL
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

                if (isMobile) {
                  // On mobile: use window.location.href to open WhatsApp app natively
                  // This will open the app if installed, or WhatsApp Web if not
                  window.location.href = `https://wa.me/${phoneNumber}`
                } else {
                  // Desktop: open WhatsApp Web in new tab
                  window.open(`https://wa.me/${phoneNumber}`, '_blank')
                }
              }}
              className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
              <IconHeadset size={20} />
            </button>
          )}
        </div>
      </header>

      <div className="px-4">
        {/* Intro text */}
        {isSummer ? (
          <div className="py-4">
            <p className="text-gray-600 text-sm leading-relaxed mb-3 text-center">
              Dinos qué días quieres trabajar. Hay turnos disponibles cada día en <span className="font-semibold text-gray-800">{locationLabel}</span>.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed mb-3 text-center">
              Toda la disponibilidad que marques se asignará automáticamente como turno.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mt-4">
              <p className="text-xs font-semibold text-gray-700 mb-2">
                Combinaciones permitidas por día:
              </p>
              <ul className="text-xs text-gray-600 space-y-1">
                {(allowedCombinations ?? [['DAY'], ['EVENING'], ['NIGHT'], ['DAY', 'EVENING']]).map((combo, i) => (
                  <li key={i}>• {describeCombination(combo)}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-600 text-sm leading-relaxed mb-2">
              Los días marcados coinciden con tu disponibilidad.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed mb-2">
              Pulsa en cada fecha para ver y elegir tus turnos.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              Confírmalos a la vez en el botón final.
            </p>
          </div>
        )}

        {/* Add availability button or Availability Selector */}
        <div className={isSummer ? 'pb-0' : 'pb-4'}>
          {showAvailabilityEditor ? (
            <AvailabilitySelector
              activeSlot={activeSlot}
              onSlotSelect={handleSlotSelect}
              onSave={handleSaveAvailability}
              isSaving={isSavingAvailability}
              hideAllDay={isSummer}
              hideSaveButton={isSummer}
              allowedCombinations={allowedCombinations}
            />
          ) : (
            <button
              onClick={handleAddAvailability}
              className="w-full py-4 rounded-full bg-[#2cbeff] hover:bg-[#1ea8e0] text-white font-semibold text-base transition-all duration-200 active:scale-98"
            >
              Añadir más disponibilidad
            </button>
          )}
        </div>

        {/* Month selector */}
        <MonthSelector
          month={currentMonth}
          year={currentYear}
          onPrevious={handlePrevMonth}
          onNext={handleNextMonth}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          months={isSummer ? [
            { month: 5, year: 2026 },
            { month: 6, year: 2026 },
            { month: 7, year: 2026 },
            { month: 8, year: 2026 },
          ] : undefined}
          onSelectMonth={isSummer ? (m, y) => {
            setCurrentMonth(m)
            setCurrentYear(y)
          } : undefined}
        />

        {/* Calendar */}
        <Calendar
          year={currentYear}
          month={currentMonth}
          days={currentMonthData?.days || []}
          onDayClick={handleDayClick}
          rejectedSlots={rejectedSlots}
          rejectedShiftIds={rejectedShiftIds}
          availability={availability}
          shiftClaims={shiftClaims}
          pendingSlotsByDate={showAvailabilityEditor ? pendingSlotsByDate : undefined}
        />

        {/* Save button below calendar when editing availability */}
        {showAvailabilityEditor && (
          <div className="mt-6 px-6 pb-4">
            <button
              onClick={handleSaveAvailability}
              disabled={isSavingAvailability}
              className={`
                w-full py-4 rounded-full font-semibold text-base text-white
                transition-all duration-200
                ${isSavingAvailability
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-[#2cbeff] hover:bg-[#1ea8e0] active:scale-98'
                }
              `}
            >
              {isSavingAvailability ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}

        {/* Plan completado button - fixed at bottom */}
        {!showAvailabilityEditor && (
        <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-6 mt-8">
          {showSuccessMessage ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 text-center">
              <div className="flex items-center justify-center gap-2 text-green-700">
                <IconCheck size={20} className="text-green-500" />
                <span className="font-medium">¡Plan enviado con éxito!</span>
              </div>
              <p className="text-sm text-green-600 mt-1">Redirigiendo a la app...</p>
            </div>
          ) : (
            <>
              {confirmedCount > 0 && (
                <div className="text-center mb-3">
                  <p className="text-sm text-gray-600">
                    Has seleccionado <span className="font-semibold text-[#2cbeff]">{confirmedCount}</span> {confirmedCount === 1 ? 'turno' : 'turnos'}
                  </p>
                </div>
              )}
              <button
                onClick={handleCompletePlan}
                disabled={isSubmitting || confirmedCount === 0}
                className={`
                  w-full py-4 rounded-full font-semibold text-white text-base
                  flex items-center justify-center gap-2
                  transition-all duration-200
                  ${confirmedCount === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : isSubmitting
                    ? 'bg-[#2cbeff]/70 cursor-wait'
                    : 'bg-[#2cbeff] hover:bg-[#1ea8e0] active:scale-98'
                  }
                `}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <IconCheck size={22} strokeWidth={2.5} />
                    <span>Solicita tus turnos</span>
                  </>
                )}
              </button>
              {confirmedCount === 0 && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  Selecciona al menos un turno para completar tu plan
                </p>
              )}
            </>
          )}
        </div>
        )}
      </div>

      {/* Shift selection modal */}
      {selectedShifts && selectedDate && (
        <ShiftListModal
          shifts={selectedShifts}
          date={selectedDate}
          onSelect={handleShiftSelect}
          onClose={closeModal}
          onClaim={handleClaimFromModal}
          onReject={handleRejectFromModal}
          onSlotRejected={(date, label) => {
            const key = `${date}-${label}`
            setRejectedSlots(prev => prev.includes(key) ? prev : [...prev, key])
          }}
          onSlotUnrejected={(date, label) => {
            const key = `${date}-${label}`
            setRejectedSlots(prev => prev.filter(k => k !== key))
          }}
        />
      )}

      {/* Summer early-access popup */}
      {showSummerPopup && (
        <SummerEarlyAccessPopup
          onClose={() => setShowSummerPopup(false)}
          locationLabel={locationLabel}
        />
      )}

      {/* Availability popup */}
      {showAvailabilityPopup && (
        <AvailabilityPopup
          onClose={handleClosePopup}
          onAddAvailability={handleAddAvailability}
          availableDaysCount={availableDaysCount}
        />
      )}
    </div>
  )
}
