import React from 'react'

interface StatusBadgeProps {
  status: string
  variant?: 'success' | 'warning' | 'error' | 'info'
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  variant = 'info' 
}) => {
  const variantClasses = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
  }

  const getVariant = (status: string) => {
    const lowerStatus = status.toLowerCase()
    if (lowerStatus.includes('over') || lowerStatus.includes('exceeded')) return 'error'
    if (lowerStatus.includes('warning') || lowerStatus.includes('caution')) return 'warning'
    if (lowerStatus.includes('success') || lowerStatus.includes('on track')) return 'success'
    return 'info'
  }

  const classes = variantClasses[variant === 'info' ? getVariant(status) : variant]

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {status}
    </span>
  )
}
