import { useNavigate } from 'react-router-dom'
import { IconInfoCircle, IconLock } from '@tabler/icons-react'
import PrimaryButton from '../components/Buttons/PrimaryButton'
import LockedCalendar from '../components/Calendar/LockedCalendar'

export default function WinterPlanIntro() {
  const navigate = useNavigate()

  const handlePreparePlan = () => {
    // Placeholder URL - will be replaced with real availability flow
    window.open('https://placeholder.livo.app/disponibilidad', '_blank')
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

      <div className="px-5 pb-8">
        {/* Intro text */}
        <div className="text-center py-6">
          <p className="text-gray-600 text-sm leading-relaxed">
            Este invierno en Livo trabajamos para ti.
            <br />
            Te planificamos los turnos según tus preferencias.
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
            <p className="text-sm text-gray-600">Te enviamos una propuesta de turnos.</p>
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
            Preparar mi plan
          </PrimaryButton>
        </div>

        {/* Secondary CTA - Ver calendario */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/winter-plan/calendar')}
            className="w-full py-3 px-6 text-[#2cbeff] font-semibold text-base border-2 border-[#2cbeff] rounded-full hover:bg-[#2cbeff]/5 transition-colors"
          >
            Ver mi calendario 📅
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

        {/* Locked calendar section */}
        <div className="mb-8 -mx-5">
          {/* Calendar with overlay */}
          <div className="relative">
            {/* Real calendar background */}
            <div className="px-4">
              <LockedCalendar year={2025} month={11} />
            </div>
            
            {/* Blur + Gray overlay */}
            <div className="absolute inset-0 backdrop-blur-[2px] bg-gray-100/80" />
            
            {/* Lock card on top */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-gray-100 rounded-xl p-6 text-center shadow-sm">
                <h4 className="font-semibold text-gray-800 mb-3">Tus turnos de Invierno</h4>
                <div className="mb-3">
                  <IconLock size={32} className="mx-auto text-gray-400" />
                </div>
                <p className="text-sm text-gray-600">
                  Aquí aparecerán tu<br />
                  Plan de Invierno
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <PrimaryButton onClick={handlePreparePlan}>
          Preparar mi plan
        </PrimaryButton>
      </div>
    </div>
  )
}
