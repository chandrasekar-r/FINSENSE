# Getting Started with FinSense Mobile

## Quick Start Guide

This guide will help you get the FinSense React Native app up and running on your development machine.

## Prerequisites

### Required Software
- **Node.js** 18.x or higher
- **npm** or **yarn** package manager
- **React Native CLI** (`npm install -g react-native-cli`)
- **Git** for version control

### Platform-Specific Requirements

#### For iOS Development
- **macOS** (required for iOS development)
- **Xcode** 14.0 or higher
- **CocoaPods** (`sudo gem install cocoapods`)
- **iOS Simulator** (included with Xcode)

#### For Android Development
- **Android Studio** with Android SDK
- **Java Development Kit (JDK)** 11 or higher
- **Android SDK** API Level 24 or higher
- **Android Emulator** or physical device

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd FinSenseMobile
```

### 2. Install Dependencies
```bash
npm install
```

### 3. iOS Setup (macOS only)
```bash
cd ios
pod install
cd ..
```

### 4. Android Setup
Create `android/local.properties` file:
```
sdk.dir = /Users/[YOUR_USERNAME]/Library/Android/sdk
```

## Running the App

### iOS
```bash
# Start Metro bundler
npm start

# In another terminal, run iOS app
npm run ios
```

### Android
```bash
# Start Metro bundler
npm start

# In another terminal, run Android app
npm run android
```

## Project Structure

```
FinSenseMobile/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Screen components
│   ├── navigation/     # Navigation configuration
│   ├── stores/         # Zustand state management
│   ├── services/       # API and business logic
│   ├── contexts/       # React contexts
│   └── lib/            # Utilities and API client
├── android/            # Android-specific files
├── ios/                # iOS-specific files
└── docs/               # Documentation
```

## Key Features

### ✅ Implemented Features
- **Authentication**: Login/Register with JWT tokens
- **Dashboard**: Financial analytics with charts
- **Transactions**: Full CRUD operations with filtering
- **Receipt Scanning**: Camera integration for receipt processing
- **Navigation**: Tab-based navigation with stack navigation
- **Theme System**: Light/dark mode support

### 🚧 Coming Soon
- Budget management
- AI chat interface
- Push notifications
- Biometric authentication

## Development Workflow

### 1. Start Development Server
```bash
npm start
```

### 2. Run on Device/Simulator
```bash
# iOS
npm run ios

# Android
npm run android
```

### 3. Run Tests
```bash
npm test
```

### 4. Build for Production
```bash
# iOS
cd ios && xcodebuild -workspace FinSenseMobile.xcworkspace -scheme FinSenseMobile -configuration Release

# Android
cd android && ./gradlew assembleRelease
```

## Configuration

### API Configuration
Update API base URL in `src/lib/api.ts`:
```typescript
const API_BASE_URL = 'https://your-api-url.com/api'
```

### Theme Configuration
Modify theme colors in `src/contexts/ThemeContext.tsx`:
```typescript
const lightColors = {
  primary: '#3B82F6',
  background: '#FFFFFF',
  // ... other colors
}
```

## Troubleshooting

### Common Issues

#### Metro bundler not starting
```bash
npx react-native start --reset-cache
```

#### iOS build fails
```bash
cd ios
pod deintegrate
pod install
```

#### Android build fails
```bash
cd android
./gradlew clean
```

#### Camera permissions not working
- Check `android/app/src/main/AndroidManifest.xml` for Android permissions
- Check `ios/FinSenseMobile/Info.plist` for iOS permissions

### Development Tips

1. **Use React Native Debugger** for better debugging experience
2. **Enable Hot Reload** for faster development
3. **Use TypeScript** for better code quality
4. **Test on both platforms** regularly
5. **Use the theme system** for consistent styling

## Useful Commands

```bash
# Start Metro bundler
npm start

# Run iOS app
npm run ios

# Run Android app
npm run android

# Run tests
npm test

# Type checking
npm run type-check

# Lint code
npm run lint

# Clean cache
npm run clean
```

## Documentation

### Comprehensive Guides
- **iOS Setup**: `iOS-Setup-Guide.md`
- **Android Setup**: `ANDROID_SETUP_GUIDE.md`
- **Camera Integration**: `CAMERA_SETUP.md`
- **Dashboard Features**: `DASHBOARD_README.md`
- **Project Summary**: `PROJECT_SUMMARY.md`

### Component Documentation
- **Authentication**: `src/components/auth/`
- **Dashboard**: `src/components/dashboard/`
- **Transactions**: `src/components/transactions/`
- **Charts**: `src/components/charts/`

## Support

### Getting Help
1. Check the documentation in the `docs/` folder
2. Review the troubleshooting sections
3. Check the GitHub issues for known problems
4. Create a new issue if needed

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Next Steps

1. **Review the codebase** to understand the structure
2. **Run the app** on both iOS and Android
3. **Customize the theme** to match your design
4. **Configure the API** endpoints
5. **Add your features** following the existing patterns

## License

This project is part of the FinSense application suite. See LICENSE file for details.

---

Happy coding! 🚀