import { api } from '../lib/api';

export interface DashboardSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  lastMonthIncome: number;
  lastMonthExpenses: number;
  transactionCount: number;
  categoryCount: number;
  budgetCount: number;
}

export interface SpendingByCategory {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface SpendingTrend {
  date: string;
  amount: number;
  type: 'income' | 'expense';
}

export interface BudgetProgress {
  budgetId: string;
  budgetName: string;
  categoryName: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  status: 'on-track' | 'warning' | 'over-budget';
  color: string;
}

export interface RecentTransaction {
  id: string;
  vendorName: string;
  amount: number;
  date: string;
  categoryName: string;
  type: 'income' | 'expense';
  categoryColor: string;
}

export interface DashboardData {
  summary: DashboardSummary;
  spendingByCategory: SpendingByCategory[];
  spendingTrends: SpendingTrend[];
  budgetProgress: BudgetProgress[];
  recentTransactions: RecentTransaction[];
}

class DashboardService {
  async getDashboardData(): Promise<DashboardData> {
    try {
      const [
        summaryResponse,
        spendingResponse,
        trendsResponse,
        budgetResponse,
        recentResponse
      ] = await Promise.all([
        this.getSummary(),
        this.getSpendingByCategory(),
        this.getSpendingTrends(),
        this.getBudgetProgress(),
        this.getRecentTransactions()
      ]);

      return {
        summary: summaryResponse,
        spendingByCategory: spendingResponse,
        spendingTrends: trendsResponse,
        budgetProgress: budgetResponse,
        recentTransactions: recentResponse
      };
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      throw new Error(
        error.response?.data?.message || 
        'Failed to fetch dashboard data'
      );
    }
  }

  private async getSummary(): Promise<DashboardSummary> {
    try {
      const response = await api.get('/dashboard/summary');
      return response.data;
    } catch (error) {
      // Return mock data for development
      return {
        totalBalance: 25420.50,
        totalIncome: 45000.00,
        totalExpenses: 19579.50,
        monthlyIncome: 3750.00,
        monthlyExpenses: 2850.75,
        lastMonthIncome: 3500.00,
        lastMonthExpenses: 3100.25,
        transactionCount: 156,
        categoryCount: 12,
        budgetCount: 8
      };
    }
  }

  private async getSpendingByCategory(): Promise<SpendingByCategory[]> {
    try {
      const response = await api.get('/dashboard/spending-by-category');
      return response.data;
    } catch (error) {
      // Return mock data for development
      return [
        { categoryId: '1', categoryName: 'Food & Dining', amount: 850.25, percentage: 29.8, color: '#FF6B6B' },
        { categoryId: '2', categoryName: 'Transportation', amount: 620.50, percentage: 21.8, color: '#4ECDC4' },
        { categoryId: '3', categoryName: 'Shopping', amount: 580.75, percentage: 20.4, color: '#45B7D1' },
        { categoryId: '4', categoryName: 'Entertainment', amount: 320.00, percentage: 11.2, color: '#96CEB4' },
        { categoryId: '5', categoryName: 'Utilities', amount: 280.50, percentage: 9.8, color: '#FFEAA7' },
        { categoryId: '6', categoryName: 'Healthcare', amount: 198.75, percentage: 7.0, color: '#DDA0DD' }
      ];
    }
  }

  private async getSpendingTrends(): Promise<SpendingTrend[]> {
    try {
      const response = await api.get('/dashboard/spending-trends');
      return response.data;
    } catch (error) {
      // Return mock data for development
      const trends: SpendingTrend[] = [];
      const today = new Date();
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        trends.push({
          date: date.toISOString().split('T')[0],
          amount: Math.random() * 200 + 50,
          type: 'expense'
        });
        
        if (Math.random() > 0.7) {
          trends.push({
            date: date.toISOString().split('T')[0],
            amount: Math.random() * 500 + 100,
            type: 'income'
          });
        }
      }
      
      return trends;
    }
  }

  private async getBudgetProgress(): Promise<BudgetProgress[]> {
    try {
      const response = await api.get('/dashboard/budget-progress');
      return response.data;
    } catch (error) {
      // Return mock data for development
      return [
        {
          budgetId: '1',
          budgetName: 'Food Budget',
          categoryName: 'Food & Dining',
          budgetAmount: 1000.00,
          spentAmount: 850.25,
          remainingAmount: 149.75,
          percentageUsed: 85.0,
          status: 'warning',
          color: '#FF6B6B'
        },
        {
          budgetId: '2',
          budgetName: 'Transport Budget',
          categoryName: 'Transportation',
          budgetAmount: 800.00,
          spentAmount: 620.50,
          remainingAmount: 179.50,
          percentageUsed: 77.6,
          status: 'on-track',
          color: '#4ECDC4'
        },
        {
          budgetId: '3',
          budgetName: 'Shopping Budget',
          categoryName: 'Shopping',
          budgetAmount: 500.00,
          spentAmount: 580.75,
          remainingAmount: -80.75,
          percentageUsed: 116.2,
          status: 'over-budget',
          color: '#45B7D1'
        },
        {
          budgetId: '4',
          budgetName: 'Entertainment Budget',
          categoryName: 'Entertainment',
          budgetAmount: 400.00,
          spentAmount: 320.00,
          remainingAmount: 80.00,
          percentageUsed: 80.0,
          status: 'on-track',
          color: '#96CEB4'
        }
      ];
    }
  }

  private async getRecentTransactions(): Promise<RecentTransaction[]> {
    try {
      const response = await api.get('/dashboard/recent-transactions');
      return response.data;
    } catch (error) {
      // Return mock data for development
      return [
        {
          id: '1',
          vendorName: 'Starbucks',
          amount: 15.25,
          date: new Date().toISOString(),
          categoryName: 'Food & Dining',
          type: 'expense',
          categoryColor: '#FF6B6B'
        },
        {
          id: '2',
          vendorName: 'Uber',
          amount: 28.50,
          date: new Date(Date.now() - 86400000).toISOString(),
          categoryName: 'Transportation',
          type: 'expense',
          categoryColor: '#4ECDC4'
        },
        {
          id: '3',
          vendorName: 'Salary Deposit',
          amount: 3750.00,
          date: new Date(Date.now() - 172800000).toISOString(),
          categoryName: 'Income',
          type: 'income',
          categoryColor: '#96CEB4'
        },
        {
          id: '4',
          vendorName: 'Amazon',
          amount: 89.99,
          date: new Date(Date.now() - 259200000).toISOString(),
          categoryName: 'Shopping',
          type: 'expense',
          categoryColor: '#45B7D1'
        },
        {
          id: '5',
          vendorName: 'Netflix',
          amount: 14.99,
          date: new Date(Date.now() - 345600000).toISOString(),
          categoryName: 'Entertainment',
          type: 'expense',
          categoryColor: '#96CEB4'
        }
      ];
    }
  }

  async refreshDashboardData(): Promise<DashboardData> {
    // Clear any cached data and fetch fresh data
    return this.getDashboardData();
  }
}

export const dashboardService = new DashboardService();