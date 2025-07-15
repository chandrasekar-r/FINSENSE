/**
 * FinSense Mobile App
 * React Native conversion of the FinSense web application
 */

import React, { useEffect } from 'react'
import { StatusBar } from 'react-native'
import { ThemeProvider } from './src/contexts/ThemeContext'
import { CurrencyProvider } from './src/contexts/CurrencyContext'
import { AppNavigator } from './src/navigation/AppNavigator'
import { useAuthStore } from './src/stores/authStore'

function App(): React.JSX.Element {
  const { initializeAuth } = useAuthStore()

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return (
    <ThemeProvider>
      <CurrencyProvider>
        <StatusBar barStyle="default" />
        <AppNavigator />
      </CurrencyProvider>
    </ThemeProvider>
  )
}

export default App
