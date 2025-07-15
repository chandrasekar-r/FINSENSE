import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface LoadingSkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width,
  height,
  borderRadius = 8,
  style,
}) => {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.border + '60'],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor,
          borderRadius,
        },
        style,
      ]}
    />
  );
};

export const DashboardSkeleton: React.FC = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <LoadingSkeleton width={180} height={24} />
        <LoadingSkeleton width={80} height={36} borderRadius={6} />
      </View>
      
      {/* Summary Card */}
      <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
        <LoadingSkeleton width={120} height={16} />
        <View style={styles.spacing} />
        <LoadingSkeleton width={200} height={32} />
        <View style={styles.spacing} />
        <LoadingSkeleton width={100} height={14} />
      </View>
      
      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <LoadingSkeleton width={80} height={14} />
          <View style={styles.spacing} />
          <LoadingSkeleton width={120} height={32} />
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <LoadingSkeleton width={80} height={14} />
          <View style={styles.spacing} />
          <LoadingSkeleton width={120} height={32} />
        </View>
      </View>
      
      {/* Chart Section */}
      <View style={[styles.chartSection, { backgroundColor: colors.card }]}>
        <LoadingSkeleton width={150} height={16} />
        <View style={styles.spacing} />
        <LoadingSkeleton width={280} height={200} borderRadius={16} />
      </View>
      
      {/* Transactions */}
      <View style={styles.transactionSection}>
        <LoadingSkeleton width={180} height={20} />
        <View style={styles.spacing} />
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.transactionItem, { backgroundColor: colors.card }]}>
            <View style={styles.transactionLeft}>
              <LoadingSkeleton width={40} height={40} borderRadius={20} />
              <View style={styles.transactionInfo}>
                <LoadingSkeleton width={120} height={16} />
                <View style={styles.smallSpacing} />
                <LoadingSkeleton width={80} height={12} />
              </View>
            </View>
            <View style={styles.transactionRight}>
              <LoadingSkeleton width={80} height={16} />
              <View style={styles.smallSpacing} />
              <LoadingSkeleton width={60} height={12} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryCard: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  chartSection: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  transactionSection: {
    marginBottom: 24,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionInfo: {
    marginLeft: 12,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  spacing: {
    height: 8,
  },
  smallSpacing: {
    height: 4,
  },
});