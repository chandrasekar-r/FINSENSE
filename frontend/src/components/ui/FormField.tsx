import React from 'react'

interface FormFieldProps {
  label: string
  name: string
  type?: string
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  placeholder?: string
  required?: boolean
  options?: { value: string; label: string }[]
  rows?: number
  className?: string
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  options,
  rows,
  className = ''
}) => {
  const baseClasses = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {type === 'select' && options ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          className={baseClasses}
          required={required}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows || 3}
          className={baseClasses}
          required={required}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={baseClasses}
          required={required}
          step={type === 'number' ? '0.01' : undefined}
        />
      )}
    </div>
  )
}
