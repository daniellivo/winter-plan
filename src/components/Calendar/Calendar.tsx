import { useMemo } from 'react'
import type { DayShifts } from '../../types/winterPlan'
import ShiftChip, { LockedDayIndicator } from './ShiftChip'

interface CalendarProps {
  year: number
  month: number // 0-indexed (0 = January)
  days: DayShifts[]
  onDayClick: (date: string, shifts: DayShifts['shifts']) => void
  rejectedSlots?: string[] // Array of "YYYY-MM-DD-TM" format strings
}

const WEEKDAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

interface ShiftTypeGroup {
  label: string
  hasConfirmed: boolean // User selected (claimed)
  isLocked: boolean // Pre-approved from API (confirmed)
  isRejected: boolean // All shifts in this slot were rejected
}

export default function Calendar({ year, month, days, onDayClick, rejectedSlots = [] }: CalendarProps) {
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    
    // Get the day of week for the first day (0 = Sunday, adjust for Monday start)
    let startDayOfWeek = firstDay.getDay()
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1

    const grid: (number | null)[] = []
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      grid.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      grid.push(day)
    }
    
    return grid
  }, [year, month])

  const getShiftsForDay = (day: number): DayShifts['shifts'] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayData = days.find(d => d.date === dateStr)
    return dayData?.shifts || []
  }

  const formatDate = (day: number): string => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  // Analyze shifts for a day and return display info
  const analyzeDay = (dateStr: string, shifts: DayShifts['shifts']) => {
    const groups: ShiftTypeGroup[] = []
    const labelsMap = new Map<string, { hasConfirmed: boolean; isLocked: boolean; isRejected: boolean }>()
    
    // First, check which slots have shifts
    shifts.forEach(shift => {
      const current = labelsMap.get(shift.label) || { hasConfirmed: false, isLocked: false, isRejected: false }
      
      if (shift.status === 'confirmed') {
        // Pre-approved shift - this slot is locked
        current.isLocked = true
      } else if (shift.status === 'claimed') {
        // User selected shift
        current.hasConfirmed = true
      }
      
      labelsMap.set(shift.label, current)
    })

    // Check for rejected slots from the rejectedSlots prop
    const order = ['TM', 'TT', 'TN']
    order.forEach(label => {
      const rejectedKey = `${dateStr}-${label}`
      const isRejected = rejectedSlots.includes(rejectedKey)
      
      if (labelsMap.has(label)) {
        const info = labelsMap.get(label)!
        // If slot is rejected and not claimed, mark as rejected
        if (isRejected && !info.hasConfirmed) {
          info.isRejected = true
        }
        groups.push({
          label,
          hasConfirmed: info.hasConfirmed,
          isLocked: info.isLocked,
          isRejected: info.isRejected
        })
      } else if (isRejected) {
        // Slot was rejected but no shifts currently (edge case)
        groups.push({
          label,
          hasConfirmed: false,
          isLocked: false,
          isRejected: true
        })
      }
    })

    // Check if ALL shifts for this day are locked (only pre-approved, no available slots)
    const allLocked = groups.length > 0 && groups.every(g => g.isLocked)
    // Check if there are any available (non-locked, non-rejected) shifts, or rejected slots that can be re-opened
    const hasAvailableShifts = groups.some(g => !g.isLocked)

    return { groups, allLocked, hasAvailableShifts }
  }

  return (
    <div className="w-full">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarGrid.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="min-h-[80px]" />
          }
          
          const dateStr = formatDate(day)
          const shifts = getShiftsForDay(day)
          const hasShifts = shifts.length > 0
          const { groups, allLocked, hasAvailableShifts } = analyzeDay(dateStr, shifts)
          
          // Allow click if there are available shifts OR rejected slots (to re-open them)
          const isClickable = hasShifts && hasAvailableShifts
          
          return (
            <div
              key={day}
              onClick={() => isClickable && onDayClick(dateStr, shifts.filter(s => s.status !== 'confirmed'))}
              className={`
                min-h-[80px] py-1 px-0.5 border-t border-gray-100
                ${isClickable ? 'cursor-pointer hover:bg-gray-50' : ''}
              `}
            >
              <div className="text-center text-sm text-gray-700 mb-1">
                {day}
              </div>
              
              <div className="flex flex-col gap-0.5 items-center">
                {allLocked ? (
                  // Show locked chips with their labels (TM, TT, TN)
                  groups.map((group) => (
                    <LockedDayIndicator key={group.label} label={group.label} />
                  ))
                ) : (
                  <>
                    {/* Show non-rejected chips vertically */}
                    {groups.filter(g => !g.isRejected).map((group) => (
                      <ShiftChip 
                        key={group.label} 
                        label={group.label} 
                        confirmed={group.hasConfirmed}
                        locked={group.isLocked}
                        rejected={false}
                      />
                    ))}
                    {/* Show rejected dots horizontally */}
                    {groups.some(g => g.isRejected) && (
                      <div className="flex flex-row gap-1 items-center">
                        {groups.filter(g => g.isRejected).map((group) => (
                          <ShiftChip 
                            key={group.label} 
                            label={group.label} 
                            confirmed={false}
                            locked={false}
                            rejected={true}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
