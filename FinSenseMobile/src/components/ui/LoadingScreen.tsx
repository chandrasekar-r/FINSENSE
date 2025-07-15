import React from 'react'
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'

export const LoadingScreen: React.FC = () => {
  const { colors } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.text, { color: colors.text }]}>Loading...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
})