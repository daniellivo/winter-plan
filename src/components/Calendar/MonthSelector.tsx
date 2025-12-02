import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'

interface MonthSelectorProps {
  month: number // 0-indexed
  year: number
  onPrevious: () => void
  onNext: () => void
  canGoPrevious?: boolean
  canGoNext?: boolean
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export default function MonthSelector({ 
  month, 
  year, 
  onPrevious, 
  onNext,
  canGoPrevious = true,
  canGoNext = true
}: MonthSelectorProps) {
  return (
    <div className="flex items-center justify-between py-4 px-2">
      <button
        onClick={onPrevious}
        disabled={!canGoPrevious}
        className={`
          p-2 rounded-full transition-colors
          ${canGoPrevious 
            ? 'text-gray-600 hover:bg-gray-100' 
            : 'text-gray-300 cursor-not-allowed'
          }
        `}
      >
        <IconChevronLeft size={24} />
      </button>
      
      <h2 className="text-lg font-semibold text-gray-900">
        {MONTH_NAMES[month]} {year}
      </h2>
      
      <button
        onClick={onNext}
        disabled={!canGoNext}
        className={`
          p-2 rounded-full transition-colors relative
          ${canGoNext 
            ? 'text-gray-600 hover:bg-gray-100' 
            : 'text-gray-300 cursor-not-allowed'
          }
        `}
      >
        <IconChevronRight size={24} />
        {canGoNext && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
        )}
      </button>
    </div>
  )
}
