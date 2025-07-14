import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'

export const useAuthExpiration = () => {
  const handleAuthExpired = useAuthStore((state) => state.handleAuthExpired)
  const syncTokensFromStorage = useAuthStore((state) => state.syncTokensFromStorage)

  useEffect(() => {
    const handleAuthExpiredEvent = () => {
      console.log('Auth expired event received, logging out user')
      handleAuthExpired()
    }

    const handleTokensRefreshedEvent = () => {
      console.log('Tokens refreshed event received, syncing with store')
      syncTokensFromStorage()
    }

    // Listen for auth events from API interceptor
    window.addEventListener('auth-expired', handleAuthExpiredEvent)
    window.addEventListener('tokens-refreshed', handleTokensRefreshedEvent)

    return () => {
      window.removeEventListener('auth-expired', handleAuthExpiredEvent)
      window.removeEventListener('tokens-refreshed', handleTokensRefreshedEvent)
    }
  }, [handleAuthExpired, syncTokensFromStorage])
}