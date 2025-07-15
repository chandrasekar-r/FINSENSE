import React from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native'
import { format } from 'date-fns'
import { useCurrency } from '../contexts/CurrencyContext'
import { useTheme } from '../contexts/ThemeContext'
import { Transaction } from '../lib/api'

interface TransactionDetailsModalProps {
  transaction: Transaction | null
  visible: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  transaction,
  visible,
  onClose,
  onEdit,
  onDelete,
}) => {
  const { formatAmount } = useCurrency()
  const { colors } = useTheme()

  if (!transaction) return null

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    )
  }

  const getTransactionTypeColor = (type: string) => {
    return type === 'income' ? colors.success : colors.error
  }

  const getTransactionTypeSign = (type: string) => {
    return type === 'income' ? '+' : '-'
  }

  const amount = typeof transaction.amount === 'string' 
    ? parseFloat(transaction.amount) 
    : transaction.amount

  const styles = createStyles(colors)

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Transaction Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Amount and Type */}
          <View style={styles.section}>
            <View style={styles.row}>
              <View style={styles.halfColumn}>
                <Text style={styles.label}>Amount</Text>
                <Text style={[styles.amountText, { color: getTransactionTypeColor(transaction.transaction_type) }]}>
                  {getTransactionTypeSign(transaction.transaction_type)}{formatAmount(amount)}
                </Text>
                {transaction.tax_amount && parseFloat(transaction.tax_amount.toString()) > 0 && (
                  <Text style={styles.taxText}>
                    Tax: {formatAmount(parseFloat(transaction.tax_amount.toString()))}
                  </Text>
                )}
              </View>
              <View style={styles.halfColumn}>
                <Text style={styles.label}>Type</Text>
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
            </View>
          </View>

          {/* Date and Category */}
          <View style={styles.section}>
            <View style={styles.row}>
              <View style={styles.halfColumn}>
                <Text style={styles.label}>Date</Text>
                <Text style={styles.value}>
                  {format(new Date(transaction.transaction_date), 'MMMM dd, yyyy')}
                </Text>
              </View>
              <View style={styles.halfColumn}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>
                    {transaction.category_name || 'Uncategorized'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Description and Vendor */}
          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.value}>{transaction.description}</Text>
          </View>

          {transaction.vendor_name && (
            <View style={styles.section}>
              <Text style={styles.label}>Vendor/Merchant</Text>
              <Text style={[styles.value, styles.boldText]}>{transaction.vendor_name}</Text>
            </View>
          )}

          {/* Receipt Line Items */}
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

          {/* OCR Extracted Text */}
          {transaction.receipt_details?.extractedText && (
            <View style={styles.section}>
              <View style={styles.ocrHeader}>
                <Text style={styles.sectionTitle}>OCR Extracted Text</Text>
                <Text style={styles.ocrSubtitle}>Raw receipt data</Text>
              </View>
              <View style={styles.ocrContainer}>
                <Text style={styles.ocrText}>{transaction.receipt_details.extractedText}</Text>
              </View>
            </View>
          )}

          {/* Metadata */}
          <View style={styles.section}>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataText}>
                Created: {format(new Date(transaction.created_at), 'PPp')}
              </Text>
              {transaction.updated_at !== transaction.created_at && (
                <Text style={styles.metadataText}>
                  Updated: {format(new Date(transaction.updated_at), 'PPp')}
                </Text>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete Transaction</Text>
          </TouchableOpacity>
          <View style={styles.footerButtons}>
            <TouchableOpacity style={styles.editButton} onPress={onEdit}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeFooterButton} onPress={onClose}>
              <Text style={styles.closeFooterButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  halfColumn: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text + 'CC',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: colors.text,
  },
  boldText: {
    fontWeight: '600',
  },
  amountText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  taxText: {
    fontSize: 14,
    color: colors.text + '80',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  receiptTable: {
    backgroundColor: colors.card,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text + 'CC',
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
    backgroundColor: colors.background,
    padding: 12,
  },
  tableFooterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  ocrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ocrSubtitle: {
    fontSize: 12,
    color: colors.text + '80',
  },
  ocrContainer: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
  },
  ocrText: {
    fontSize: 12,
    color: colors.text + 'CC',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metadataText: {
    fontSize: 12,
    color: colors.text + '80',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deleteButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  closeFooterButton: {
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeFooterButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
})