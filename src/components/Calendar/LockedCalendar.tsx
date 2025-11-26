import { useMemo } from 'react'

interface LockedCalendarProps {
  year: number
  month: number // 0-indexed
}

const WEEKDAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

export default function LockedCalendar({ year, month }: LockedCalendarProps) {
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

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  return (
    <div className="w-full">
      {/* Month header */}
      <div className="flex items-center justify-center py-3">
        <h3 className="text-base font-semibold text-gray-400">
          {monthNames[month]} {year}
        </h3>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-400 py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarGrid.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="h-12" />
          }
          
          return (
            <div
              key={day}
              className="h-12 flex items-center justify-center"
            >
              <span className="text-sm text-gray-400">
                {day}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

