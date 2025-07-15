import React, { useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native'
import { format } from 'date-fns'
import { useTheme } from '../../contexts/ThemeContext'
import { useCurrency } from '../../contexts/CurrencyContext'
import { useTransactionStore } from '../../stores/transactionStore'
import { useCategoryStore } from '../../stores/categoryStore'
import { Transaction } from '../../lib/api'

interface TransactionListItemProps {
  transaction: Transaction
  onPress: () => void
  onEdit: () => void
  onDelete: () => void
  style?: any
}

export const TransactionListItem: React.FC<TransactionListItemProps> = ({
  transaction,
  onPress,
  onEdit,
  onDelete,
  style
}) => {
  const { colors } = useTheme()
  const { formatAmount } = useCurrency()
  const { deleteTransaction } = useTransactionStore()
  const { categories } = useCategoryStore()
  
  const translateX = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(1)).current
  const scale = useRef(new Animated.Value(1)).current
  
  const styles = createStyles(colors)

  const category = categories.find(c => c.id === transaction.category_id)
  const amount = typeof transaction.amount === 'string' 
    ? parseFloat(transaction.amount) 
    : transaction.amount

  const [showActions, setShowActions] = React.useState(false)

  const toggleActions = () => {
    setShowActions(!showActions)
    
    Animated.timing(translateX, {
      toValue: showActions ? 0 : -100,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }

  const handleDeletePress = () => {
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete this transaction from ${transaction.vendor_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            // Animate out before deleting
            Animated.parallel([
              Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(scale, {
                toValue: 0.8,
                duration: 300,
                useNativeDriver: true,
              }),
            ]).start(() => {
              onDelete()
            })
          }
        },
      ]
    )
  }

  const getTransactionTypeColor = () => {
    return transaction.transaction_type === 'income' ? colors.success : colors.error
  }

  const getTransactionTypeSign = () => {
    return transaction.transaction_type === 'income' ? '+' : '-'
  }

  const renderActionButton = (
    action: 'edit' | 'delete',
    onPress: () => void,
    backgroundColor: string,
    icon: string,
    label: string
  ) => (
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor }]}
      onPress={onPress}
    >
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  )

  return (
    <View style={[styles.container, style]}>
      {/* Background Actions */}
      <View style={styles.actionsContainer}>
        {renderActionButton('edit', onEdit, colors.primary, '✏️', 'Edit')}
        {renderActionButton('delete', handleDeletePress, colors.error, '🗑️', 'Delete')}
      </View>

      {/* Main Content */}
      <Animated.View
        style={[
          styles.content,
          {
            transform: [
              { translateX },
              { scale }
            ],
            opacity,
          }
        ]}
      >
        <TouchableOpacity
          style={styles.mainContent}
          onPress={onPress}
          onLongPress={toggleActions}
          activeOpacity={0.7}
        >
            <View style={styles.leftSection}>
              {/* Category Color Indicator */}
              <View style={[
                styles.categoryIndicator,
                { backgroundColor: category?.color || colors.border }
              ]} />
              
              <View style={styles.transactionInfo}>
                <Text style={styles.vendorName} numberOfLines={1}>
                  {transaction.vendor_name}
                </Text>
                <Text style={styles.description} numberOfLines={1}>
                  {transaction.description}
                </Text>
                <View style={styles.metaInfo}>
                  <Text style={styles.categoryName}>
                    {category?.name || 'Uncategorized'}
                  </Text>
                  <Text style={styles.dateSeparator}>•</Text>
                  <Text style={styles.date}>
                    {format(new Date(transaction.transaction_date), 'MMM dd')}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.rightSection}>
              <Text style={[
                styles.amount,
                { color: getTransactionTypeColor() }
              ]}>
                {getTransactionTypeSign()}{formatAmount(amount)}
              </Text>
              {transaction.tax_amount && parseFloat(transaction.tax_amount.toString()) > 0 && (
                <Text style={styles.taxAmount}>
                  Tax: {formatAmount(parseFloat(transaction.tax_amount.toString()))}
                </Text>
              )}
              <View style={[
                styles.typeBadge,
                {
                  backgroundColor: transaction.transaction_type === 'income' 
                    ? colors.success + '20' 
                    : colors.error + '20'
                }
              ]}>
                <Text style={[
                  styles.typeText,
                  {
                    color: transaction.transaction_type === 'income' 
                      ? colors.success 
                      : colors.error
                  }
                ]}>
                  {transaction.transaction_type}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
        
        {/* Action Buttons Row */}
        {showActions && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionRowButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setShowActions(false)
                onEdit()
              }}
            >
              <Text style={styles.actionRowButtonText}>✏️ Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionRowButton, { backgroundColor: colors.error }]}
              onPress={() => {
                setShowActions(false)
                handleDeletePress()
              }}
            >
              <Text style={styles.actionRowButtonText}>🗑️ Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionRowButton, { backgroundColor: colors.border }]}
              onPress={() => setShowActions(false)}
            >
              <Text style={[styles.actionRowButtonText, { color: colors.text }]}>✕ Close</Text>
            </TouchableOpacity>
          </View>
        )}
    </View>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 12,
  },
  actionsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.background,
  },
  actionButton: {
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  actionIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  actionLabel: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  content: {
    backgroundColor: colors.card,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: colors.text + 'CC',
    marginBottom: 4,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  dateSeparator: {
    fontSize: 12,
    color: colors.text + '80',
    marginHorizontal: 6,
  },
  date: {
    fontSize: 12,
    color: colors.text + '80',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  taxAmount: {
    fontSize: 12,
    color: colors.text + '80',
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionRowButton: {
    flex: 1,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  actionRowButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
})