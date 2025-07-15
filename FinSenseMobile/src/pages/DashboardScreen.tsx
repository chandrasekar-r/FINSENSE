import React, { useState, useCallback } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  RefreshControl,
} from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import { useAuthStore } from '../stores/authStore'
import { useCurrency } from '../contexts/CurrencyContext'
import { RecentTransaction } from '../services/dashboardService'
import { SummaryCard } from '../components/dashboard/SummaryCard'
import { BudgetProgressCard } from '../components/dashboard/BudgetProgressCard'
import { RecentTransactionItem } from '../components/dashboard/RecentTransactionItem'
import { SpendingPieChart } from '../components/charts/SpendingPieChart'
import { SpendingTrendChart } from '../components/charts/SpendingTrendChart'
import { DashboardSkeleton } from '../components/common/LoadingSkeleton'
import { ErrorBoundary } from '../components/common/ErrorBoundary'
import { useDashboard } from '../hooks/useDashboard'
import { TransactionDetailsModal } from '../components/dashboard/TransactionDetailsModal'

export const DashboardScreen: React.FC = () => {
  const { colors } = useTheme()
  const { user, logout } = useAuthStore()
  
  const { data: dashboardData, loading, refreshing, error, refresh, retry } = useDashboard()
  const [selectedTransaction, setSelectedTransaction] = useState<RecentTransaction | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  
  const styles = createStyles(colors)

  const handleTransactionPress = useCallback((transaction: RecentTransaction) => {
    setSelectedTransaction(transaction)
    setModalVisible(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setModalVisible(false)
    setSelectedTransaction(null)
  }, [])

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, isPositive: true }
    const change = ((current - previous) / previous) * 100
    return { value: change, isPositive: change >= 0 }
  }

  if (loading && !dashboardData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back, {user?.first_name}!</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        <DashboardSkeleton />
      </SafeAreaView>
    )
  }

  if (error && !dashboardData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back, {user?.first_name}!</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retry}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const { summary, spendingByCategory, spendingTrends, budgetProgress, recentTransactions } = dashboardData || {}

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back, {user?.first_name}!</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <View style={styles.summarySection}>
          <SummaryCard
            title="Total Balance"
            amount={summary?.totalBalance || 0}
            subtitle="Current account balance"
            icon="💰"
            trend={calculateTrend(
              summary?.totalBalance || 0,
              (summary?.totalBalance || 0) - (summary?.monthlyIncome || 0) + (summary?.monthlyExpenses || 0)
            )}
          />
          
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <SummaryCard
                title="Monthly Income"
                amount={summary?.monthlyIncome || 0}
                icon="📈"
                trend={calculateTrend(
                  summary?.monthlyIncome || 0,
                  summary?.lastMonthIncome || 0
                )}
              />
            </View>
            <View style={styles.statCard}>
              <SummaryCard
                title="Monthly Expenses"
                amount={summary?.monthlyExpenses || 0}
                icon="📊"
                trend={calculateTrend(
                  summary?.monthlyExpenses || 0,
                  summary?.lastMonthExpenses || 0
                )}
              />
            </View>
          </View>
        </View>

        {/* Spending Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spending Analytics</Text>
          
          {spendingByCategory && spendingByCategory.length > 0 ? (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Spending by Category</Text>
              <SpendingPieChart data={spendingByCategory} />
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>No spending data available</Text>
            </View>
          )}
          
          {spendingTrends && spendingTrends.length > 0 ? (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Spending Trends (Last 7 Days)</Text>
              <SpendingTrendChart data={spendingTrends} />
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>No trend data available</Text>
            </View>
          )}
        </View>

        {/* Budget Progress */}
        {budgetProgress && budgetProgress.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Budget Progress</Text>
            {budgetProgress.map((budget) => (
              <BudgetProgressCard 
                key={budget.budgetId} 
                budget={budget} 
              />
            ))}
          </View>
        )}

        {/* Recent Transactions */}
        {recentTransactions && recentTransactions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            {recentTransactions.map((transaction) => (
              <RecentTransactionItem 
                key={transaction.id} 
                transaction={transaction}
                onPress={handleTransactionPress}
              />
            ))}
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.quickStatsSection}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.quickStatsGrid}>
            <View style={styles.quickStatCard}>
              <Text style={styles.quickStatValue}>{summary?.transactionCount || 0}</Text>
              <Text style={styles.quickStatLabel}>Transactions</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Text style={styles.quickStatValue}>{summary?.categoryCount || 0}</Text>
              <Text style={styles.quickStatLabel}>Categories</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Text style={styles.quickStatValue}>{summary?.budgetCount || 0}</Text>
              <Text style={styles.quickStatLabel}>Active Budgets</Text>
            </View>
          </View>
        </View>

        {/* Bottom padding for better scrolling */}
        <View style={styles.bottomPadding} />
      </ScrollView>
      
      <TransactionDetailsModal
        transaction={selectedTransaction}
        visible={modalVisible}
        onClose={handleCloseModal}
      />
    </SafeAreaView>
    </ErrorBoundary>
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
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: colors.error,
  },
  logoutText: {
    color: 'white',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
  summarySection: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  chartContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyChart: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text + '80',
    textAlign: 'center',
  },
  quickStatsSection: {
    marginBottom: 24,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: colors.text + '80',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 20,
  },
})