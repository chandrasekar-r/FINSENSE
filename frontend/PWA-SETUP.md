# FinSense PWA Setup for iOS

## How to Add FinSense to iOS Home Screen

### Steps:
1. Open Safari on your iPhone/iPad
2. Navigate to your FinSense URL (e.g., http://your-server:3001)
3. Tap the **Share** button (square with arrow pointing up)
4. Scroll down and tap **Add to Home Screen**
5. Tap **Add** in the top right corner

### Features Added:
- ✅ PWA manifest configuration
- ✅ Service worker for offline capability
- ✅ iOS-specific meta tags
- ✅ Mobile-responsive modals
- ✅ Touch-friendly buttons
- ✅ Optimized viewport settings

### Mobile Optimizations:
- Responsive modals that fit mobile screens
- Touch-friendly button sizes
- Scrollable content areas
- Full-height modal support
- Stackable action buttons on mobile

### Testing PWA:
1. Build the app: `npm run build`
2. Serve the built app: `npm run start`
3. Access via Safari on your iOS device
4. Follow the steps above to add to home screen

### Troubleshooting:
- Make sure you're using HTTPS (required for PWA)
- Clear Safari cache if icons don't appear
- Ensure service worker is registered in browser console