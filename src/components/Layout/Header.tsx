import { IconChevronLeft, IconInfoCircle } from '@tabler/icons-react'
import { useAppNavigation } from '../../hooks/useAppNavigation'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  title: string
  showBack?: boolean
  showInfo?: boolean
  onInfoClick?: () => void
  backPath?: string
}

export default function Header({ title, showBack, showInfo, onInfoClick, backPath }: HeaderProps) {
  const navigateWithParams = useAppNavigation()
  const navigate = useNavigate()

  const handleBack = () => {
    if (backPath) {
      navigateWithParams(backPath)
    } else {
      navigate(-1) // Browser back preserves URL params naturally
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex-shrink-0">
          {showBack && (
            <button 
              onClick={handleBack}
              className="p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-1"
            >
              <IconChevronLeft size={24} />
              <span className="text-sm font-medium">Atrás</span>
            </button>
          )}
        </div>
        
        <h1 className="text-base font-semibold text-gray-900 text-center flex-1">
          {title}
        </h1>
        
        <div className="w-10 flex justify-end">
          {showInfo && onInfoClick && (
            <button 
              onClick={onInfoClick}
              className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
              <IconInfoCircle size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
