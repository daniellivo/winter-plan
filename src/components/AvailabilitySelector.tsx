import { IconCalendar, IconSun, IconSunset2, IconMoon, IconEraser } from '@tabler/icons-react'

interface AvailabilitySelectorProps {
  activeSlot: 'all' | 'day' | 'evening' | 'night' | 'delete' | null
  onSlotSelect: (slotType: 'all' | 'day' | 'evening' | 'night' | 'delete') => void
  onSave: () => void
  isSaving: boolean
}

export default function AvailabilitySelector({ 
  activeSlot,
  onSlotSelect, 
  onSave, 
  isSaving 
}: AvailabilitySelectorProps) {

  return (
    <div className="pb-4 px-4">
      {/* Title */}
      <h2 className="text-center text-gray-900 font-semibold mb-4">
        Añade disponibilidad
      </h2>

      {/* Availability buttons */}
      <div className="flex gap-2 mb-6">
        {/* Todo el día */}
        <button
          onClick={() => onSlotSelect('all')}
          className={`
            flex flex-col items-center justify-center gap-1 flex-1
            py-3 rounded-lg border-2 transition-all active:scale-95
            ${activeSlot === 'all'
              ? 'bg-blue-50 border-blue-400 text-blue-700'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          <IconCalendar size={24} className={activeSlot === 'all' ? 'text-blue-600' : 'text-gray-700'} />
          <span className="text-xs font-medium">Todo el día</span>
        </button>

        {/* Mañana */}
        <button
          onClick={() => onSlotSelect('day')}
          className={`
            flex flex-col items-center justify-center gap-1 flex-1
            py-3 rounded-lg border-2 transition-all active:scale-95
            ${activeSlot === 'day'
              ? 'bg-blue-50 border-blue-400 text-blue-700'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          <IconSun size={24} className={activeSlot === 'day' ? 'text-blue-600' : 'text-gray-700'} />
          <span className="text-xs font-medium">Mañana</span>
        </button>

        {/* Tarde */}
        <button
          onClick={() => onSlotSelect('evening')}
          className={`
            flex flex-col items-center justify-center gap-1 flex-1
            py-3 rounded-lg border-2 transition-all active:scale-95
            ${activeSlot === 'evening'
              ? 'bg-blue-50 border-blue-400 text-blue-700'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          <IconSunset2 size={24} className={activeSlot === 'evening' ? 'text-blue-600' : 'text-gray-700'} />
          <span className="text-xs font-medium">Tarde</span>
        </button>

        {/* Noche */}
        <button
          onClick={() => onSlotSelect('night')}
          className={`
            flex flex-col items-center justify-center gap-1 flex-1
            py-3 rounded-lg border-2 transition-all active:scale-95
            ${activeSlot === 'night'
              ? 'bg-blue-50 border-blue-400 text-blue-700'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          <IconMoon size={24} className={activeSlot === 'night' ? 'text-blue-600' : 'text-gray-700'} />
          <span className="text-xs font-medium">Noche</span>
        </button>

        {/* Borrar */}
        <button
          onClick={() => onSlotSelect('delete')}
          className={`
            flex flex-col items-center justify-center gap-1 flex-1
            py-3 rounded-lg border-2 transition-all active:scale-95
            ${activeSlot === 'delete'
              ? 'bg-blue-50 border-blue-400 text-blue-700'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          <IconEraser size={24} className={activeSlot === 'delete' ? 'text-blue-600' : 'text-gray-700'} />
          <span className="text-xs font-medium">Borrar</span>
        </button>
      </div>

      {/* Save button */}
      <button
        onClick={onSave}
        disabled={isSaving}
        className={`
          w-full py-4 rounded-full font-semibold text-base text-white
          transition-all duration-200
          ${isSaving
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-[#2cbeff] hover:bg-[#1ea8e0] active:scale-98'
          }
        `}
      >
        {isSaving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  )
}

