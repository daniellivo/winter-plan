interface PrimaryButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
}

export default function PrimaryButton({ 
  children, 
  onClick, 
  disabled = false, 
  className = '',
  type = 'button'
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full py-3.5 px-6 
        bg-[#2cbeff] hover:bg-[#1aa8e8] 
        text-white font-semibold text-base
        rounded-full
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-[0.98]
        ${className}
      `}
    >
      {children}
    </button>
  )
}

