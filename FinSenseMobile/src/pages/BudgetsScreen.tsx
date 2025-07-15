import React from 'react'
import { View, Text, StyleSheet, SafeAreaView } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'

export const BudgetsScreen: React.FC = () => {
  const { colors } = useTheme()
  const styles = createStyles(colors)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Budgets</Text>
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>💰 Budget Management</Text>
          <Text style={styles.placeholderText}>
            This screen will display budget tracking, spending limits, 
            budget progress, and budget creation/management features.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
  },
  placeholderCard: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary + '30',
    borderStyle: 'dashed',
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: colors.text + 'CC',
    lineHeight: 20,
    textAlign: 'center',
  },
})