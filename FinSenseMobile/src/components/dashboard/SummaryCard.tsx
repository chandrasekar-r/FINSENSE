import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useCurrency } from '../../contexts/CurrencyContext';

interface SummaryCardProps {
  title: string;
  amount: number;
  subtitle?: string;
  icon?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onPress?: () => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ 
  title, 
  amount, 
  subtitle, 
  icon,
  trend,
  onPress 
}) => {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  
  const styles = createStyles(colors);

  const CardWrapper = onPress ? TouchableOpacity : View;

  return (
    <CardWrapper 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {icon && <Text style={styles.icon}>{icon}</Text>}
      </View>
      
      <Text style={styles.amount}>
        {formatAmount(amount)}
      </Text>
      
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
      
      {trend && (
        <View style={styles.trendContainer}>
          <Text style={[
            styles.trendText,
            { color: trend.isPositive ? colors.success : colors.error }
          ]}>
            {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value).toFixed(1)}%
          </Text>
          <Text style={styles.trendLabel}>vs last month</Text>
        </View>
      )}
    </CardWrapper>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: colors.text,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text + 'CC',
  },
  icon: {
    fontSize: 20,
  },
  amount: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.text + '80',
    marginBottom: 8,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  trendLabel: {
    fontSize: 12,
    color: colors.text + '80',
  },
});