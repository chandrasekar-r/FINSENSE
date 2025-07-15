import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import { LoginScreen } from '../pages/LoginScreen'
import { RegisterScreen } from '../pages/RegisterScreen'

export type AuthStackParamList = {
  Login: undefined
  Register: undefined
}

const Stack = createStackNavigator<AuthStackParamList>()

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  )
}