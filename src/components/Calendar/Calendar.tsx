import { useMemo } from 'react'
import type { DayShifts } from '../../types/winterPlan'
import ShiftChip from './ShiftChip'

interface CalendarProps {
  year: number
  month: number // 0-indexed (0 = January)
  days: DayShifts[]
  onDayClick: (date: string, shifts: DayShifts['shifts']) => void
}

const WEEKDAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

interface ShiftTypeGroup {
  label: string
  hasConfirmed: boolean
}

export default function Calendar({ year, month, days, onDayClick }: CalendarProps) {
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

  // Group shifts by type and check if any are confirmed
  const getShiftTypeGroups = (shifts: DayShifts['shifts']): ShiftTypeGroup[] => {
    const groups = new Map<string, boolean>()
    
    shifts.forEach(shift => {
      const hasConfirmed = groups.get(shift.label) || shift.status === 'claimed'
      groups.set(shift.label, hasConfirmed)
    })

    // Return in order: TM, TT, TN
    const order = ['TM', 'TT', 'TN']
    return order
      .filter(label => groups.has(label))
      .map(label => ({
        label,
        hasConfirmed: groups.get(label) || false
      }))
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
          
          const shifts = getShiftsForDay(day)
          const hasShifts = shifts.length > 0
          const shiftTypeGroups = getShiftTypeGroups(shifts)
          
          return (
            <div
              key={day}
              onClick={() => hasShifts && onDayClick(formatDate(day), shifts)}
              className={`
                min-h-[80px] py-1 px-0.5 border-t border-gray-100
                ${hasShifts ? 'cursor-pointer hover:bg-gray-50' : ''}
              `}
            >
              <div className="text-center text-sm text-gray-700 mb-1">
                {day}
              </div>
              
              <div className="flex flex-col gap-0.5 items-center">
                {shiftTypeGroups.map((group) => (
                  <ShiftChip 
                    key={group.label} 
                    label={group.label} 
                    confirmed={group.hasConfirmed}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
