import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { format } from 'date-fns'
import { useTheme } from '../../contexts/ThemeContext'
import { useCurrency } from '../../contexts/CurrencyContext'
import { useTransactionStore, TransactionFormData } from '../../stores/transactionStore'
import { Transaction } from '../../lib/api'
import { CategoryPicker } from './CategoryPicker'

interface TransactionFormProps {
  transaction?: Transaction | null
  onSuccess: () => void
  onCancel: () => void
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  transaction,
  onSuccess,
  onCancel
}) => {
  const { colors } = useTheme()
  const { formatAmount } = useCurrency()
  const { createTransaction, updateTransaction, isLoading } = useTransactionStore()
  
  const [formData, setFormData] = useState<TransactionFormData>({
    vendor_name: '',
    amount: '',
    tax_amount: '',
    description: '',
    transaction_type: 'expense',
    category_id: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    receipt_url: ''
  })
  
  const [errors, setErrors] = useState<Partial<TransactionFormData>>({})

  const styles = createStyles(colors)

  // Initialize form data when editing
  useEffect(() => {
    if (transaction) {
      setFormData({
        vendor_name: transaction.vendor_name || '',
        amount: transaction.amount.toString(),
        tax_amount: transaction.tax_amount?.toString() || '',
        description: transaction.description || '',
        transaction_type: transaction.transaction_type,
        category_id: transaction.category_id || '',
        transaction_date: transaction.transaction_date.split('T')[0],
        receipt_url: transaction.receipt_url || ''
      })
    }
  }, [transaction])

  const validateForm = (): boolean => {
    const newErrors: Partial<TransactionFormData> = {}

    if (!formData.vendor_name.trim()) {
      newErrors.vendor_name = 'Vendor name is required'
    }

    if (!formData.amount.trim()) {
      newErrors.amount = 'Amount is required'
    } else if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be a positive number'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Category is required'
    }

    if (!formData.transaction_date) {
      newErrors.transaction_date = 'Transaction date is required'
    }

    if (formData.tax_amount && (isNaN(parseFloat(formData.tax_amount)) || parseFloat(formData.tax_amount) < 0)) {
      newErrors.tax_amount = 'Tax amount must be a positive number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount).toString(),
        tax_amount: formData.tax_amount ? parseFloat(formData.tax_amount).toString() : undefined
      }

      if (transaction) {
        await updateTransaction(transaction.id, data)
      } else {
        await createTransaction(data)
      }

      onSuccess()
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handleFieldChange = (field: keyof TransactionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const renderInput = (
    field: keyof TransactionFormData,
    label: string,
    placeholder: string,
    options: {
      keyboardType?: 'default' | 'numeric' | 'email-address'
      multiline?: boolean
      numberOfLines?: number
      prefix?: string
      suffix?: string
    } = {}
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        {options.prefix && <Text style={styles.inputPrefix}>{options.prefix}</Text>}
        <TextInput
          style={[
            styles.input,
            options.multiline && styles.multilineInput,
            errors[field] && styles.inputError
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.text + '80'}
          value={formData[field]}
          onChangeText={(value) => handleFieldChange(field, value)}
          keyboardType={options.keyboardType || 'default'}
          multiline={options.multiline}
          numberOfLines={options.numberOfLines}
          editable={!isLoading}
        />
        {options.suffix && <Text style={styles.inputSuffix}>{options.suffix}</Text>}
      </View>
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  )

  const renderTransactionTypeSelector = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Transaction Type</Text>
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[
            styles.typeOption,
            formData.transaction_type === 'expense' && styles.selectedTypeOption
          ]}
          onPress={() => handleFieldChange('transaction_type', 'expense')}
          disabled={isLoading}
        >
          <Text style={[
            styles.typeOptionText,
            formData.transaction_type === 'expense' && styles.selectedTypeOptionText
          ]}>
            Expense
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.typeOption,
            formData.transaction_type === 'income' && styles.selectedTypeOption
          ]}
          onPress={() => handleFieldChange('transaction_type', 'income')}
          disabled={isLoading}
        >
          <Text style={[
            styles.typeOptionText,
            formData.transaction_type === 'income' && styles.selectedTypeOptionText
          ]}>
            Income
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderDatePicker = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Transaction Date</Text>
      <TextInput
        style={[styles.input, errors.transaction_date && styles.inputError]}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.text + '80'}
        value={formData.transaction_date}
        onChangeText={(value) => handleFieldChange('transaction_date', value)}
        editable={!isLoading}
      />
      {errors.transaction_date && <Text style={styles.errorText}>{errors.transaction_date}</Text>}
    </View>
  )

  const renderCategoryPicker = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Category</Text>
      <CategoryPicker
        selectedCategoryId={formData.category_id}
        onCategorySelect={(categoryId) => handleFieldChange('category_id', categoryId)}
        placeholder="Select category"
        disabled={isLoading}
      />
      {errors.category_id && <Text style={styles.errorText}>{errors.category_id}</Text>}
    </View>
  )

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <Text style={styles.title}>
            {transaction ? 'Edit Transaction' : 'Add New Transaction'}
          </Text>

          {renderInput('vendor_name', 'Vendor/Merchant', 'Enter vendor name')}
          
          {renderInput('amount', 'Amount', '0.00', {
            keyboardType: 'numeric',
            prefix: '$'
          })}
          
          {renderInput('tax_amount', 'Tax Amount (Optional)', '0.00', {
            keyboardType: 'numeric',
            prefix: '$'
          })}

          {renderTransactionTypeSelector()}

          {renderCategoryPicker()}

          {renderDatePicker()}

          {renderInput('description', 'Description', 'Enter description', {
            multiline: true,
            numberOfLines: 3
          })}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Saving...' : transaction ? 'Update' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputPrefix: {
    fontSize: 16,
    color: colors.text,
    paddingLeft: 12,
  },
  inputSuffix: {
    fontSize: 16,
    color: colors.text,
    paddingRight: 12,
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 4,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeOption: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  selectedTypeOption: {
    backgroundColor: colors.primary,
  },
  typeOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  selectedTypeOptionText: {
    color: 'white',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
})