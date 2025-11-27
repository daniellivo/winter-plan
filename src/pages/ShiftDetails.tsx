import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { 
  IconStar, 
  IconMapPin, 
  IconChevronRight, 
  IconCopy, 
  IconParking, 
  IconToolsKitchen2, 
  IconCoffee, 
  IconDeviceDesktop, 
  IconStethoscope, 
  IconClock,
  IconCalendar,
  IconHeart
} from '@tabler/icons-react'
import Header from '../components/Layout/Header'
import PrimaryButton from '../components/Buttons/PrimaryButton'
import SecondaryButton from '../components/Buttons/SecondaryButton'
import { getShiftDetails, claimShift, sendFeedback } from '../api/winterPlan'
import { useAppContext } from '../App'
import { useAppNavigation } from '../hooks/useAppNavigation'
import type { ShiftDetails as ShiftDetailsType } from '../types/winterPlan'

export default function ShiftDetails() {
  const { shiftId } = useParams<{ shiftId: string }>()
  const navigate = useAppNavigation()
  const { professionalId } = useAppContext()
  
  const [shift, setShift] = useState<ShiftDetailsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)

  useEffect(() => {
    if (shiftId) {
      loadShiftDetails()
    }
  }, [shiftId])

  const loadShiftDetails = async () => {
    try {
      setLoading(true)
      const data = await getShiftDetails(shiftId!)
      setShift(data)
    } catch {
      console.error('Failed to load shift details')
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async () => {
    if (!shift) return
    try {
      setClaiming(true)
      await claimShift(shift.id, professionalId)
      // Show success and navigate back
      alert('¡Turno solicitado correctamente!')
      navigate('/calendar')
    } catch {
      alert('Error al solicitar el turno')
    } finally {
      setClaiming(false)
    }
  }

  const handleNotInterested = async () => {
    if (!shift) return
    try {
      await sendFeedback(shift.id, professionalId, 'not_interested')
      navigate('/calendar')
    } catch {
      alert('Error al enviar feedback')
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'short' 
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const openGoogleMaps = () => {
    if (!shift) return
    if (shift.facility.googleMapsUrl) {
      window.open(shift.facility.googleMapsUrl, '_blank')
    } else {
      const query = encodeURIComponent(`${shift.facility.address}, ${shift.facility.city}`)
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
    }
  }

  // Build tags array from boolean fields
  const getActiveTags = () => {
    if (!shift) return []
    const tags: { icon: React.ReactNode; label: string }[] = []
    
    if (shift.tags.parking) {
      tags.push({ icon: <IconParking size={14} />, label: 'Parking de pago' })
    }
    if (shift.tags.food) {
      tags.push({ icon: <IconToolsKitchen2 size={14} />, label: 'Dieta incluida' })
    } else {
      tags.push({ icon: <IconToolsKitchen2 size={14} />, label: 'Dieta no incluida' })
    }
    if (shift.tags.cafeteria) {
      tags.push({ icon: <IconCoffee size={14} />, label: 'Acceso cafetería' })
    }
    if (shift.tags.casiopea) {
      tags.push({ icon: <IconDeviceDesktop size={14} />, label: 'CASIOPEA' })
    }
    
    return tags
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header title="Detalles del Turno" showBack />
        <div className="px-5 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!shift) {
    return (
      <div className="min-h-screen bg-white">
        <Header title="Detalles del Turno" showBack />
        <div className="px-5 py-8 text-center">
          <p className="text-gray-600">No se encontró el turno</p>
        </div>
      </div>
    )
  }

  const activeTags = getActiveTags()

  return (
    <div className="min-h-screen bg-white pb-24">
      <Header title="Detalles del Turno" showBack backPath="/winter-plan/calendar" />
      
      <div className="px-5 py-4">
        {/* Facility info */}
        <div className="border-l-4 border-[#2cbeff] pl-4 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            {shift.facility.name}
          </h2>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <IconStar size={14} className="text-amber-400 fill-amber-400" />
            <span>{shift.facility.rating}</span>
            <span className="text-gray-400">({shift.facility.reviewsCount} valoraciones)</span>
          </div>
        </div>

        {/* Shift details */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-gray-700">
            <IconStethoscope size={18} className="text-gray-400" />
            <span className="text-sm">{shift.unit}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-700">
            <IconHeart size={18} className="text-gray-400" />
            <span className="text-sm">{shift.field}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-700">
            <IconCalendar size={18} className="text-gray-400" />
            <span className="text-sm capitalize">{formatDate(shift.date)}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-700">
            <IconClock size={18} className="text-gray-400" />
            <span className="text-sm">{shift.startTime} - {shift.endTime}</span>
          </div>
        </div>

        {/* Remuneration */}
        <div className="border-t border-gray-100 pt-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Remuneración</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Hospital</span>
              <span className="text-gray-900">{shift.remuneration.facilityAmount}€</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Livo Bonus</span>
              <span className="text-gray-900">{shift.remuneration.bonusAmount}€</span>
            </div>
            <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-100">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">{shift.remuneration.total}€</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="border-t border-gray-100 pt-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Detalles</h3>
          <div className="flex flex-wrap gap-2">
            {activeTags.map((tag, i) => (
              <div 
                key={i}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-full text-sm text-gray-700"
              >
                {tag.icon}
                <span>{tag.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="border-t border-gray-100 pt-4 mb-6">
          <p className="text-sm text-gray-600 leading-relaxed">
            {shift.description}
          </p>
          <button className="text-[#2cbeff] text-sm font-medium mt-2">
            Ver más
          </button>
        </div>

        {/* Address - Opens Google Maps */}
        <div className="border-t border-gray-100 pt-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Sobre el centro</h3>
          <button 
            onClick={openGoogleMaps}
            className="w-full flex items-center justify-between py-2 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <IconMapPin size={18} className="text-gray-400" />
              <div className="text-left">
                <p className="text-sm text-gray-900">{shift.facility.address}</p>
                <p className="text-sm text-gray-500">{shift.facility.city}</p>
              </div>
            </div>
            <IconChevronRight size={20} className="text-[#2cbeff]" />
          </button>
        </div>

        {/* Cancellation policy */}
        <div className="border-t border-gray-100 pt-4 mb-6">
          <button 
            onClick={() => navigate('/cancellation-policy/winter_default')}
            className="w-full flex items-center justify-between py-2"
          >
            <span className="font-semibold text-gray-900">Política de cancelación</span>
            <IconChevronRight size={20} className="text-[#2cbeff]" />
          </button>
        </div>

        {/* Shift ID */}
        <div className="border-t border-gray-100 pt-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Turno Nº</p>
              <p className="text-sm text-gray-900">{shiftId}</p>
            </div>
            <button 
              onClick={() => copyToClipboard(shiftId!)}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <IconCopy size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white border-t border-gray-100 p-4">
        <div className="flex gap-3">
          <SecondaryButton 
            onClick={handleNotInterested}
          >
            No me interesa
          </SecondaryButton>
          <div className="flex-1">
            <PrimaryButton onClick={handleClaim} disabled={claiming}>
              {claiming ? 'Solicitando...' : `Solicitar por ${shift.remuneration.total}€`}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  )
}
