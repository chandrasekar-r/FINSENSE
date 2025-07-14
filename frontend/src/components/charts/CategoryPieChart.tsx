import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface CategoryData {
  category: string
  amount: number
  percentage: number
  color?: string
}

interface CategoryPieChartProps {
  data: CategoryData[]
  formatAmount: (amount: number) => string
}

const COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
]

const CustomTooltip = ({ active, payload, formatAmount }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 dark:text-white">{data.category}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Amount: <span className="font-medium">{formatAmount(data.amount)}</span>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Percentage: <span className="font-medium">{data.percentage.toFixed(1)}%</span>
        </p>
      </div>
    )
  }
  return null
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ data, formatAmount }) => {
  // Add colors to data if not provided
  const dataWithColors = data.map((item, index) => ({
    ...item,
    color: item.color || COLORS[index % COLORS.length]
  }))

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No category data available
      </div>
    )
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={dataWithColors}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey="amount"
            label={({ category, percentage }) => `${category}: ${percentage.toFixed(1)}%`}
            labelLine={false}
          >
            {dataWithColors.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip formatAmount={formatAmount} />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}