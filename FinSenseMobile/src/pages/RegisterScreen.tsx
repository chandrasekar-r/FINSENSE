import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useAuthStore } from '../stores/authStore'
import { useTheme } from '../contexts/ThemeContext'
import { AuthStackParamList } from '../navigation/AuthNavigator'

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>

interface Props {
  navigation: RegisterScreenNavigationProp
}

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
  })
  const { register, isLoading } = useAuthStore()
  const { colors } = useTheme()

  const handleRegister = async () => {
    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long')
      return
    }

    try {
      await register({
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
      })
      Alert.alert('Success', 'Account created successfully! Please sign in.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ])
    } catch (error) {
      Alert.alert('Registration Failed', (error as Error).message)
    }
  }

  const updateFormData = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const styles = createStyles(colors)

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join FinSense today</Text>

            <View style={styles.form}>
              <View style={styles.nameRow}>
                <TextInput
                  style={[styles.input, styles.nameInput]}
                  placeholder="First Name"
                  placeholderTextColor={colors.text + '80'}
                  value={formData.first_name}
                  onChangeText={(value) => updateFormData('first_name', value)}
                  autoCapitalize="words"
                />
                <TextInput
                  style={[styles.input, styles.nameInput]}
                  placeholder="Last Name"
                  placeholderTextColor={colors.text + '80'}
                  value={formData.last_name}
                  onChangeText={(value) => updateFormData('last_name', value)}
                  autoCapitalize="words"
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.text + '80'}
                value={formData.email}
                onChangeText={(value) => updateFormData('email', value)}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.text + '80'}
                value={formData.password}
                onChangeText={(value) => updateFormData('password', value)}
                secureTextEntry
                autoComplete="password"
              />

              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor={colors.text + '80'}
                value={formData.confirmPassword}
                onChangeText={(value) => updateFormData('confirmPassword', value)}
                secureTextEntry
                autoComplete="password"
              />

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.linkText}>
                  Already have an account? Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text + 'CC',
    textAlign: 'center',
    marginBottom: 48,
  },
  form: {
    gap: 16,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
  },
  nameInput: {
    flex: 1,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  linkButton: {
    marginTop: 16,
  },
  linkText: {
    color: colors.primary,
    fontSize: 16,
    textAlign: 'center',
  },
})