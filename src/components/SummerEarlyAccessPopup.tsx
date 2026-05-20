import { IconX, IconBolt } from '@tabler/icons-react'

interface SummerEarlyAccessPopupProps {
  onClose: () => void
  locationLabel: string
}

export default function SummerEarlyAccessPopup({ onClose, locationLabel }: SummerEarlyAccessPopupProps) {
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
          aria-label="Cerrar"
        >
          <IconX size={20} />
        </button>

        {/* Badge */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-1.5 bg-[#2cbeff]/10 text-[#1ea8e0] text-xs font-semibold px-3 py-1.5 rounded-full">
            <IconBolt size={14} stroke={2.5} />
            Acceso anticipado
          </div>
        </div>

        {/* Content */}
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900 mb-3 leading-snug">
            Has sido seleccionado para adelantarte al resto
          </h2>

          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            Puedes elegir tus turnos en <span className="font-semibold text-gray-900">{locationLabel}</span> antes que nadie.
          </p>

          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Selecciona los días que quieres ir a trabajar a Teknon. Todos los turnos seleccionados se te asignarán automáticamente por el equipo de Livo.
          </p>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-6 text-left">
            <p className="text-xs text-amber-900 leading-relaxed">
              <span className="font-semibold">⏳ Si no lo haces ahora</span>, tendrás que esperar a la publicación general — y los turnos se irán rápido.
            </p>
          </div>

          {/* CTA Button */}
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-full bg-[#2cbeff] hover:bg-[#1ea8e0] text-white font-semibold text-base transition-all duration-200 active:scale-98"
          >
            Empezar a elegir turnos
          </button>
        </div>
      </div>
    </div>
  )
}
