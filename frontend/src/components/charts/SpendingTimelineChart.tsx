import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface TimelineData {
  date: string
  amount: number
  count?: number
}

interface SpendingTimelineChartProps {
  data: TimelineData[]
  formatAmount: (amount: number) => string
  type?: 'line' | 'bar'
  showCount?: boolean
}

const CustomTooltip = ({ active, payload, label, formatAmount }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Amount: <span className="font-medium text-blue-600">{formatAmount(data.amount)}</span>
        </p>
        {data.count && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Transactions: <span className="font-medium">{data.count}</span>
          </p>
        )}
      </div>
    )
  }
  return null
}

export const SpendingTimelineChart: React.FC<SpendingTimelineChartProps> = ({ 
  data, 
  formatAmount, 
  type = 'line',
  showCount = false 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No timeline data available
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        {type === 'line' ? (
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              className="text-xs"
            />
            <YAxis 
              tickFormatter={(value) => formatAmount(value)}
              className="text-xs"
            />
            <Tooltip content={<CustomTooltip formatAmount={formatAmount} />} />
            <Line 
              type="monotone" 
              dataKey="amount" 
              stroke="#3B82F6" 
              strokeWidth={2}
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
            />
            {showCount && (
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                yAxisId="right"
              />
            )}
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              className="text-xs"
            />
            <YAxis 
              tickFormatter={(value) => formatAmount(value)}
              className="text-xs"
            />
            <Tooltip content={<CustomTooltip formatAmount={formatAmount} />} />
            <Bar 
              dataKey="amount" 
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}