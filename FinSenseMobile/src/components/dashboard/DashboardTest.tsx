import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SummaryCard } from './SummaryCard';
import { BudgetProgressCard } from './BudgetProgressCard';
import { RecentTransactionItem } from './RecentTransactionItem';
import { SpendingPieChart } from '../charts/SpendingPieChart';
import { SpendingTrendChart } from '../charts/SpendingTrendChart';
import { LoadingSkeleton, DashboardSkeleton } from '../common/LoadingSkeleton';

// Test data
const testSpendingData = [
  { categoryId: '1', categoryName: 'Food & Dining', amount: 850.25, percentage: 29.8, color: '#FF6B6B' },
  { categoryId: '2', categoryName: 'Transportation', amount: 620.50, percentage: 21.8, color: '#4ECDC4' },
  { categoryId: '3', categoryName: 'Shopping', amount: 580.75, percentage: 20.4, color: '#45B7D1' },
  { categoryId: '4', categoryName: 'Entertainment', amount: 320.00, percentage: 11.2, color: '#96CEB4' },
  { categoryId: '5', categoryName: 'Utilities', amount: 280.50, percentage: 9.8, color: '#FFEAA7' },
];

const testTrendData = [
  { date: '2024-01-01', amount: 120.50, type: 'expense' as const },
  { date: '2024-01-02', amount: 85.25, type: 'expense' as const },
  { date: '2024-01-03', amount: 200.75, type: 'expense' as const },
  { date: '2024-01-04', amount: 150.00, type: 'expense' as const },
  { date: '2024-01-05', amount: 95.50, type: 'expense' as const },
  { date: '2024-01-06', amount: 180.25, type: 'expense' as const },
  { date: '2024-01-07', amount: 220.00, type: 'expense' as const },
];

const testBudget = {
  budgetId: '1',
  budgetName: 'Food Budget',
  categoryName: 'Food & Dining',
  budgetAmount: 1000.00,
  spentAmount: 850.25,
  remainingAmount: 149.75,
  percentageUsed: 85.0,
  status: 'warning' as const,
  color: '#FF6B6B'
};

const testTransaction = {
  id: '1',
  vendorName: 'Starbucks',
  amount: 15.25,
  date: new Date().toISOString(),
  categoryName: 'Food & Dining',
  type: 'expense' as const,
  categoryColor: '#FF6B6B'
};

export const DashboardTest: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Dashboard Component Test</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary Cards</Text>
        <SummaryCard
          title="Total Balance"
          amount={25420.50}
          subtitle="Current account balance"
          icon="💰"
          trend={{ value: 12.5, isPositive: true }}
        />
        <SummaryCard
          title="Monthly Expenses"
          amount={2850.75}
          icon="💸"
          trend={{ value: -8.3, isPositive: false }}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Budget Progress</Text>
        <BudgetProgressCard budget={testBudget} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transaction</Text>
        <RecentTransactionItem 
          transaction={testTransaction}
          onPress={(transaction) => console.log('Transaction pressed:', transaction)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Spending Pie Chart</Text>
        <View style={styles.chartContainer}>
          <SpendingPieChart data={testSpendingData} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Spending Trend Chart</Text>
        <View style={styles.chartContainer}>
          <SpendingTrendChart data={testTrendData} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Loading Skeleton</Text>
        <LoadingSkeleton width={200} height={20} />
        <View style={styles.spacing} />
        <LoadingSkeleton width={150} height={40} borderRadius={20} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dashboard Skeleton</Text>
        <View style={styles.skeletonContainer}>
          <DashboardSkeleton />
        </View>
      </View>
    </ScrollView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  chartContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonContainer: {
    height: 300,
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
  },
  spacing: {
    height: 10,
  },
});