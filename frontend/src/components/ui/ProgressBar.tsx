import React from 'react'

interface ProgressBarProps {
  value: number
  max?: number
  color?: 'green' | 'yellow' | 'red' | 'blue'
  showLabel?: boolean
  className?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, 
  max = 100, 
  color = 'blue', 
  showLabel = false,
  className = '' 
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  const colorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500'
  }

  const getColor = () => {
    if (color !== 'blue') return colorClasses[color]
    if (percentage >= 90) return colorClasses.red
    if (percentage >= 70) return colorClasses.yellow
    return colorClasses.green
  }

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600 dark:text-gray-400">Progress</span>
          <span className="text-gray-600 dark:text-gray-400">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
