import { IconChevronDown } from '@tabler/icons-react'

interface SecondaryButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  showChevron?: boolean
  className?: string
}

export default function SecondaryButton({ 
  children, 
  onClick, 
  disabled = false,
  showChevron = false,
  className = ''
}: SecondaryButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        py-3 px-4
        bg-white
        text-gray-700 font-medium text-sm
        border border-gray-200
        rounded-full
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        active:bg-gray-50
        flex items-center gap-1
        ${className}
      `}
    >
      {children}
      {showChevron && <IconChevronDown size={16} />}
    </button>
  )
}
