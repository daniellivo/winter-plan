import { IconInfoCircle } from '@tabler/icons-react'
import PrimaryButton from '../components/Buttons/PrimaryButton'
import LockedCalendar from '../components/Calendar/LockedCalendar'
import { useAppNavigation } from '../hooks/useAppNavigation'

export default function WinterPlanIntro() {
  const navigate = useAppNavigation()

  const handlePreparePlan = () => {
    // Redirect to availability update page
    window.location.href = 'https://livo-385512.web.app/app/availability/update'
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white">
        <div className="flex items-center justify-between h-14 px-4">
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
        <p className="text-sm text-gray-500 text-center pb-3">
          Turnos en Diciembre y Enero
        </p>
      </header>

      <div className="px-5 pb-8">
        {/* Intro text */}
        <div className="text-center py-6">
          <p className="text-gray-600 text-sm leading-relaxed">
            Este invierno en Livo te preparamos un plan de turnos personalizado que encaje contigo.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6 mb-8">
          <div className="text-center">
            <h3 className="font-bold text-gray-900 mb-1">1. Marca tus días libres</h3>
            <p className="text-sm text-gray-600">Dinos cuándo puedes trabajar.</p>
          </div>
          
          <div className="text-center">
            <h3 className="font-bold text-gray-900 mb-1">2. Te preparamos tu plan</h3>
            <p className="text-sm text-gray-600">Visualiza tu propuesta de turnos.</p>
          </div>
          
          <div className="text-center">
            <h3 className="font-bold text-gray-900 mb-1">3. Confirma y listo</h3>
            <p className="text-sm text-gray-600">
              Asegura los mejores turnos y<br />
              sácale el máximo partido a las fiestas
            </p>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="mb-4">
          <PrimaryButton onClick={handlePreparePlan}>
            Marcar mi Disponibilidad
          </PrimaryButton>
        </div>

        {/* Secondary CTA - Ver plan */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/calendar')}
            className="w-full py-3 px-6 text-[#2cbeff] font-semibold text-base border-2 border-[#2cbeff] rounded-full hover:bg-[#2cbeff]/5 transition-colors"
          >
            Ver mi plan
          </button>
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

        {/* Locked calendar section - Clickable */}
        <div className="mb-8 -mx-5">
          {/* Calendar with overlay */}
          <button 
            onClick={() => navigate('/calendar')}
            className="relative w-full cursor-pointer active:scale-[0.99] transition-transform"
          >
            {/* Real calendar background */}
            <div className="px-4">
              <LockedCalendar year={2025} month={11} />
            </div>
            
            {/* Blur + Gray overlay */}
            <div className="absolute inset-0 backdrop-blur-[2px] bg-gray-100/80" />
            
            {/* Lock card on top */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-gray-100 rounded-xl p-6 text-center shadow-sm">
                <h4 className="font-semibold text-gray-800 mb-2">Tus turnos de Invierno</h4>
                <p className="text-[#2cbeff] font-semibold text-sm">
                  Ver mi plan
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Bottom CTA */}
        <PrimaryButton onClick={handlePreparePlan}>
          Marcar mi Disponibilidad
        </PrimaryButton>
      </div>
    </div>
  )
}
