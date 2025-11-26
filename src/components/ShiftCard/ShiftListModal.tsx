import { IconX, IconCheck } from '@tabler/icons-react'
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
          
          {/* Shift list */}
          <div className="space-y-2 pb-4">
            {shifts.map(shift => (
              <div
                key={shift.id}
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
                      className="w-8 h-8 rounded-full border-2 border-green-500 flex items-center justify-center hover:bg-green-50 transition-colors"
                    >
                      <IconCheck size={18} className="text-green-500" />
                    </button>
                    <button
                      onClick={(e) => handleReject(e, shift.id)}
                      className="w-8 h-8 rounded-full border-2 border-red-500 flex items-center justify-center hover:bg-red-50 transition-colors"
                    >
                      <IconX size={18} className="text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
