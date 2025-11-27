import { IconX, IconCheck } from '@tabler/icons-react'
import { useState } from 'react'
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

// Component for a single shift block that can have swipe if multiple shifts
function ShiftBlock({
  shifts,
  label,
  onSelect,
  onClaim,
  onReject
}: {
  shifts: Shift[]
  label: string
  onSelect: (shiftId: string) => void
  onClaim?: (shiftId: string) => void
  onReject?: (shiftId: string) => void
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [translateX, setTranslateX] = useState(0)

  const hasMultipleShifts = shifts.length > 1

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
    if (!hasMultipleShifts) return
    setTouchStart(e.touches[0].clientX)
    setTouchEnd(e.touches[0].clientX)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!hasMultipleShifts || !isDragging) return
    const currentTouch = e.touches[0].clientX
    setTouchEnd(currentTouch)
    const diff = currentTouch - touchStart
    setTranslateX(diff)
  }

  const handleTouchEnd = () => {
    if (!hasMultipleShifts) return
    setIsDragging(false)
    const diff = touchStart - touchEnd
    const threshold = 50

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex < shifts.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
      }
    }
    
    setTranslateX(0)
  }

  const goToShift = (index: number) => {
    setCurrentIndex(index)
  }

  return (
    <div className="mb-4">
      {/* Block header - show shift type */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <ShiftChip label={label} confirmed={false} />
        {hasMultipleShifts && (
          <span className="text-xs text-gray-500">
            {currentIndex + 1} de {shifts.length}
          </span>
        )}
      </div>

      {/* Swipeable container */}
      <div 
        className="overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    {/* Time */}
                    <div className="flex items-center gap-2 mb-2">
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
                
                {/* Price display */}
                {shift.price && (
                  <div className="text-center">
                    <span className="text-sm font-semibold text-green-600">
                      {shift.price}€
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination dots - only show if multiple shifts */}
      {hasMultipleShifts && (
        <div className="flex justify-center gap-2 pt-3">
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
  )
}

export default function ShiftListModal({ 
  shifts, 
  date, 
  onSelect, 
  onClose,
  onClaim,
  onReject
}: ShiftListModalProps) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    })
  }

  // Group shifts by label (TM, TT, TN)
  const groupedShifts = {
    TM: shifts.filter(s => s.label === 'TM'),
    TT: shifts.filter(s => s.label === 'TT'),
    TN: shifts.filter(s => s.label === 'TN')
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl z-50 animate-slide-up max-h-[85vh] overflow-y-auto">
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
          
          {/* Shift blocks - stacked vertically */}
          <div className="pb-4">
            {groupedShifts.TM.length > 0 && (
              <ShiftBlock
                shifts={groupedShifts.TM}
                label="TM"
                onSelect={onSelect}
                onClaim={onClaim}
                onReject={onReject}
              />
            )}
            
            {groupedShifts.TT.length > 0 && (
              <ShiftBlock
                shifts={groupedShifts.TT}
                label="TT"
                onSelect={onSelect}
                onClaim={onClaim}
                onReject={onReject}
              />
            )}
            
            {groupedShifts.TN.length > 0 && (
              <ShiftBlock
                shifts={groupedShifts.TN}
                label="TN"
                onSelect={onSelect}
                onClaim={onClaim}
                onReject={onReject}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
