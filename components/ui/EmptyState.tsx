interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-4">
          <span className="text-gray-400">{icon}</span>
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-xs mb-4">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-[#1a5c3a] text-white text-sm font-medium rounded-lg hover:bg-[#155033] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
