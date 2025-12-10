import { IconInfoCircle } from '@tabler/icons-react'
import PrimaryButton from '../components/Buttons/PrimaryButton'
import LockedCalendar from '../components/Calendar/LockedCalendar'
import { useAppNavigation } from '../hooks/useAppNavigation'
import { useAppContext } from '../App'
import { sendTrackingEvent } from '../api/tracking'

export default function WinterPlanIntro() {
  const navigate = useAppNavigation()
  const { professionalId } = useAppContext()

  const handlePreparePlan = () => {
    // Redirect to availability update page
    window.location.href = 'https://livo-385512.web.app/app/availability/update'
  }

  const handleViewPlanClick = () => {
    // Send tracking event before navigating
    sendTrackingEvent(
      professionalId,
      'view_plan_click',
      null, // plan not loaded yet
      [], // availability not loaded yet
      [] // shiftClaims not loaded yet
    )
    navigate('/calendar')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="w-10" />
          <h1 className="text-base font-semibold text-gray-900 text-center flex-1">
            🎄 Planifica tu Invierno 🎄
          </h1>
          <button 
            onClick={() => navigate('/info')}
            className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <IconInfoCircle size={20} />
          </button>
        </div>
      </header>

      <div className="px-5 pb-8">
        {/* Subtitle */}
        <div className="text-center py-6">
          <p className="text-gray-600 text-sm leading-relaxed">
            Te preparamos tu plan de turnos personalizado para Diciembre y Enero
          </p>
        </div>

        {/* Step 1 */}
        <div className="mb-8">
          <div className="text-center mb-4">
            <h3 className="font-bold text-gray-900 mb-2">1. Visualiza y confirma tu plan de turnos</h3>
          </div>
          <PrimaryButton onClick={handleViewPlanClick}>
            Ver mi plan
          </PrimaryButton>
        </div>

        {/* Gratitude letter */}
        <div className="bg-gradient-to-br from-[#e8d5b7] to-[#d4c4a8] rounded-2xl p-6 mb-8 shadow-sm">
          <h4 className="text-center font-semibold text-gray-800 mb-3">
            Carta de agradecimiento 💌
          </h4>
          <p className="text-sm text-gray-700 text-center leading-relaxed">
            Gracias por ayudar a mantener el sistema sanitario en los meses más complicados. 
            Este plan existe para que tú también puedas organizarte con tiempo, descansar y 
            aprovechar al máximo los días que decides trabajar.
          </p>
        </div>

        {/* Bottom CTA */}
        <PrimaryButton onClick={() => navigate('/calendar')}>
          Ver mi plan
        </PrimaryButton>
      </div>
    </div>
  )
}
