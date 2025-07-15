// Vite PWA handles service worker registration automatically
// This file provides PWA utilities and install prompt handling

// PWA install prompt handling
let deferredPrompt: any = null

if (typeof window !== 'undefined') {
  // Handle install prompt
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt = e
  })

  // Register service worker updates in production
  try {
    import('virtual:pwa-register').then(({ registerSW }) => {
      const updateSW = registerSW({
        onNeedRefresh() {
          // You can show a toast notification here
          if (confirm('New version available! Reload to update?')) {
            updateSW(true)
          }
        },
        onOfflineReady() {
        },
      })
    })
  } catch (error) {
  }
}

export const installPWA = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    deferredPrompt = null
  }
}

// Check if app is running in standalone mode
export const isStandalone = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone ||
         document.referrer.includes('android-app://')
}