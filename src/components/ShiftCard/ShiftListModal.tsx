import { IconX, IconCheck } from '@tabler/icons-react'
import { useState, useRef, useEffect } from 'react'
import type { Shift } from '../../types/winterPlan'
import ShiftChip from '../Calendar/ShiftChip'

interface ShiftListModalProps {
  shifts: Shift[]
  date: string
  onSelect: (shiftId: string) => void
  onClose: () => void
  onClaim?: (shiftId: string) => void
  onReject?: (shiftId: string) => void
}

export default function ShiftListModal({ 
  shifts, 
  date, 
  onSelect, 
  onClose,
  onClaim,
  onReject
}: ShiftListModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [translateX, setTranslateX] = useState(0)
  
  const containerRef = useRef<HTMLDivElement>(null)
  
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    })
  }

  const handleClaim = (e: React.MouseEvent, shiftId: string) => {
    e.stopPropagation()
    if (onClaim) {
      onClaim(shiftId)
    }
  }

  const handleReject = (e: React.MouseEvent, shiftId: string) => {
    e.stopPropagation()
    if (onReject) {
      onReject(shiftId)
    }
  }

  // Touch event handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
    setTouchEnd(e.touches[0].clientX)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const currentTouch = e.touches[0].clientX
    setTouchEnd(currentTouch)
    const diff = currentTouch - touchStart
    setTranslateX(diff)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    const diff = touchStart - touchEnd
    const threshold = 50 // minimum swipe distance

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex < shifts.length - 1) {
        // Swipe left - next shift
        setCurrentIndex(currentIndex + 1)
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe right - previous shift
        setCurrentIndex(currentIndex - 1)
      }
    }
    
    setTranslateX(0)
  }

  const goToShift = (index: number) => {
    setCurrentIndex(index)
  }

  // Reset index when shifts change
  useEffect(() => {
    setCurrentIndex(0)
  }, [shifts])

  // Single shift mode or multiple shifts
  const showSwipe = shifts.length > 1

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl z-50 animate-slide-up">
        <div className="p-4">
          {/* Handle */}
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Turnos para {formatDate(date)}
            </h3>
            <button 
              onClick={onClose}
              className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-full"
            >
              <IconX size={20} />
            </button>
          </div>
          
          {/* Shift counter - only show if multiple shifts */}
          {showSwipe && (
            <div className="text-center text-sm text-gray-500 mb-3">
              Turno {currentIndex + 1} de {shifts.length}
            </div>
          )}
          
          {/* Swipeable shift container */}
          <div 
            ref={containerRef}
            className="overflow-hidden pb-4"
            onTouchStart={showSwipe ? handleTouchStart : undefined}
            onTouchMove={showSwipe ? handleTouchMove : undefined}
            onTouchEnd={showSwipe ? handleTouchEnd : undefined}
          >
            <div 
              className="flex transition-transform duration-300 ease-out"
              style={{
                transform: `translateX(calc(-${currentIndex * 100}% + ${isDragging ? translateX : 0}px))`
              }}
            >
              {shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="w-full flex-shrink-0 px-1"
                >
                  <div
                    onClick={() => onSelect(shift.id)}
                    className="w-full p-4 bg-gray-50 rounded-xl text-left hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Chip + Time */}
                        <div className="flex items-center gap-2 mb-2">
                          <ShiftChip 
                            label={shift.label} 
                            confirmed={shift.status === 'claimed'}
                          />
                          <span className="text-sm text-gray-600">
                            {shift.startTime} - {shift.endTime}
                          </span>
                        </div>
                        
                        {/* Facility name */}
                        <p className="text-sm font-medium text-gray-900">
                          {shift.facilityName}
                        </p>
                        
                        {/* Unit and field */}
                        {(shift.unit || shift.field) && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {[shift.unit, shift.field].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex gap-2 ml-3">
                        <button
                          onClick={(e) => handleClaim(e, shift.id)}
                          disabled={shift.status === 'claimed'}
                          className={`
                            w-8 h-8 rounded-full flex items-center justify-center transition-all
                            ${shift.status === 'claimed' 
                              ? 'bg-green-500 border-2 border-green-500 cursor-not-allowed' 
                              : 'border-2 border-green-500 hover:bg-green-50'
                            }
                          `}
                        >
                          <IconCheck 
                            size={18} 
                            className={shift.status === 'claimed' ? 'text-white' : 'text-green-500'}
                            strokeWidth={shift.status === 'claimed' ? 3 : 2}
                          />
                        </button>
                        <button
                          onClick={(e) => handleReject(e, shift.id)}
                          disabled={shift.status === 'claimed'}
                          className={`
                            w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors
                            ${shift.status === 'claimed'
                              ? 'border-gray-300 cursor-not-allowed opacity-50'
                              : 'border-red-500 hover:bg-red-50'
                            }
                          `}
                        >
                          <IconX 
                            size={18} 
                            className={shift.status === 'claimed' ? 'text-gray-400' : 'text-red-500'}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Pagination dots - only show if multiple shifts */}
          {showSwipe && (
            <div className="flex justify-center gap-2 pt-2 pb-2">
              {shifts.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToShift(index)}
                  className={`
                    w-2 h-2 rounded-full transition-all duration-200
                    ${index === currentIndex 
                      ? 'bg-[#2cbeff] w-6' 
                      : 'bg-gray-300 hover:bg-gray-400'
                    }
                  `}
                  aria-label={`Go to shift ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
