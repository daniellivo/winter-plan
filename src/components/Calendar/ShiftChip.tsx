import { IconSun, IconSunset2, IconMoon, IconLock } from '@tabler/icons-react'

interface ShiftChipProps {
  label: string
  confirmed?: boolean
  locked?: boolean // For pre-approved shifts (APPROVED/PENDING_APPROVAL)
  rejected?: boolean // For slots where all shifts were rejected
}

// Get the solid color for each slot type
const getSlotColor = (label: string): string => {
  switch (label) {
    case 'TM': return 'bg-[#FFA538]'
    case 'TT': return 'bg-[#FE85C6]'
    case 'TN': return 'bg-[#12A3B9]'
    default: return 'bg-gray-400'
  }
}

// Colors based on shift type and confirmation status
const getChipStyles = (label: string, confirmed: boolean, locked: boolean) => {
  // Locked state - full color with lock icon (for Approved/Pending shiftClaims)
  if (locked) {
    switch (label) {
      case 'TM':
        return {
          bg: 'bg-[#FFA538]',
          text: 'text-white',
          Icon: IconSun
        }
      case 'TT':
        return {
          bg: 'bg-[#FE85C6]',
          text: 'text-white',
          Icon: IconSunset2
        }
      case 'TN':
        return {
          bg: 'bg-[#12A3B9]',
          text: 'text-white',
          Icon: IconMoon
        }
      default:
        return {
          bg: 'bg-gray-400',
          text: 'text-white',
          Icon: IconSun
        }
    }
  }
  
  switch (label) {
    case 'TM':
      return {
        bg: confirmed ? 'bg-[#FFA538]' : 'bg-[#FFE8C5]',
        text: confirmed ? 'text-white' : 'text-amber-800',
        Icon: IconSun
      }
    case 'TT':
      return {
        bg: confirmed ? 'bg-[#FE85C6]' : 'bg-[#FEE5F3]',
        text: confirmed ? 'text-white' : 'text-pink-800',
        Icon: IconSunset2
      }
    case 'TN':
      return {
        bg: confirmed ? 'bg-[#12A3B9]' : 'bg-[#D2F7FB]',
        text: confirmed ? 'text-white' : 'text-cyan-800',
        Icon: IconMoon
      }
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        Icon: IconSun
      }
  }
}

export default function ShiftChip({ label, confirmed = false, locked = false, rejected = false }: ShiftChipProps) {
  // Rejected state - show a filled circle with the slot color
  if (rejected) {
    const colorClass = getSlotColor(label)
    return (
      <div className={`w-2 h-2 rounded-full ${colorClass}`} title={`${label} - Rechazado`} />
    )
  }
  
  const styles = getChipStyles(label, confirmed, locked)
  const { Icon } = styles
  
  return (
    <div className={`
      inline-flex items-center gap-0.5 
      px-1.5 py-0.5 
      rounded-md text-xs font-medium
      ${styles.bg} ${styles.text}
    `}>
      {!locked && <Icon size={12} />}
      {locked && <IconLock size={12} />}
      <span>{label}</span>
    </div>
  )
}

// Component for showing professional availability (gray background with icon only)
export function AvailabilityIndicator({ label }: { label: string }) {
  let Icon = IconSun
  switch (label) {
    case 'TM':
      Icon = IconSun
      break
    case 'TT':
      Icon = IconSunset2
      break
    case 'TN':
      Icon = IconMoon
      break
  }
  
  return (
    <div className="inline-flex items-center justify-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium bg-gray-200 text-gray-500 w-full">
      <Icon size={12} />
    </div>
  )
}

// Component for when entire day is locked (only has pre-approved shifts)
// Shows the slot label (TM/TT/TN) with a lock icon and full color
export function LockedDayIndicator({ label }: { label?: string }) {
  if (label) {
    // Get the full color based on label (same as locked ShiftChip)
    let bgColor = 'bg-gray-200'
    let textColor = 'text-gray-500'
    
    switch (label) {
      case 'TM':
        bgColor = 'bg-[#FFA538]'
        textColor = 'text-white'
        break
      case 'TT':
        bgColor = 'bg-[#FE85C6]'
        textColor = 'text-white'
        break
      case 'TN':
        bgColor = 'bg-[#12A3B9]'
        textColor = 'text-white'
        break
    }
    
    // Show locked chip with label and lock icon only (no turn icon)
    return (
      <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium ${bgColor} ${textColor}`}>
        <IconLock size={12} />
        <span>{label}</span>
      </div>
    )
  }
  
  // Fallback: just lock icon if no label
  return (
    <div className="flex items-center justify-center">
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
        <IconLock size={16} className="text-gray-500" />
      </div>
    </div>
  )
}
