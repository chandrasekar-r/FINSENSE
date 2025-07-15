import { ChartConfig } from 'react-native-chart-kit/dist/HelperTypes';

export const getChartConfig = (colors: any): ChartConfig => ({
  backgroundGradientFrom: colors.card,
  backgroundGradientTo: colors.card,
  backgroundGradientFromOpacity: 1,
  backgroundGradientToOpacity: 1,
  color: (opacity = 1) => colors.primary + Math.round(opacity * 255).toString(16).padStart(2, '0'),
  labelColor: (opacity = 1) => colors.text + Math.round(opacity * 255).toString(16).padStart(2, '0'),
  strokeWidth: 2,
  barPercentage: 0.5,
  useShadowColorFromDataset: false,
  decimalPlaces: 0,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: colors.primary,
  },
});

export const formatChartLabel = (value: number): string => {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  } else if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  } else {
    return value.toString();
  }
};

export const generateCategoryColors = (count: number): string[] => {
  const baseColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
    '#F1948A', '#85C1E9', '#F4D03F', '#A9DFBF', '#D7BDE2', '#AED6F1'
  ];
  
  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }
  
  // Generate additional colors if needed
  const additionalColors = [];
  for (let i = baseColors.length; i < count; i++) {
    const hue = (i * 137.5) % 360; // Golden angle approximation
    additionalColors.push(`hsl(${hue}, 70%, 70%)`);
  }
  
  return [...baseColors, ...additionalColors];
};

export const calculatePercentages = (data: { amount: number }[]): { amount: number; percentage: number }[] => {
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  
  return data.map(item => ({
    ...item,
    percentage: total > 0 ? (item.amount / total) * 100 : 0
  }));
};

export const formatCurrency = (amount: number, symbol: string = '$'): string => {
  return `${symbol}${Math.abs(amount).toFixed(2)}`;
};

export const getDateRangeLabels = (days: number): string[] => {
  const labels = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    if (days <= 7) {
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    } else if (days <= 30) {
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    } else {
      labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
    }
  }
  
  return labels;
};

export const aggregateDataByDate = (
  data: { date: string; amount: number; type: 'income' | 'expense' }[],
  days: number
): { date: string; income: number; expense: number }[] => {
  const result: Record<string, { income: number; expense: number }> = {};
  
  // Initialize all dates
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    result[dateStr] = { income: 0, expense: 0 };
  }
  
  // Aggregate data
  data.forEach(item => {
    const dateStr = item.date.split('T')[0];
    if (result[dateStr]) {
      result[dateStr][item.type] += item.amount;
    }
  });
  
  return Object.entries(result).map(([date, values]) => ({
    date,
    ...values
  }));
};