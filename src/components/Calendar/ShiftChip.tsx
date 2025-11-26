import { IconSun, IconSunset2, IconMoon } from '@tabler/icons-react'

interface ShiftChipProps {
  label: string
  confirmed?: boolean
}

// Colors based on shift type and confirmation status
const getChipStyles = (label: string, confirmed: boolean) => {
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

export default function ShiftChip({ label, confirmed = false }: ShiftChipProps) {
  const styles = getChipStyles(label, confirmed)
  const { Icon } = styles
  
  return (
    <div className={`
      inline-flex items-center gap-0.5 
      px-1.5 py-0.5 
      rounded-md text-xs font-medium
      ${styles.bg} ${styles.text}
    `}>
      <Icon size={12} />
      <span>{label}</span>
    </div>
  )
}
