import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { transactionAPI, budgetAPI, Transaction, Budget } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { SpendingChart } from '../components/dashboard/SpendingChart'
import { CategoryChart } from '../components/dashboard/CategoryChart'
import { 
  TrendingUp, 
  Target, 
  Receipt, 
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Scan
} from 'lucide-react'
import { format, subDays, parseISO, startOfMonth, endOfMonth, subMonths, format as formatDate } from 'date-fns'
import { Button } from '../components/ui/Button'
import { formatCurrency } from '../lib/utils'
import { useUserCurrency } from '../stores/authStore'

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalIncome: 0,
    budgetRemaining: 0,
    transactionCount: 0,
    savingsGoal: 0,
    spendingChange: 0,
    incomeChange: 0
  })
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [categorySpending, setCategorySpending] = useState<any[]>([])
  const [spendingChartData, setSpendingChartData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const userCurrency = useUserCurrency()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Helper to calculate percentage change
  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return ((current - previous) / Math.abs(previous)) * 100;
  }

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      // Calculate date ranges
      const currentDate = new Date()
      const currentMonthStart = formatDate(startOfMonth(currentDate), 'yyyy-MM-dd')
      const currentMonthEnd = formatDate(endOfMonth(currentDate), 'yyyy-MM-dd')
      
      const prevMonth = subMonths(currentDate, 1)
      const prevMonthStart = formatDate(startOfMonth(prevMonth), 'yyyy-MM-dd')
      const prevMonthEnd = formatDate(endOfMonth(prevMonth), 'yyyy-MM-dd')
      
      // Fetch spending summary
      const spendingSummaryResponse = await transactionAPI.getSpendingSummary('month')
      const spendingData = spendingSummaryResponse.data.data
      
      // Fetch previous month spending summary
      const prevSpendingSummaryResponse = await transactionAPI.getSpendingSummary('month')
      const prevSpendingData = prevSpendingSummaryResponse.data.data

      // Fetch category summary
      const categorySummaryResponse = await transactionAPI.getCategorySummary('month')
      const categoryData = categorySummaryResponse.data.data

      // Fetch recent transactions
      const transactionsResponse = await transactionAPI.getTransactions({ limit: 10 })
      const transactions = transactionsResponse.data.data?.transactions || []

      // Fetch all transactions for chart data
      const allTransactionsResponse = await transactionAPI.getTransactions({ limit: 100 })
      const allTransactions = allTransactionsResponse.data.data?.transactions || []
      console.log('🔍 [DashboardPage] All transactions fetched:', allTransactions.length)
      console.log('🔍 [DashboardPage] Sample transaction:', allTransactions[0])

      // Fetch budget data
      const budgetsResponse = await budgetAPI.getBudgets(true)
      console.log('🔍 [DashboardPage] Fetched budgets response:', budgetsResponse.data)
      console.log('🔍 [DashboardPage] Budget data:', budgetsResponse.data.data)
      console.log('🔍 [DashboardPage] Budget array length:', (budgetsResponse.data.data || []).length)
      const budgets = budgetsResponse.data.data || []

      // Filter transactions for current month only
      const currentMonthTransactions = allTransactions.filter((t: Transaction) => {
        const transactionDate = t.transaction_date.split('T')[0] // Get date part only
        return transactionDate >= currentMonthStart && transactionDate <= currentMonthEnd
      })
      
      // Fetch previous month transactions
      const prevAllTransactionsResponse = await transactionAPI.getTransactions({ 
        limit: 100, 
        startDate: prevMonthStart, 
        endDate: prevMonthEnd 
      })
      const prevAllTransactions = prevAllTransactionsResponse.data.data?.transactions || []
      
      // Calculate stats
      const totalSpent = Number(spendingData.totalExpenses) || 0
      const totalIncome = currentMonthTransactions
        .filter((t: Transaction) => t.transaction_type === 'income')
        .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)
      const totalBudget = budgets.reduce((sum: number, budget: Budget) => {
        const budgetAmount = Number(budget.amount) || 0
        return sum + budgetAmount
      }, 0)
      console.log('🔍 [DashboardPage] Total budget calculated:', totalBudget)
      const budgetRemaining = totalBudget - totalSpent
      const transactionCount = Number(spendingData.totalTransactions) || 0
      const budgetUsage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0
      
      // Calculate previous month income
      const prevTotalIncome = prevAllTransactions
        .filter((t: Transaction) => t.transaction_type === 'income')
        .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)

      // Calculate income change
      const incomeChange = getPercentageChange(totalIncome, prevTotalIncome)

      // Calculate spending change
      const prevTotalSpent = Number(prevSpendingData.totalExpenses) || 0
      const spendingChange = getPercentageChange(totalSpent, prevTotalSpent)

      // Generate chart data from transactions
      const chartData = generateChartData(allTransactions)
      console.log('🔍 [DashboardPage] Generated chart data:', chartData)

      const newStats = {
        totalSpent,
        totalIncome,
        budgetRemaining,
        transactionCount,
        savingsGoal: budgetUsage,
        spendingChange,
        incomeChange
      }
      
      console.log('🔍 [DashboardPage] Setting stats:', newStats)
      setStats(newStats)

      setRecentTransactions(transactions.slice(0, 5))
      setCategorySpending(categoryData.categories || [])
      setSpendingChartData(chartData)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      // Set default values on error to prevent crashes
      setStats({
        totalSpent: 0,
        totalIncome: 0,
        budgetRemaining: 0,
        transactionCount: 0,
        savingsGoal: 0,
        spendingChange: 0,
        incomeChange: 0
      })
      setRecentTransactions([])
      setCategorySpending([])
      setSpendingChartData([])
    } finally {
      setIsLoading(false)
    }
  }

  const generateChartData = (transactions: Transaction[]) => {
    console.log('🔍 [DashboardPage] Generating chart data from transactions:', transactions.length)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i)
      const dateStr = format(date, 'MMM dd')
      const targetDate = format(date, 'yyyy-MM-dd')
      
      const dayTransactions = transactions.filter(t => {
        const transactionDate = t.transaction_date.split('T')[0] // Get date part only
        return transactionDate === targetDate
      })
      
      console.log(`🔍 [DashboardPage] ${targetDate} (${dateStr}): ${dayTransactions.length} transactions`)

      const expenses = dayTransactions
        .filter(t => t.transaction_type === 'expense')
        .reduce((sum, t) => {
          console.log(`🔍 [DashboardPage] Transaction amount: ${t.amount} (type: ${typeof t.amount})`)
          const numAmount = Number(t.amount)
          if (isNaN(numAmount)) {
            console.warn(`🔍 [DashboardPage] Invalid amount detected: ${t.amount}`)
            return sum
          }
          return sum + numAmount
        }, 0)
      
      const income = dayTransactions
        .filter(t => t.transaction_type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      const chartDataPoint = {
        date: dateStr,
        amount: expenses,
        income: income > 0 ? income : undefined
      }
      console.log(`🔍 [DashboardPage] Chart data point for ${dateStr}:`, chartDataPoint)
      return chartDataPoint
    })

    return last7Days
  }

  const formatCurrencyLocal = (amount: number) => formatCurrency(amount, userCurrency)

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Loading your financial overview...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your financial overview.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => navigate('/transactions')}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <CreditCard className="h-4 w-4" />
            <span>Add Transaction</span>
          </Button>
          <Button
            onClick={() => navigate('/scan')}
            className="flex items-center space-x-2"
          >
            <Scan className="h-4 w-4" />
            <span>Scan Receipt</span>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          title="Total Spent"
          value={formatCurrencyLocal(stats.totalSpent)}
          description="This month"
          icon={ArrowDownLeft}
          trend={{
            value: Math.abs(stats.spendingChange),
            label: "vs last month",
            isPositive: stats.spendingChange < 0
          }}
        />
        
        <StatCard
          title="Total Income"
          value={formatCurrencyLocal(stats.totalIncome)}
          description="This month"
          icon={ArrowUpRight}
          trend={{
            value: Math.abs(stats.incomeChange),
            label: "vs last month",
            isPositive: stats.incomeChange >= 0
          }}
        />

        <StatCard
          title="Budget Remaining"
          value={formatCurrencyLocal(stats.budgetRemaining)}
          description="From total budget"
          icon={Target}
        />

        <StatCard
          title="Transactions"
          value={stats.transactionCount}
          description="This month"
          icon={Receipt}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendingChart data={spendingChartData} />
        <CategoryChart data={categorySpending.map(cat => ({
          name: cat.name,
          value: cat.totalSpent,
          color: cat.color
        }))} />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg">Recent Transactions</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Your latest financial activity</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/transactions')}
                className="flex items-center space-x-1"
              >
                <span>View all</span>
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentTransactions.length > 0 ? (
                <div className="space-y-1">
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 hover:bg-accent rounded-lg transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transaction.transaction_type === 'income' 
                            ? 'bg-green-100 dark:bg-green-900/20' 
                            : 'bg-red-100 dark:bg-red-900/20'
                        }`}>
                          {transaction.transaction_type === 'income' ? (
                            <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <ArrowDownLeft className="h-4 w-4 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{transaction.description}</p>
                          <div className="flex items-center space-x-2">
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(transaction.transaction_date), 'MMM dd')}
                            </p>
                            <span className="text-muted-foreground">•</span>
                            <p className="text-sm text-muted-foreground">{transaction.category_name}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          transaction.transaction_type === 'income' 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-foreground'
                        }`}>
                          {transaction.transaction_type === 'income' ? '+' : '-'}
                          {formatCurrencyLocal(transaction.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Receipt className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-center mb-4">No transactions yet</p>
                  <Button onClick={() => navigate('/transactions')} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add your first transaction
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/transactions')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/scan')}
              >
                <Scan className="h-4 w-4 mr-2" />
                Scan Receipt
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/budgets')}
              >
                <Target className="h-4 w-4 mr-2" />
                View Budgets
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/chat')}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                AI Assistant
              </Button>
            </CardContent>
          </Card>

          {/* Budget Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Budget Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Used</span>
                    <span className="font-medium">{stats.savingsGoal}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        stats.savingsGoal > 90 ? 'bg-red-500' :
                        stats.savingsGoal > 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(stats.savingsGoal, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="font-medium">{formatCurrencyLocal(stats.budgetRemaining)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}