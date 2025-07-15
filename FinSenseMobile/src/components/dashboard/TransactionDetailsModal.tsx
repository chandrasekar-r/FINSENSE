import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { RecentTransaction } from '../../services/dashboardService';

interface TransactionDetailsModalProps {
  transaction: RecentTransaction | null;
  visible: boolean;
  onClose: () => void;
}

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  transaction,
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  
  const styles = createStyles(colors);

  if (!transaction) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionTypeText = (type: string) => {
    return type === 'income' ? 'Income' : 'Expense';
  };

  const getTransactionIcon = (type: string) => {
    return type === 'income' ? '💰' : '💸';
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Transaction Details</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.transactionHeader}>
              <View style={[
                styles.iconContainer,
                { backgroundColor: transaction.categoryColor + '20' }
              ]}>
                <Text style={styles.icon}>
                  {getTransactionIcon(transaction.type)}
                </Text>
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.vendorName}>{transaction.vendorName}</Text>
                <Text style={[
                  styles.amount,
                  { color: transaction.type === 'income' ? colors.success : colors.error }
                ]}>
                  {transaction.type === 'income' ? '+' : '-'}{formatAmount(transaction.amount)}
                </Text>
              </View>
            </View>

            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Category</Text>
                <View style={styles.categoryBadge}>
                  <View style={[
                    styles.categoryDot,
                    { backgroundColor: transaction.categoryColor }
                  ]} />
                  <Text style={styles.detailValue}>{transaction.categoryName}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type</Text>
                <Text style={[
                  styles.detailValue,
                  { color: transaction.type === 'income' ? colors.success : colors.error }
                ]}>
                  {getTransactionTypeText(transaction.type)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{formatDate(transaction.date)}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transaction ID</Text>
                <Text style={styles.detailValue}>{transaction.id}</Text>
              </View>
            </View>

            <View style={styles.actionsSection}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionText}>Edit Transaction</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.deleteButton]}>
                <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 20,
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 24,
  },
  transactionInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.text + '80',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 20,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  actionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteText: {
    color: 'white',
  },
});