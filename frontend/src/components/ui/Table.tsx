import React from 'react'

interface TableColumn<T> {
  key: keyof T | string
  header: string
  render?: (item: T) => React.ReactNode
  className?: string
}

interface TableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  onRowClick?: (item: T) => void
  loading?: boolean
  emptyState?: {
    title: string
    description: string
    icon?: React.ReactNode
    action?: {
      label: string
      onClick: () => void
    }
  }
}

export const Table = <T extends Record<string, any>>({ 
  data, 
  columns, 
  onRowClick, 
  loading = false,
  emptyState 
}: TableProps<T>) => {
  if (loading) {
    return (
      <div className="bg-card p-8 rounded-lg border text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (data.length === 0 && emptyState) {
    return (
      <div className="bg-card p-8 rounded-lg border text-center">
        {emptyState.icon && (
          <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            {emptyState.icon}
          </div>
        )}
        <h3 className="text-lg font-medium text-foreground mb-2">{emptyState.title}</h3>
        <p className="text-muted-foreground mb-4">{emptyState.description}</p>
        {emptyState.action && (
          <button
            onClick={emptyState.action.onClick}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            {emptyState.action.label}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${column.className || ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((item, index) => (
              <tr
                key={index}
                className={onRowClick ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors' : ''}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white ${column.className || ''}`}
                  >
                    {column.render ? column.render(item) : item[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
