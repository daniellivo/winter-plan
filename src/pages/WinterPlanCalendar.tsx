import { useState, useEffect, useCallback } from 'react'
import { IconHeadset, IconCheck, IconChevronLeft } from '@tabler/icons-react'
import Calendar from '../components/Calendar/Calendar'
import MonthSelector from '../components/Calendar/MonthSelector'
import ShiftListModal from '../components/ShiftCard/ShiftListModal'
import { getWinterPlan, claimShift, unclaimShift, claimShiftsToApi, getClaimedShiftIds, clearClaimedShifts, getRejectedSlots, getRejectedShiftIds, fetchProfessionalAvailability } from '../api/winterPlan'
import { useFirebaseShifts } from '../hooks/useFirebaseShifts'
import { useAppContext } from '../App'
import { useAppNavigation } from '../hooks/useAppNavigation'
import type { WinterPlan, Shift } from '../types/winterPlan'
import type { AvailabilitySlot, ShiftClaim } from '../api/winterPlan'

export default function WinterPlanCalendar() {
  const navigate = useAppNavigation()
  const { professionalId } = useAppContext()
  
  const [plan, setPlan] = useState<WinterPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Default to December 2025
  const [currentMonth, setCurrentMonth] = useState(11) // 0-indexed, 11 = December
  const [currentYear, setCurrentYear] = useState(2025)
  
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

  const handleDayClick = (date: string, shifts: Shift[]) => {
    if (shifts.length === 1) {
      navigate(`/shifts/${shifts[0].id}`)
    } else if (shifts.length > 1) {
      setSelectedShifts(shifts)
      setSelectedDate(date)
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

  // Navigation limits (Dec 2025 - Jan 2026)
  const canGoPrevious = !(currentYear === 2025 && currentMonth === 11)
  const canGoNext = !(currentYear === 2026 && currentMonth === 0)

  // Show loading state
  const isLoading = loading || (firebaseLoading && !plan)
  
  if (isLoading && !plan) {
    return (
      <div className="min-h-screen bg-white">
        <header className="sticky top-0 z-50 bg-white">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="w-10" />
            <h1 className="text-base font-semibold text-gray-900 text-center flex-1">
              🎄 Aquí está tu Plan 🎄
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
              🎄 Aquí está tu Plan 🎄
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
              🎄 Aquí está tu Plan 🎄
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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white">
        <div className="flex items-center justify-between h-14 px-4">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-[#2cbeff] font-medium text-sm hover:opacity-80 transition-opacity"
          >
            <IconChevronLeft size={20} />
            <span>Atrás</span>
          </button>
          <h1 className="text-base font-semibold text-gray-900 text-center flex-1">
            🎄 Aquí está tu Plan 🎄
          </h1>
          <button 
            onClick={() => {
              const phoneNumber = '34930491425'
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
        </div>
        <p className="text-sm text-gray-500 text-center pb-3">
          Turnos en Diciembre y Enero
        </p>
      </header>

      <div className="px-4">
        {/* Intro text */}
        <div className="text-center py-4">
          <p className="text-gray-600 text-sm leading-relaxed">
            Pulsa en los días marcados para ver y elegir tus turnos.
            <br />
            Confirma todos tus turnos a la vez en el botón final.
          </p>
          <p className="text-gray-500 text-xs mt-3 leading-relaxed">
            Los turnos mostrados coinciden con tu disponibilidad. Si quieres ver más turnos, puedes añadir más disponibilidad.
          </p>
        </div>

        {/* Add availability button */}
        <div className="pb-4">
          <button
            onClick={() => {
              window.location.href = 'https://livo-385512.web.app/app/availability/update'
            }}
            className="w-full py-4 rounded-full bg-[#2cbeff] hover:bg-[#1ea8e0] text-white font-semibold text-base transition-all duration-200 active:scale-98"
          >
            Añadir más disponibilidad
          </button>
        </div>

        {/* Month selector */}
        <MonthSelector
          month={currentMonth}
          year={currentYear}
          onPrevious={handlePrevMonth}
          onNext={handleNextMonth}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
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
        />

        {/* Plan completado button - fixed at bottom */}
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
    </div>
  )
}
