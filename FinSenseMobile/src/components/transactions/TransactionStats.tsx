import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { useCurrency } from '../../contexts/CurrencyContext'
import { useTransactionStats } from '../../stores/transactionStore'

interface TransactionStatsProps {
  style?: any
}

export const TransactionStats: React.FC<TransactionStatsProps> = ({ style }) => {
  const { colors } = useTheme()
  const { formatAmount } = useCurrency()
  const stats = useTransactionStats()
  
  const styles = createStyles(colors)

  const renderStatCard = (
    title: string,
    value: string,
    count: number,
    color: string,
    icon: string
  ) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statCount}>{count} transactions</Text>
    </View>
  )

  const renderNetAmountCard = () => {
    const isPositive = stats.netAmount >= 0
    const color = isPositive ? colors.success : colors.error
    const icon = isPositive ? '📈' : '📉'
    const prefix = isPositive ? '+' : ''
    
    return (
      <View style={[styles.netAmountCard, { borderColor: color }]}>
        <View style={styles.netAmountHeader}>
          <Text style={styles.netAmountIcon}>{icon}</Text>
          <Text style={styles.netAmountTitle}>Net Amount</Text>
        </View>
        <Text style={[styles.netAmountValue, { color }]}>
          {prefix}{formatAmount(Math.abs(stats.netAmount))}
        </Text>
        <Text style={styles.netAmountSubtitle}>
          {isPositive ? 'Surplus' : 'Deficit'} this period
        </Text>
      </View>
    )
  }

  if (stats.totalCount === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer, style]}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>No Transaction Data</Text>
        <Text style={styles.emptySubtitle}>
          Your transaction statistics will appear here once you add some transactions
        </Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.statsGrid}>
        {renderStatCard(
          'Total Income',
          formatAmount(stats.totalIncome),
          stats.incomeCount,
          colors.success,
          '💰'
        )}
        
        {renderStatCard(
          'Total Expenses',
          formatAmount(stats.totalExpenses),
          stats.expenseCount,
          colors.error,
          '💸'
        )}
      </View>
      
      {renderNetAmountCard()}
      
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryIcon}>📋</Text>
          <Text style={styles.summaryTitle}>Summary</Text>
        </View>
        <View style={styles.summaryContent}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Transactions</Text>
            <Text style={styles.summaryValue}>{stats.totalCount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Average Income</Text>
            <Text style={styles.summaryValue}>
              {stats.incomeCount > 0 
                ? formatAmount(stats.totalIncome / stats.incomeCount) 
                : formatAmount(0)
              }
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Average Expense</Text>
            <Text style={styles.summaryValue}>
              {stats.expenseCount > 0 
                ? formatAmount(stats.totalExpenses / stats.expenseCount) 
                : formatAmount(0)
              }
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text + '80',
    textAlign: 'center',
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text + 'CC',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statCount: {
    fontSize: 12,
    color: colors.text + '80',
  },
  netAmountCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  netAmountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  netAmountIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  netAmountTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  netAmountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  netAmountSubtitle: {
    fontSize: 14,
    color: colors.text + '80',
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  summaryContent: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.text + 'CC',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
})