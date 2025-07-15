import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../../contexts/ThemeContext';
import { SpendingTrend } from '../../services/dashboardService';
import { getChartConfig, aggregateDataByDate } from '../../utils/chartUtils';

interface SpendingTrendChartProps {
  data: SpendingTrend[];
}

const screenWidth = Dimensions.get('window').width;

export const SpendingTrendChart: React.FC<SpendingTrendChartProps> = ({ data }) => {
  const { colors } = useTheme();

  // Aggregate data for the last 7 days
  const aggregatedData = aggregateDataByDate(data, 7);
  
  const expenses = aggregatedData.map(item => item.expense);
  const labels = aggregatedData.map(item => {
    const d = new Date(item.date);
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  });

  const chartConfig = getChartConfig(colors);

  const chartData = {
    labels,
    datasets: [
      {
        data: expenses,
        color: (opacity = 1) => colors.primary + Math.round(opacity * 255).toString(16).padStart(2, '0'),
        strokeWidth: 2,
      },
    ],
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <LineChart
        data={chartData}
        width={screenWidth - 32}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withInnerLines={false}
        withOuterLines={false}
        withVerticalLines={false}
        withHorizontalLines={true}
        withDots={true}
        withShadow={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
  },
});