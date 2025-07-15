// Vite PWA handles service worker registration automatically
// This file provides PWA utilities and install prompt handling

// PWA install prompt handling
let deferredPrompt: any = null

if (typeof window !== 'undefined') {
  // Handle install prompt
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt = e
    console.log('PWA install prompt available')
  })

  // Register service worker updates in production
  try {
    import('virtual:pwa-register').then(({ registerSW }) => {
      const updateSW = registerSW({
        onNeedRefresh() {
          console.log('New content available, please refresh!')
          // You can show a toast notification here
          if (confirm('New version available! Reload to update?')) {
            updateSW(true)
          }
        },
        onOfflineReady() {
          console.log('App ready to work offline')
        },
      })
    })
  } catch (error) {
    console.log('PWA registration not available in development')
  }
}

export const installPWA = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response to the install prompt: ${outcome}`)
    deferredPrompt = null
  }
}

// Check if app is running in standalone mode
export const isStandalone = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone ||
         document.referrer.includes('android-app://')
}