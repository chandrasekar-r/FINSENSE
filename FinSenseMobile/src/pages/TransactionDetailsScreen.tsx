import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native'
import { RouteProp, useNavigation } from '@react-navigation/native'
import { format } from 'date-fns'
import { useTheme } from '../contexts/ThemeContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { useTransactionStore } from '../stores/transactionStore'
import { useCategoryStore } from '../stores/categoryStore'
import { TransactionForm } from '../components/transactions/TransactionForm'
import { MainStackParamList } from '../navigation/MainNavigator'
import { Transaction } from '../lib/api'

type TransactionDetailsScreenRouteProp = RouteProp<MainStackParamList, 'TransactionDetails'>

interface Props {
  route: TransactionDetailsScreenRouteProp
}

export const TransactionDetailsScreen: React.FC<Props> = ({ route }) => {
  const { transactionId } = route.params
  const { colors } = useTheme()
  const { formatAmount } = useCurrency()
  const navigation = useNavigation()
  const { getTransaction, deleteTransaction, isLoading } = useTransactionStore()
  const { categories } = useCategoryStore()
  
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const styles = createStyles(colors)

  useEffect(() => {
    loadTransaction()
  }, [transactionId])

  const loadTransaction = async () => {
    try {
      const fetchedTransaction = await getTransaction(transactionId)
      setTransaction(fetchedTransaction)
      setError(null)
    } catch (error) {
      setError('Failed to load transaction details')
    }
  }

  const handleEditSuccess = () => {
    setShowEditForm(false)
    loadTransaction() // Reload transaction data
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction(transactionId)
              navigation.goBack()
            } catch (error) {
              Alert.alert('Error', 'Failed to delete transaction')
            }
          }
        }
      ]
    )
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading transaction details...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Error Loading Transaction</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTransaction}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>🔍</Text>
          <Text style={styles.errorTitle}>Transaction Not Found</Text>
          <Text style={styles.errorMessage}>The requested transaction could not be found.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const category = categories.find(c => c.id === transaction.category_id)
  const amount = typeof transaction.amount === 'string' 
    ? parseFloat(transaction.amount) 
    : transaction.amount

  const getTransactionTypeColor = () => {
    return transaction.transaction_type === 'income' ? colors.success : colors.error
  }

  const getTransactionTypeSign = () => {
    return transaction.transaction_type === 'income' ? '+' : '-'
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.amountContainer}>
              <Text style={[styles.amount, { color: getTransactionTypeColor() }]}>
                {getTransactionTypeSign()}{formatAmount(amount)}
              </Text>
              {transaction.tax_amount && parseFloat(transaction.tax_amount.toString()) > 0 && (
                <Text style={styles.taxAmount}>
                  Tax: {formatAmount(parseFloat(transaction.tax_amount.toString()))}
                </Text>
              )}
            </View>
            <View style={[
              styles.typeBadge,
              {
                backgroundColor: transaction.transaction_type === 'income' 
                  ? colors.success + '20' 
                  : colors.error + '20',
              }
            ]}>
              <Text style={[
                styles.typeText,
                {
                  color: transaction.transaction_type === 'income' 
                    ? colors.success 
                    : colors.error,
                }
              ]}>
                {transaction.transaction_type.charAt(0).toUpperCase() + transaction.transaction_type.slice(1)}
              </Text>
            </View>
          </View>

          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transaction Information</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Vendor/Merchant</Text>
                <Text style={styles.infoValue}>{transaction.vendor_name}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>
                  {format(new Date(transaction.transaction_date), 'MMMM dd, yyyy')}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Category</Text>
                <View style={styles.categoryContainer}>
                  {category && (
                    <View style={[styles.categoryColorDot, { backgroundColor: category.color }]} />
                  )}
                  <Text style={styles.infoValue}>
                    {category?.name || 'Uncategorized'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{transaction.description}</Text>
          </View>

          {/* Receipt Items */}
          {transaction.receipt_details?.items && transaction.receipt_details.items.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Receipt Items</Text>
              <View style={styles.receiptTable}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { flex: 2 }]}>Item</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Qty</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Price</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Amount</Text>
                </View>
                {transaction.receipt_details.items.map((item) => (
                  <View key={item.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{item.name}</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>
                      {item.quantity}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                      {formatAmount(item.price)}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                      {formatAmount(item.amount)}
                    </Text>
                  </View>
                ))}
                <View style={styles.tableFooter}>
                  <Text style={[styles.tableFooterText, { flex: 3, textAlign: 'right' }]}>
                    Total ({transaction.receipt_details.total_items || transaction.receipt_details.items.length} items)
                  </Text>
                  <Text style={[styles.tableFooterText, { flex: 1, textAlign: 'right' }]}>
                    {formatAmount(amount)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* OCR Text */}
          {transaction.receipt_details?.extractedText && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>OCR Extracted Text</Text>
              <View style={styles.ocrContainer}>
                <Text style={styles.ocrText}>{transaction.receipt_details.extractedText}</Text>
              </View>
            </View>
          )}

          {/* Metadata */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Metadata</Text>
            <View style={styles.metadataContainer}>
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Transaction ID</Text>
                <Text style={styles.metadataValue}>{transaction.id}</Text>
              </View>
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Created</Text>
                <Text style={styles.metadataValue}>
                  {format(new Date(transaction.created_at), 'PPp')}
                </Text>
              </View>
              {transaction.updated_at !== transaction.created_at && (
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Updated</Text>
                  <Text style={styles.metadataValue}>
                    {format(new Date(transaction.updated_at), 'PPp')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editButton} onPress={() => setShowEditForm(true)}>
          <Text style={styles.editButtonText}>Edit Transaction</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Form Modal */}
      <Modal
        visible={showEditForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditForm(false)}
      >
        <TransactionForm
          transaction={transaction}
          onSuccess={handleEditSuccess}
          onCancel={() => setShowEditForm(false)}
        />
      </Modal>
    </SafeAreaView>
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
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorIcon: {
    fontSize: 48,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: colors.text + '80',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  amount: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  taxAmount: {
    fontSize: 14,
    color: colors.text + '80',
  },
  typeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text + '80',
  },
  infoValue: {
    fontSize: 16,
    color: colors.text,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  receiptTable: {
    backgroundColor: colors.background,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text + '80',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableCell: {
    fontSize: 14,
    color: colors.text,
  },
  tableFooter: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: 12,
  },
  tableFooterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  ocrContainer: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
  },
  ocrText: {
    fontSize: 12,
    color: colors.text + '80',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  metadataContainer: {
    gap: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metadataLabel: {
    fontSize: 14,
    color: colors.text + '80',
  },
  metadataValue: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'monospace',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deleteButton: {
    backgroundColor: colors.error,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})