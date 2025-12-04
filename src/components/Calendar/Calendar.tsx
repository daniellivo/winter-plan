import { useMemo } from 'react'
import { IconSun, IconSunset2, IconMoon } from '@tabler/icons-react'
import type { DayShifts } from '../../types/winterPlan'
import type { AvailabilitySlot, ShiftClaim } from '../../api/winterPlan'
import ShiftChip, { LockedDayIndicator, AvailabilityIndicator } from './ShiftChip'

interface CalendarProps {
  year: number
  month: number // 0-indexed (0 = January)
  days: DayShifts[]
  onDayClick: (date: string, shifts: DayShifts['shifts']) => void
  rejectedSlots?: string[] // Array of "YYYY-MM-DD-TM" format strings
  rejectedShiftIds?: string[] // Array of individually rejected shift IDs
  availability?: AvailabilitySlot[] // Professional's availability slots
  shiftClaims?: ShiftClaim[] // Existing shift claims (Approved/Pending)
  pendingSlotsByDate?: Map<string, Set<string>> // Pending availability slots by date
}

const WEEKDAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

interface ShiftTypeGroup {
  label: string
  hasConfirmed: boolean // User selected (claimed)
  isLocked: boolean // Pre-approved from API (confirmed)
  isRejected: boolean // All shifts in this slot were rejected
}

export default function Calendar({ year, month, days, onDayClick, rejectedSlots = [], rejectedShiftIds = [], availability = [], shiftClaims = [], pendingSlotsByDate }: CalendarProps) {
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

  // Helper function to map shiftTimeInDay to label
  const mapTimeInDayToLabel = (timeInDay: string): string => {
    switch (timeInDay.toUpperCase()) {
      case 'MORNING_SHIFT':
      case 'DAY_SHIFT':
        return 'TM'
      case 'AFTERNOON_SHIFT':
      case 'EVENING_SHIFT':
        return 'TT'
      case 'NIGHT_SHIFT':
        return 'TN'
      default:
        return 'TM'
    }
  }

  // Helper function to extract date from UTC string
  const extractDateFromUtc = (utcString: string): string => {
    return new Date(utcString).toISOString().split('T')[0]
  }

  // Analyze shifts for a day and return display info
  const analyzeDay = (dateStr: string, shifts: DayShifts['shifts']) => {
    const groups: ShiftTypeGroup[] = []
    const labelsMap = new Map<string, { hasConfirmed: boolean; isLocked: boolean; isRejected: boolean; allShiftsRejected: boolean; hasAvailability: boolean }>()
    
    // Check shiftClaims for Approved/Pending shifts on this date
    const dateShiftClaims = shiftClaims.filter(claim => {
      const claimDate = extractDateFromUtc(claim.startTimeUtc)
      return claimDate === dateStr && (claim.status.toUpperCase() === 'APPROVED' || claim.status.toUpperCase() === 'PENDING_APPROVAL')
    })
    
    // Mark locked slots from shiftClaims
    dateShiftClaims.forEach(claim => {
      const label = mapTimeInDayToLabel(claim.shiftTimeInDay)
      const current = labelsMap.get(label) || { hasConfirmed: false, isLocked: false, isRejected: false, allShiftsRejected: false, hasAvailability: false }
      current.isLocked = true
      labelsMap.set(label, current)
    })
    
    // Check availability for this date
    const dateAvailability = availability.find(a => a.date === dateStr)
    if (dateAvailability) {
      if (dateAvailability.day && !labelsMap.has('TM')) {
        labelsMap.set('TM', { hasConfirmed: false, isLocked: false, isRejected: false, allShiftsRejected: false, hasAvailability: true })
      }
      if (dateAvailability.evening && !labelsMap.has('TT')) {
        labelsMap.set('TT', { hasConfirmed: false, isLocked: false, isRejected: false, allShiftsRejected: false, hasAvailability: true })
      }
      if (dateAvailability.night && !labelsMap.has('TN')) {
        labelsMap.set('TN', { hasConfirmed: false, isLocked: false, isRejected: false, allShiftsRejected: false, hasAvailability: true })
      }
    }
    
    // First, check which slots have shifts and track individual rejections
    const shiftsByLabel = new Map<string, typeof shifts>()
    shifts.forEach(shift => {
      const current = labelsMap.get(shift.label) || { hasConfirmed: false, isLocked: false, isRejected: false, allShiftsRejected: false, hasAvailability: false }
      
      if (shift.status === 'confirmed') {
        // Pre-approved shift - this slot is locked
        current.isLocked = true
      } else if (shift.status === 'claimed') {
        // User selected shift
        current.hasConfirmed = true
      }
      
      labelsMap.set(shift.label, current)
      
      // Group shifts by label
      const labelShifts = shiftsByLabel.get(shift.label) || []
      labelShifts.push(shift)
      shiftsByLabel.set(shift.label, labelShifts)
    })
    
    // Check for individually rejected shifts within each slot
    shiftsByLabel.forEach((slotShifts, label) => {
      const info = labelsMap.get(label)!
      // Count how many shifts in this slot are rejected
      const rejectedCount = slotShifts.filter(s => rejectedShiftIds.includes(s.id)).length
      // If ALL shifts in this slot are rejected individually, mark the slot as rejected
      if (rejectedCount > 0 && rejectedCount === slotShifts.length && !info.hasConfirmed) {
        info.allShiftsRejected = true
        info.isRejected = true
      }
    })

    // Check for rejected slots from the rejectedSlots prop (legacy full-slot rejection)
    const order = ['TM', 'TT', 'TN']
    order.forEach(label => {
      const rejectedKey = `${dateStr}-${label}`
      const isSlotRejected = rejectedSlots.includes(rejectedKey)
      
      if (labelsMap.has(label)) {
        const info = labelsMap.get(label)!
        // If slot is rejected and not claimed, mark as rejected
        if (isSlotRejected && !info.hasConfirmed) {
          info.isRejected = true
        }
        groups.push({
          label,
          hasConfirmed: info.hasConfirmed,
          isLocked: info.isLocked,
          isRejected: info.isRejected
        })
      } else if (isSlotRejected) {
        // Slot was rejected but no shifts currently (edge case)
        groups.push({
          label,
          hasConfirmed: false,
          isLocked: false,
          isRejected: true
        })
      }
    })

    // Also add availability-only slots (no shifts, no claims, but has availability)
    // And locked slots from shiftClaims (Approved/Pending) that don't have shifts
    labelsMap.forEach((info, label) => {
      if (!groups.some(g => g.label === label)) {
        if (info.hasAvailability && !info.isLocked) {
          // Availability only, no shifts
          groups.push({
            label,
            hasConfirmed: false,
            isLocked: false,
            isRejected: false
          })
        } else if (info.isLocked) {
          // Locked from shiftClaims (Approved/Pending)
          groups.push({
            label,
            hasConfirmed: false,
            isLocked: true,
            isRejected: false
          })
        }
      }
    })

    // Check if ALL shifts for this day are locked (only pre-approved, no available slots)
    const allLocked = groups.length > 0 && groups.every(g => g.isLocked)
    // Check if there are any available (non-locked, non-rejected) shifts, or rejected slots that can be re-opened
    const hasAvailableShifts = groups.some(g => !g.isLocked)

    return { groups, allLocked, hasAvailableShifts, labelsMap }
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
          const { groups, allLocked, hasAvailableShifts, labelsMap } = analyzeDay(dateStr, shifts)
          
          // Check if there are availability-only slots (no shifts but has availability)
          const availabilityOnlySlots = groups.filter(g => {
            const info = labelsMap.get(g.label)
            return info?.hasAvailability && !hasShifts && !g.isLocked && !g.isRejected
          })
          
          // Check if this date has pending slots
          const pendingSlots = pendingSlotsByDate?.get(dateStr)
          const isEditingMode = pendingSlotsByDate !== undefined
          const isClickable = isEditingMode || (hasShifts && hasAvailableShifts)
          
          return (
            <div
              key={day}
              onClick={() => isClickable && onDayClick(dateStr, shifts.filter(s => s.status !== 'confirmed'))}
              className={`
                min-h-[80px] py-1 px-0.5 border-t border-gray-100
                ${isClickable ? 'cursor-pointer hover:bg-gray-50' : ''}
                ${pendingSlots !== undefined ? 'bg-gray-100' : ''}
              `}
            >
              <div className="text-center text-sm text-gray-700 mb-1">
                {day}
              </div>
              
              <div className="flex flex-col gap-0.5 items-center w-full">
                {/* Show pending slots if in editing mode */}
                {pendingSlots !== undefined && pendingSlots.size > 0 ? (
                  // Show pending slots as gray chips with icons
                  Array.from(pendingSlots).map(slot => {
                    let Icon = IconSun
                    switch (slot) {
                      case 'DAY':
                        Icon = IconSun
                        break
                      case 'EVENING':
                        Icon = IconSunset2
                        break
                      case 'NIGHT':
                        Icon = IconMoon
                        break
                    }
                    return (
                      <div key={slot} className="inline-flex items-center justify-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium bg-gray-200 text-gray-500 w-full">
                        <Icon size={12} />
                      </div>
                    )
                  })
                ) : pendingSlots !== undefined && pendingSlots.size === 0 ? (
                  // Date marked for deletion - show nothing
                  null
                ) : allLocked ? (
                  // Show locked chips with their labels (TM, TT, TN)
                  groups.map((group) => (
                    <LockedDayIndicator key={group.label} label={group.label} />
                  ))
                ) : (
                  <>
                    {/* Show non-rejected chips vertically */}
                    {groups.filter(g => !g.isRejected).map((group) => {
                      const info = labelsMap.get(group.label)
                      // Show availability indicator if has availability but no shifts for this slot
                      const hasShiftsForSlot = shifts.some(s => s.label === group.label)
                      if (info?.hasAvailability && !hasShiftsForSlot && !group.isLocked && !group.hasConfirmed) {
                        return <AvailabilityIndicator key={group.label} label={group.label} />
                      }
                      // Show regular shift chip
                      return (
                        <ShiftChip 
                          key={group.label} 
                          label={group.label} 
                          confirmed={group.hasConfirmed}
                          locked={group.isLocked}
                          rejected={false}
                        />
                      )
                    })}
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
