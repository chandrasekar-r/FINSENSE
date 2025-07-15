import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useTheme } from '../../contexts/ThemeContext';
import { SpendingByCategory } from '../../services/dashboardService';
import { getChartConfig } from '../../utils/chartUtils';

interface SpendingPieChartProps {
  data: SpendingByCategory[];
}

const screenWidth = Dimensions.get('window').width;

export const SpendingPieChart: React.FC<SpendingPieChartProps> = ({ data }) => {
  const { colors } = useTheme();

  const chartData = data.map(item => ({
    name: item.categoryName,
    population: item.amount,
    color: item.color,
    legendFontColor: colors.text,
    legendFontSize: 12,
  }));

  const chartConfig = getChartConfig(colors);

  if (data.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <PieChart
        data={chartData}
        width={screenWidth - 32}
        height={220}
        chartConfig={chartConfig}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        center={[10, 0]}
        absolute
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
});