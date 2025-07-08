import React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    label: string
    isPositive: boolean
  }
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className
}) => {
  return (
    <div className={cn(
      "bg-card rounded-lg border border-border p-6 shadow-sm hover:shadow-md transition-all duration-200",
      className
    )}>
      <div className="flex items-center justify-between min-w-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline space-x-2 flex-wrap min-w-0">
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
          {trend && (
            <div className="w-full flex justify-center mt-2">
              <span className={cn(
                "text-xs font-medium px-2 py-1 rounded-full",
                trend.isPositive 
                  ? "text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/20" 
                  : "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/20"
              )}>
                {trend.isPositive ? "+" : ""}{trend.value.toFixed(2)}% {trend.label}
              </span>
            </div>
          )}
        </div>
        <div className="ml-4 flex-shrink-0">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </div>
    </div>
  )
} 