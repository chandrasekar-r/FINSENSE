import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { BudgetProgress } from '../../services/dashboardService';

interface BudgetProgressCardProps {
  budget: BudgetProgress;
}

export const BudgetProgressCard: React.FC<BudgetProgressCardProps> = ({ budget }) => {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  
  const styles = createStyles(colors);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'over-budget':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'on-track':
        return 'On Track';
      case 'warning':
        return 'Warning';
      case 'over-budget':
        return 'Over Budget';
      default:
        return 'Unknown';
    }
  };

  const progressPercentage = Math.min(budget.percentageUsed, 100);
  const statusColor = getStatusColor(budget.status);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.budgetName}>{budget.budgetName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {getStatusText(budget.status)}
          </Text>
        </View>
      </View>
      
      <Text style={styles.categoryName}>{budget.categoryName}</Text>
      
      <View style={styles.amountContainer}>
        <Text style={styles.spentAmount}>
          {formatAmount(budget.spentAmount)}
        </Text>
        <Text style={styles.budgetAmount}>
          of {formatAmount(budget.budgetAmount)}
        </Text>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${progressPercentage}%`,
                backgroundColor: statusColor
              }
            ]} 
          />
        </View>
        <Text style={styles.percentageText}>
          {budget.percentageUsed.toFixed(1)}%
        </Text>
      </View>
      
      <View style={styles.footer}>
        <Text style={[
          styles.remainingText,
          { color: budget.remainingAmount < 0 ? colors.error : colors.success }
        ]}>
          {budget.remainingAmount < 0 ? 'Over by ' : 'Remaining: '}
          {formatAmount(Math.abs(budget.remainingAmount))}
        </Text>
      </View>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  budgetName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryName: {
    fontSize: 14,
    color: colors.text + '80',
    marginBottom: 12,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  spentAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginRight: 8,
  },
  budgetAmount: {
    fontSize: 14,
    color: colors.text + '80',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    minWidth: 40,
    textAlign: 'right',
  },
  footer: {
    alignItems: 'flex-end',
  },
  remainingText: {
    fontSize: 12,
    fontWeight: '600',
  },
});