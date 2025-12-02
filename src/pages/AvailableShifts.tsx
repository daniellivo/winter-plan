import { useState, useEffect } from 'react'
import { IconArrowLeft, IconMapPin, IconStar, IconClock, IconCurrencyEuro, IconCalendar, IconRefresh } from '@tabler/icons-react'
import { fetchAvailableShifts } from '../api/winterPlan'
import { useAppContext } from '../App'
import { useAppNavigation } from '../hooks/useAppNavigation'
import type { AvailableShiftsResponse, AvailableShift, AvailableShiftsByDate } from '../types/winterPlan'

// Format date to Spanish locale
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
}

// Get shift time label
function getShiftTimeLabel(shift: AvailableShift): string {
  if (shift.shiftTimeInDay) {
    switch (shift.shiftTimeInDay) {
      case 'MORNING_SHIFT':
      case 'DAY_SHIFT':
        return 'Mañana'
      case 'AFTERNOON_SHIFT':
      case 'EVENING_SHIFT':
        return 'Tarde'
      case 'NIGHT_SHIFT':
        return 'Noche'
    }
  }
  return ''
}

// Get shift time badge color
function getShiftTimeBadgeColor(shift: AvailableShift): string {
  if (shift.shiftTimeInDay) {
    switch (shift.shiftTimeInDay) {
      case 'MORNING_SHIFT':
      case 'DAY_SHIFT':
        return 'bg-amber-100 text-amber-700'
      case 'AFTERNOON_SHIFT':
      case 'EVENING_SHIFT':
        return 'bg-orange-100 text-orange-700'
      case 'NIGHT_SHIFT':
        return 'bg-indigo-100 text-indigo-700'
    }
  }
  return 'bg-gray-100 text-gray-700'
}

// Shift Card Component
function ShiftCard({ shift, date }: { shift: AvailableShift; date: string }) {
  const timeLabel = getShiftTimeLabel(shift)
  const badgeColor = getShiftTimeBadgeColor(shift)
  
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
      {/* Facility header */}
      <div className="flex items-start gap-3 mb-3">
        {shift.facility.logo ? (
          <img 
            src={shift.facility.logo} 
            alt={shift.facility.name}
            className="w-12 h-12 rounded-xl object-cover bg-gray-100"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2cbeff]/20 to-[#2cbeff]/5 flex items-center justify-center">
            <span className="text-lg">🏥</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
            {shift.facility.name}
          </h3>
          {shift.facility.addressCity && (
            <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
              <IconMapPin size={12} />
              <span className="truncate">{shift.facility.addressCity}</span>
            </div>
          )}
          {shift.facility.facilityReview && shift.facility.facilityReview.totalReviews > 0 && (
            <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
              <IconStar size={12} className="text-amber-400 fill-amber-400" />
              <span>{shift.facility.facilityReview.averageRating.toFixed(1)}</span>
              <span className="text-gray-400">({shift.facility.facilityReview.totalReviews})</span>
            </div>
          )}
        </div>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-2 mb-3">
        {timeLabel && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
            {timeLabel}
          </span>
        )}
        {shift.specialization?.displayText && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
            {shift.specialization.displayText}
          </span>
        )}
        {shift.unit && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            {shift.unit}
          </span>
        )}
        {shift.urgent && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            ⚡ Urgente
          </span>
        )}
        {shift.badge && (
          <span 
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ 
              backgroundColor: shift.badge.backgroundColor || '#e0f2fe',
              color: shift.badge.color || '#0369a1'
            }}
          >
            {shift.badge.displayText}
          </span>
        )}
      </div>

      {/* Time and pay */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-gray-600 text-sm">
          <IconClock size={16} className="text-gray-400" />
          <span>{shift.localStartTime} - {shift.localFinishTime}</span>
        </div>
        {(shift.shiftTotalPay || shift.professionalTotalPayText) && (
          <div className="flex items-center gap-1 text-[#2cbeff] font-semibold">
            <IconCurrencyEuro size={16} />
            <span>{shift.professionalTotalPayText || `${shift.shiftTotalPay}€`}</span>
          </div>
        )}
      </div>

      {/* Payment breakdown if available */}
      {shift.paymentBreakdown && shift.paymentBreakdown.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-500 space-y-0.5">
            {shift.paymentBreakdown.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{item.label}</span>
                <span className="font-medium text-gray-700">{item.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Promotions/perks */}
      {shift.promotions && shift.promotions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {shift.promotions.map((promo, idx) => (
            <span 
              key={idx}
              className="px-2 py-0.5 rounded-full text-xs"
              style={{
                backgroundColor: promo.backgroundColor || '#fef3c7',
                color: promo.color || '#92400e'
              }}
            >
              {promo.displayText}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// Date Section Component
function DateSection({ dateData }: { dateData: AvailableShiftsByDate }) {
  const formattedDate = formatDate(dateData.date)
  
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3 sticky top-14 bg-gray-50 py-2 -mx-4 px-4 z-10">
        <IconCalendar size={18} className="text-[#2cbeff]" />
        <h2 className="text-base font-semibold text-gray-900 capitalize">
          {formattedDate}
        </h2>
        <span className="text-sm text-gray-500">
          ({dateData.shifts.length} {dateData.shifts.length === 1 ? 'turno' : 'turnos'})
        </span>
      </div>
      <div className="space-y-3">
        {dateData.shifts.map(shift => (
          <ShiftCard key={shift.id} shift={shift} date={dateData.date} />
        ))}
      </div>
    </div>
  )
}

export default function AvailableShifts() {
  const navigate = useAppNavigation()
  const { professionalId } = useAppContext()
  
  const [data, setData] = useState<AvailableShiftsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadShifts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchAvailableShifts(professionalId)
      setData(response)
    } catch (err) {
      console.error('Error loading available shifts:', err)
      setError('No pudimos cargar los turnos disponibles. Por favor, inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (professionalId) {
      loadShifts()
    }
  }, [professionalId])

  // Calculate total shifts
  const totalShifts = data?.shiftsByDate?.reduce((acc, d) => acc + (d.shifts?.length || 0), 0) || 0
  const totalDays = data?.shiftsByDate?.filter(d => d.shifts?.length > 0).length || 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="flex items-center h-14 px-4">
          <button
            onClick={() => navigate('/calendar')}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <IconArrowLeft size={22} />
          </button>
          <h1 className="flex-1 text-center text-base font-semibold text-gray-900 -ml-8">
            Turnos Disponibles
          </h1>
        </div>
      </header>

      <div className="px-4 py-4">
        {/* Loading state */}
        {loading && (
          <div className="py-12 text-center">
            <div className="w-12 h-12 border-3 border-[#2cbeff] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando turnos disponibles...</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="py-12 text-center">
            <div className="text-4xl mb-4">😕</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadShifts}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2cbeff] text-white rounded-full font-medium hover:bg-[#1ea8e0] transition-colors"
            >
              <IconRefresh size={18} />
              Reintentar
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && totalShifts === 0 && (
          <div className="py-12 text-center">
            <div className="text-4xl mb-4">📭</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              No hay turnos disponibles
            </h2>
            <p className="text-gray-600 text-sm">
              No encontramos turnos disponibles en este momento.
              <br />
              Vuelve más tarde para ver nuevas oportunidades.
            </p>
            <button
              onClick={loadShifts}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition-colors"
            >
              <IconRefresh size={18} />
              Actualizar
            </button>
          </div>
        )}

        {/* Success state with shifts */}
        {!loading && !error && totalShifts > 0 && data && (
          <>
            {/* Summary */}
            <div className="bg-gradient-to-r from-[#2cbeff]/10 to-[#2cbeff]/5 rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Turnos encontrados</p>
                  <p className="text-2xl font-bold text-[#2cbeff]">{totalShifts}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Días con turnos</p>
                  <p className="text-2xl font-bold text-gray-900">{totalDays}</p>
                </div>
                <button
                  onClick={loadShifts}
                  className="p-2 text-gray-500 hover:bg-white/50 rounded-full transition-colors"
                  title="Actualizar"
                >
                  <IconRefresh size={20} />
                </button>
              </div>
            </div>

            {/* Shifts list by date */}
            {data.shiftsByDate
              .filter(d => d.shifts?.length > 0)
              .sort((a, b) => a.date.localeCompare(b.date))
              .map(dateData => (
                <DateSection key={dateData.date} dateData={dateData} />
              ))
            }
          </>
        )}
      </div>
    </div>
  )
}

