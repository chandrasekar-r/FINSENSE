import React from 'react'
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'

export const SettingsScreen: React.FC = () => {
  const { colors, theme, toggleTheme } = useTheme()
  const styles = createStyles(colors)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        
        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Appearance</Text>
          <TouchableOpacity style={styles.settingItem} onPress={toggleTheme}>
            <Text style={styles.settingText}>Theme</Text>
            <Text style={styles.settingValue}>
              {theme === 'light' ? '☀️ Light' : '🌙 Dark'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>⚙️ Settings & Preferences</Text>
          <Text style={styles.placeholderText}>
            This screen will include user preferences, currency settings, 
            notification preferences, and account management features.
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
  settingsGroup: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingText: {
    fontSize: 16,
    color: colors.text,
  },
  settingValue: {
    fontSize: 16,
    color: colors.text + 'CC',
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