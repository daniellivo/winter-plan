import { IconX } from '@tabler/icons-react'

interface AvailabilityPopupProps {
  onClose: () => void
  onAddAvailability: () => void
  availableDaysCount: number
}

export default function AvailabilityPopup({ onClose, onAddAvailability, availableDaysCount }: AvailabilityPopupProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 z-10">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <IconX size={20} />
        </button>
        
        {/* Content */}
        <div className="pt-2 text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Añade tu disponibilidad para ver turnos
          </h2>
          
          <p className="text-sm text-gray-600 leading-relaxed mb-6">
            🚨 Actualmente tienes <span className="font-bold">{availableDaysCount} {availableDaysCount === 1 ? 'día' : 'días'}</span> marcados como disponibles.
          </p>
          
          {/* CTA Button */}
          <button
            onClick={onAddAvailability}
            className="w-full py-3 px-4 rounded-full bg-[#2cbeff] hover:bg-[#1ea8e0] text-white font-semibold text-base transition-all duration-200 active:scale-98"
          >
            Añadir más disponibilidad
          </button>
        </div>
      </div>
    </div>
  )
}

