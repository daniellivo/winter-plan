import { useState, useEffect, useCallback } from 'react'
import { IconInfoCircle, IconCheck } from '@tabler/icons-react'
import Calendar from '../components/Calendar/Calendar'
import MonthSelector from '../components/Calendar/MonthSelector'
import ShiftListModal from '../components/ShiftCard/ShiftListModal'
import { getWinterPlan, claimShift, sendFeedback, sendCompletedPlan } from '../api/winterPlan'
import { useAppContext } from '../App'
import { useAppNavigation } from '../hooks/useAppNavigation'
import type { WinterPlan, Shift } from '../types/winterPlan'

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

  const loadPlan = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getWinterPlan(professionalId)
      setPlan(data)
    } catch {
      setError('No pudimos cargar tu plan. Por favor, inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [professionalId])

  useEffect(() => {
    loadPlan()
  }, [loadPlan])

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
      navigate(`/winter-plan/shifts/${shifts[0].id}`)
    } else if (shifts.length > 1) {
      setSelectedShifts(shifts)
      setSelectedDate(date)
    }
  }

  const handleShiftSelect = (shiftId: string) => {
    closeModal()
    navigate(`/winter-plan/shifts/${shiftId}`)
  }

  const handleClaimFromModal = async (shiftId: string) => {
    try {
      await claimShift(shiftId, professionalId)
      
      // Update local state immediately for better UX
      if (selectedShifts) {
        const updatedShifts = selectedShifts.map(s => 
          s.id === shiftId ? { ...s, status: 'claimed' as const } : s
        )
        setSelectedShifts(updatedShifts)
      }
      
      // Reload plan to get fresh data
      await loadPlan()
    } catch {
      alert('Error al solicitar el turno')
    }
  }

  const handleRejectFromModal = async (shiftId: string) => {
    try {
      await sendFeedback(shiftId, professionalId, 'not_interested')
      
      // Remove the rejected shift from modal immediately
      if (selectedShifts) {
        const remaining = selectedShifts.filter(s => s.id !== shiftId)
        if (remaining.length === 0) {
          closeModal()
        } else {
          setSelectedShifts(remaining)
        }
      }
      
      // Reload plan to get fresh data
      await loadPlan()
    } catch {
      alert('Error al rechazar el turno')
    }
  }

  const closeModal = () => {
    setSelectedShifts(null)
    setSelectedDate(null)
  }

  const handleCompletePlan = async () => {
    if (!plan) return
    
    try {
      setIsSubmitting(true)
      
      // Extract all confirmed shift IDs from all months
      const confirmedShiftIds: string[] = []
      plan.months.forEach(month => {
        month.days.forEach(day => {
          day.shifts.forEach(shift => {
            if (shift.status === 'claimed') {
              confirmedShiftIds.push(shift.id)
            }
          })
        })
      })

      // Send to n8n webhook
      await sendCompletedPlan(professionalId, confirmedShiftIds)
      
      // Show success message briefly
      setShowSuccessMessage(true)
      
      // Redirect to app after short delay
      setTimeout(() => {
        window.location.href = 'https://livo-385512.web.app/app/CalendarStack'
      }, 1500)
      
    } catch (error) {
      console.error('Error completing plan:', error)
      alert('Error al enviar el plan. Por favor, inténtalo de nuevo.')
      setIsSubmitting(false)
    }
  }

  // Count confirmed shifts for display
  const getConfirmedShiftsCount = () => {
    if (!plan) return 0
    let count = 0
    plan.months.forEach(month => {
      month.days.forEach(day => {
        day.shifts.forEach(shift => {
          if (shift.status === 'claimed') count++
        })
      })
    })
    return count
  }

  const confirmedCount = getConfirmedShiftsCount()

  // Get current month data
  const getMonthKey = () => `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
  const currentMonthData = plan?.months.find(m => m.month === getMonthKey())

  // Navigation limits (Dec 2025 - Jan 2026)
  const canGoPrevious = !(currentYear === 2025 && currentMonth === 11)
  const canGoNext = !(currentYear === 2026 && currentMonth === 0)

  if (loading && !plan) {
    return (
      <div className="min-h-screen bg-white">
        <header className="sticky top-0 z-50 bg-white">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="w-10" />
            <h1 className="text-base font-semibold text-gray-900 text-center flex-1">
              🎄 Aquí está tu Calendario 🎄
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
              🎄 Aquí está tu Calendario 🎄
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
              🎄 Aquí está tu Calendario 🎄
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
          <div className="w-10" />
          <h1 className="text-base font-semibold text-gray-900 text-center flex-1">
            🎄 Aquí está tu Calendario 🎄
          </h1>
          <button 
            onClick={() => navigate('/winter-plan/info')}
            className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <IconInfoCircle size={20} />
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
            Este invierno en Livo trabajamos para ti.
            <br />
            Te planificamos los turnos según tus preferencias.
          </p>
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
                    Has confirmado <span className="font-semibold text-[#2cbeff]">{confirmedCount}</span> {confirmedCount === 1 ? 'turno' : 'turnos'}
                  </p>
                </div>
              )}
              <button
                onClick={handleCompletePlan}
                disabled={isSubmitting || confirmedCount === 0}
                className={`
                  w-full py-4 rounded-2xl font-semibold text-white text-base
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
                    <span>Confirma tus turnos</span>
                  </>
                )}
              </button>
              {confirmedCount === 0 && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  Confirma al menos un turno para completar tu plan
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
        />
      )}
    </div>
  )
}
