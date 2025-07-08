import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { useTheme } from '../../contexts/ThemeContext'
import { useUserCurrency } from '../../stores/authStore'
import { formatCurrency } from '../../lib/utils'

interface SpendingData {
  date: string
  amount: number
  income?: number
}

interface SpendingChartProps {
  data: SpendingData[]
  className?: string
}

const CustomTooltip = ({ active, payload, label }: any) => {
  const userCurrency = useUserCurrency()
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name === 'amount' ? 'Expenses' : 'Income'}: {formatCurrency(entry.value, userCurrency)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export const SpendingChart: React.FC<SpendingChartProps> = ({ data, className }) => {
  const { theme } = useTheme()
  const userCurrency = useUserCurrency()
  
  console.log('🔍 [SpendingChart] Received data:', data)
  console.log('🔍 [SpendingChart] Data length:', data.length)

  return (
    <div className={`bg-card rounded-lg border border-border p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Spending Overview</h3>
        <p className="text-sm text-muted-foreground">Your financial activity over time</p>
      </div>
      
      <div className="h-80">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-muted-foreground">No data available</p>
              <p className="text-sm text-muted-foreground mt-1">Add some transactions to see your spending chart</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={theme === 'dark' ? '#374151' : '#e5e7eb'}
            />
            <XAxis 
              dataKey="date" 
              stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
              fontSize={12}
            />
            <YAxis 
              stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
              fontSize={12}
              tickFormatter={(value) => formatCurrency(value, userCurrency)}
            />
            <Tooltip content={<CustomTooltip />} />
            {data.some(item => item.income) && (
              <Area
                type="monotone"
                dataKey="income"
                stroke="#22c55e"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorIncome)"
                name="income"
              />
            )}
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#ef4444"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorExpenses)"
              name="amount"
            />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  )
} 