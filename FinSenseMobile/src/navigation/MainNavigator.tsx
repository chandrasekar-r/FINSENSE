import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useTheme } from '../contexts/ThemeContext'

// Screens
import { DashboardScreen } from '../pages/DashboardScreen'
import { TransactionsScreen } from '../pages/TransactionsScreen'
import { BudgetsScreen } from '../pages/BudgetsScreen'
import { ReceiptScanScreen } from '../pages/ReceiptScanScreen'
import { ChatScreen } from '../pages/ChatScreen'
import { SettingsScreen } from '../pages/SettingsScreen'
import { TransactionDetailsScreen } from '../pages/TransactionDetailsScreen'

export type MainTabParamList = {
  Dashboard: undefined
  Transactions: undefined
  Scan: undefined
  Budgets: undefined
  Chat: undefined
  Settings: undefined
}

export type MainStackParamList = {
  MainTabs: undefined
  TransactionDetails: { transactionId: string }
}

const Tab = createBottomTabNavigator<MainTabParamList>()
const Stack = createStackNavigator<MainStackParamList>()

const MainTabs: React.FC = () => {
  const { colors } = useTheme()

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: string

          switch (route.name) {
            case 'Dashboard':
              iconName = 'dashboard'
              break
            case 'Transactions':
              iconName = 'receipt'
              break
            case 'Scan':
              iconName = 'camera-alt'
              break
            case 'Budgets':
              iconName = 'account-balance-wallet'
              break
            case 'Chat':
              iconName = 'chat'
              break
            case 'Settings':
              iconName = 'settings'
              break
            default:
              iconName = 'dashboard'
          }

          return <Icon name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text + '80', // 50% opacity
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.text,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Scan" component={ReceiptScanScreen} />
      <Tab.Screen name="Budgets" component={BudgetsScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  )
}

export const MainNavigator: React.FC = () => {
  const { colors } = useTheme()

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabs} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="TransactionDetails" 
        component={TransactionDetailsScreen}
        options={{ 
          title: 'Transaction Details',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  )
}