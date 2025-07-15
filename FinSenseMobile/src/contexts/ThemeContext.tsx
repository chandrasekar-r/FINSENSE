import React, { createContext, useContext, useEffect, useState } from 'react'
import { Appearance, ColorSchemeName } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  colors: {
    primary: string
    background: string
    card: string
    text: string
    border: string
    notification: string
    success: string
    warning: string
    error: string
  }
}

const lightColors = {
  primary: '#3B82F6',
  background: '#FFFFFF',
  card: '#F9FAFB',
  text: '#111827',
  border: '#E5E7EB',
  notification: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
}

const darkColors = {
  primary: '#60A5FA',
  background: '#111827',
  card: '#1F2937',
  text: '#F9FAFB',
  border: '#374151',
  notification: '#F87171',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    // Load saved theme or use system preference
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('finsense-theme') as Theme
        if (savedTheme) {
          setThemeState(savedTheme)
        } else {
          // Use system preference
          const systemTheme = Appearance.getColorScheme()
          setThemeState(systemTheme === 'dark' ? 'dark' : 'light')
        }
      } catch (error) {
        console.error('Failed to load theme:', error)
      }
    }

    loadTheme()

    // Listen to system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }: { colorScheme: ColorSchemeName }) => {
      // Only update if no saved theme preference
      AsyncStorage.getItem('finsense-theme').then(savedTheme => {
        if (!savedTheme) {
          setThemeState(colorScheme === 'dark' ? 'dark' : 'light')
        }
      })
    })

    return () => subscription.remove()
  }, [])

  const setTheme = async (newTheme: Theme) => {
    try {
      await AsyncStorage.setItem('finsense-theme', newTheme)
      setThemeState(newTheme)
    } catch (error) {
      console.error('Failed to save theme:', error)
    }
  }

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  const colors = theme === 'light' ? lightColors : darkColors

  const value = {
    theme,
    toggleTheme,
    setTheme,
    colors
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}