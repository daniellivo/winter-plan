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
  onReject?: () => void
}

// Component for a single shift block that can have swipe if multiple shifts
function ShiftBlock({
  shifts,
  label,
  onSelect,
  onClaim,
  validateClaim,
  onValidationError,
  rejectedShiftIds,
  onRejectShift,
  onUnrejectShift
}: {
  shifts: Shift[]
  label: string
  onSelect: (shiftId: string) => void
  onClaim?: (shiftId: string) => void
  validateClaim: (shift: Shift) => { valid: boolean; error?: string }
  onValidationError: (error: string) => void
  rejectedShiftIds: Set<string>
  onRejectShift: (shiftId: string) => void
  onUnrejectShift: (shiftId: string) => void
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [translateX, setTranslateX] = useState(0)

  const hasMultipleShifts = shifts.length > 1

  const handleClaim = (e: React.MouseEvent, shiftId: string) => {
    e.stopPropagation()
    
    const shift = shifts.find(s => s.id === shiftId)
    if (!shift) return

    // Toggle off if already claimed
    if (shift.status === 'claimed') {
      // Local unclaim - just update parent without API call
      if (onClaim) {
        onClaim(shiftId) // Parent will handle local state update
      }
      return
    }

    // Validate if this shift can be claimed
    const validation = validateClaim(shift)
    if (!validation.valid) {
      onValidationError(validation.error || 'No se puede seleccionar este turno')
      return
    }

    // Check if another shift in this slot is already claimed
    const alreadyClaimedShift = shifts.find(s => s.status === 'claimed' && s.id !== shiftId)
    
    if (alreadyClaimedShift && onClaim) {
      // Unclaim the previous one first (local only)
      onClaim(alreadyClaimedShift.id)
    }
    
    // Claim the new one
    if (onClaim) {
      onClaim(shiftId)
    }
    
    // Remove from rejected list if it was rejected
    if (rejectedShiftIds.has(shiftId)) {
      onUnrejectShift(shiftId)
    }
  }

  const handleReject = (e: React.MouseEvent, shiftId: string) => {
    e.stopPropagation()
    
    // Toggle off if already rejected
    if (rejectedShiftIds.has(shiftId)) {
      onUnrejectShift(shiftId)
      return
    }
    
    // Mark as rejected locally (no API call)
    onRejectShift(shiftId)
    
    // Auto-swipe to next shift
    if (hasMultipleShifts && currentIndex < shifts.length - 1) {
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1)
      }, 200) // Small delay for visual feedback
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
        className="overflow-hidden relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="flex gap-3 transition-transform duration-300 ease-out"
          style={{
            transform: hasMultipleShifts 
              ? `translateX(calc(7.5% - ${currentIndex} * (85% + 12px) + ${isDragging ? translateX : 0}px))` 
              : 'translateX(7.5%)'
          }}
        >
          {shifts.map((shift) => {
            const isRejected = rejectedShiftIds.has(shift.id)
            const isClaimed = shift.status === 'claimed'
            
            return (
              <div
                key={shift.id}
                className="flex-shrink-0 w-[85%]"
              >
                <div
                  onClick={() => onSelect(shift.id)}
                  className={`
                    w-full p-4 rounded-xl text-left transition-colors cursor-pointer
                    ${isClaimed 
                      ? 'bg-green-50 hover:bg-green-100' 
                      : isRejected
                      ? 'bg-gray-100 hover:bg-gray-150 opacity-60'
                      : 'bg-gray-50 hover:bg-gray-100'
                    }
                  `}
                >
                <div>
                  {/* Line 1: Time and Action buttons */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      {shift.startTime} - {shift.endTime}
                    </span>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => handleClaim(e, shift.id)}
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center transition-all
                          ${isClaimed 
                            ? 'bg-green-500 border-2 border-green-500' 
                            : 'border-2 border-green-500 hover:bg-green-50'
                          }
                        `}
                      >
                        <IconCheck 
                          size={18} 
                          className={isClaimed ? 'text-white' : 'text-green-500'}
                          strokeWidth={isClaimed ? 3 : 2}
                        />
                      </button>
                      <button
                        onClick={(e) => handleReject(e, shift.id)}
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center transition-all
                          ${isRejected
                            ? 'bg-red-500 border-2 border-red-500'
                            : 'border-2 border-red-500 hover:bg-red-50'
                          }
                        `}
                      >
                        <IconX 
                          size={18} 
                          className={isRejected ? 'text-white' : 'text-red-500'}
                          strokeWidth={isRejected ? 3 : 2}
                        />
                      </button>
                    </div>
                  </div>
                  
                  {/* Line 2: Facility name */}
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {shift.facilityName}
                  </p>
                  
                  {/* Line 3: Unit/field and price */}
                  <div className="flex items-center justify-between">
                    {(shift.unit || shift.field) && (
                      <p className="text-xs text-gray-500">
                        {[shift.unit, shift.field].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    
                    {shift.price && (
                      <span className="text-sm font-semibold text-green-600">
                        {shift.price}€
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            )
          })}
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
  const [validationError, setValidationError] = useState<string | null>(null)
  // Global state for rejected shifts across all slots
  const [rejectedShiftIds, setRejectedShiftIds] = useState<Set<string>>(new Set())

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    })
  }

  // Handle rejecting a shift
  const handleRejectShift = (shiftId: string) => {
    setRejectedShiftIds(prev => {
      const newSet = new Set(prev)
      newSet.add(shiftId)
      
      // Check if ALL shifts in the day are now rejected
      const allShiftsRejected = shifts.every(s => newSet.has(s.id))
      if (allShiftsRejected) {
        // Close the modal after a short delay
        setTimeout(() => {
          if (onReject) onReject()
        }, 300)
      }
      
      return newSet
    })
  }

  // Handle unreject a shift (toggle off)
  const handleUnrejectShift = (shiftId: string) => {
    setRejectedShiftIds(prev => {
      const newSet = new Set(prev)
      newSet.delete(shiftId)
      return newSet
    })
  }

  // Group shifts by label (TM, TT, TN)
  const groupedShifts = {
    TM: shifts.filter(s => s.label === 'TM'),
    TT: shifts.filter(s => s.label === 'TT'),
    TN: shifts.filter(s => s.label === 'TN')
  }

  // Get currently claimed shifts
  const getClaimedShifts = () => {
    return shifts.filter(s => s.status === 'claimed')
  }

  // Validate if a shift can be claimed
  const validateClaim = (shiftToClaim: Shift): { valid: boolean; error?: string } => {
    const claimedShifts = getClaimedShifts().filter(s => s.id !== shiftToClaim.id)
    
    // If no other shifts claimed, allow
    if (claimedShifts.length === 0) {
      return { valid: true }
    }

    const claimedTM = claimedShifts.find(s => s.label === 'TM')
    const claimedTT = claimedShifts.find(s => s.label === 'TT')
    const claimedTN = claimedShifts.find(s => s.label === 'TN')

    // Rule 1: Cannot have TN with TM or TT
    if (shiftToClaim.label === 'TN' && (claimedTM || claimedTT)) {
      return { valid: false, error: 'No puedes seleccionar turno de noche (TN) si ya tienes turno de mañana (TM) o tarde (TT)' }
    }
    
    if ((shiftToClaim.label === 'TM' || shiftToClaim.label === 'TT') && claimedTN) {
      return { valid: false, error: 'No puedes seleccionar turno de mañana (TM) o tarde (TT) si ya tienes turno de noche (TN)' }
    }

    // Rule 2: TM + TT must be same hospital
    if (shiftToClaim.label === 'TM' && claimedTT) {
      if (shiftToClaim.facilityName !== claimedTT.facilityName) {
        return { valid: false, error: 'Solo puedes seleccionar TM + TT si son del mismo hospital' }
      }
    }
    
    if (shiftToClaim.label === 'TT' && claimedTM) {
      if (shiftToClaim.facilityName !== claimedTM.facilityName) {
        return { valid: false, error: 'Solo puedes seleccionar TM + TT si son del mismo hospital' }
      }
    }

    return { valid: true }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl z-50 animate-slide-up max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <div className="p-4 overflow-x-hidden">
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
          
          {/* Validation error message */}
          {validationError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700">{validationError}</p>
            </div>
          )}

          {/* Shift blocks - stacked vertically */}
          <div className="pb-4 overflow-x-hidden">
            {groupedShifts.TM.length > 0 && (
              <ShiftBlock
                shifts={groupedShifts.TM}
                label="TM"
                onSelect={onSelect}
                onClaim={onClaim}
                validateClaim={validateClaim}
                onValidationError={(error) => {
                  setValidationError(error)
                  setTimeout(() => setValidationError(null), 4000)
                }}
                rejectedShiftIds={rejectedShiftIds}
                onRejectShift={handleRejectShift}
                onUnrejectShift={handleUnrejectShift}
              />
            )}
            
            {groupedShifts.TT.length > 0 && (
              <ShiftBlock
                shifts={groupedShifts.TT}
                label="TT"
                onSelect={onSelect}
                onClaim={onClaim}
                validateClaim={validateClaim}
                onValidationError={(error) => {
                  setValidationError(error)
                  setTimeout(() => setValidationError(null), 4000)
                }}
                rejectedShiftIds={rejectedShiftIds}
                onRejectShift={handleRejectShift}
                onUnrejectShift={handleUnrejectShift}
              />
            )}
            
            {groupedShifts.TN.length > 0 && (
              <ShiftBlock
                shifts={groupedShifts.TN}
                label="TN"
                onSelect={onSelect}
                onClaim={onClaim}
                validateClaim={validateClaim}
                onValidationError={(error) => {
                  setValidationError(error)
                  setTimeout(() => setValidationError(null), 4000)
                }}
                rejectedShiftIds={rejectedShiftIds}
                onRejectShift={handleRejectShift}
                onUnrejectShift={handleUnrejectShift}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
