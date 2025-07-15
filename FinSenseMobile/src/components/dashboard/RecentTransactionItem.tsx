import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { RecentTransaction } from '../../services/dashboardService';

interface RecentTransactionItemProps {
  transaction: RecentTransaction;
  onPress?: (transaction: RecentTransaction) => void;
}

export const RecentTransactionItem: React.FC<RecentTransactionItemProps> = ({ 
  transaction, 
  onPress 
}) => {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  
  const styles = createStyles(colors);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      });
    }
  };

  const getTransactionIcon = (type: string) => {
    return type === 'income' ? '↗' : '↙';
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress?.(transaction)}
      activeOpacity={0.7}
    >
      <View style={styles.leftSection}>
        <View style={[
          styles.iconContainer,
          { backgroundColor: transaction.categoryColor + '20' }
        ]}>
          <Text style={[
            styles.icon,
            { color: transaction.categoryColor }
          ]}>
            {getTransactionIcon(transaction.type)}
          </Text>
        </View>
        
        <View style={styles.transactionInfo}>
          <Text style={styles.vendorName} numberOfLines={1}>
            {transaction.vendorName}
          </Text>
          <Text style={styles.categoryName} numberOfLines={1}>
            {transaction.categoryName}
          </Text>
        </View>
      </View>
      
      <View style={styles.rightSection}>
        <Text style={[
          styles.amount,
          { 
            color: transaction.type === 'income' ? colors.success : colors.text
          }
        ]}>
          {transaction.type === 'income' ? '+' : '-'}{formatAmount(transaction.amount)}
        </Text>
        <Text style={styles.date}>
          {formatDate(transaction.date)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  transactionInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  categoryName: {
    fontSize: 12,
    color: colors.text + '80',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: colors.text + '80',
  },
});