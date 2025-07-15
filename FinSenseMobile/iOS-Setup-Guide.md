# FinSense iOS Setup and Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [iOS Development Environment Setup](#ios-development-environment-setup)
3. [Xcode Configuration](#xcode-configuration)
4. [CocoaPods Installation and Usage](#cocoapods-installation-and-usage)
5. [App Signing and Certificates](#app-signing-and-certificates)
6. [Running the App](#running-the-app)
7. [Building for Distribution](#building-for-distribution)
8. [App Store Deployment](#app-store-deployment)
9. [Troubleshooting](#troubleshooting)
10. [iOS-Specific Permissions and Configurations](#ios-specific-permissions-and-configurations)

---

## Prerequisites

Before starting iOS development for FinSense, ensure you have:

- **macOS** (iOS development requires macOS)
- **Apple Developer Account** (free for development, $99/year for distribution)
- **Xcode 15.0+** (latest stable version recommended)
- **Node.js 18+** (as specified in package.json)
- **React Native CLI** installed globally
- **CocoaPods** for dependency management
- **Watchman** for file watching (optional but recommended)

### System Requirements
- macOS 13.0 (Ventura) or later
- At least 8GB RAM (16GB recommended)
- 100GB+ free disk space
- Intel or Apple Silicon Mac

---

## iOS Development Environment Setup

### 1. Install Xcode

```bash
# Install Xcode from Mac App Store or download from Apple Developer Portal
# After installation, accept the license
sudo xcodebuild -license accept

# Install Xcode command line tools
xcode-select --install

# Verify installation
xcode-select -p
```

### 2. Install Node.js and Package Managers

```bash
# Install Node.js (using nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Install React Native CLI globally
npm install -g @react-native-community/cli

# Install CocoaPods
sudo gem install cocoapods

# Install Watchman (optional but recommended)
brew install watchman
```

### 3. Verify Installation

```bash
# Check versions
node --version
npm --version
react-native --version
pod --version
```

---

## Xcode Configuration

### 1. Open Project in Xcode

```bash
# Navigate to project directory
cd /path/to/FinSenseMobile

# Open iOS project in Xcode
open ios/FinSenseMobile.xcworkspace
```

**Note**: Always open the `.xcworkspace` file, not the `.xcodeproj` file when using CocoaPods.

### 2. Configure Project Settings

1. **Select your project** in the navigator
2. **General Tab**:
   - **Bundle Identifier**: Set a unique identifier (e.g., `com.yourcompany.finsensemobile`)
   - **Version**: Set to `1.0.0` (matches MARKETING_VERSION)
   - **Build**: Set to `1` (matches CURRENT_PROJECT_VERSION)
   - **Deployment Target**: iOS 13.0 or later
   - **Device Orientation**: Portrait, Landscape Left, Landscape Right

3. **Signing & Capabilities**:
   - Select your **Team** (Apple Developer Account)
   - Enable **Automatically manage signing**
   - Choose **Bundle Identifier**

### 3. Required Capabilities

Add these capabilities if needed:
- **App Transport Security** (already configured in Info.plist)
- **Camera** (for receipt scanning)
- **Photo Library** (for receipt uploads)
- **Network** (for API calls)

---

## CocoaPods Installation and Usage

### 1. Install CocoaPods

```bash
# Install CocoaPods globally
sudo gem install cocoapods

# Setup CocoaPods
pod setup
```

### 2. Install Dependencies

```bash
# Navigate to iOS directory
cd ios

# Install pods
pod install

# If you encounter issues, try:
pod install --repo-update

# Or clean and reinstall
pod deintegrate
pod install
```

### 3. Update Dependencies

```bash
# Update to latest versions
pod update

# Update specific pod
pod update [PodName]

# Check outdated pods
pod outdated
```

### 4. Common CocoaPods Commands

```bash
# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# Clean pods
pod clean

# Show pod information
pod search [PodName]

# Validate Podfile
pod lib lint
```

---

## App Signing and Certificates

### 1. Apple Developer Account Setup

1. **Create Apple ID**: Visit [developer.apple.com](https://developer.apple.com)
2. **Join Apple Developer Program**: $99/year for App Store distribution
3. **Create App ID**: In Developer Portal → Certificates, Identifiers & Profiles

### 2. Certificate Management

#### Development Certificates

```bash
# Generate certificate signing request (CSR)
# Use Keychain Access → Certificate Assistant → Request Certificate from CA
```

1. **Open Keychain Access**
2. **Certificate Assistant → Request Certificate from CA**
3. **Enter your email and common name**
4. **Save to disk**

#### Distribution Certificates

1. **In Apple Developer Portal**:
   - Go to Certificates, Identifiers & Profiles
   - Create iOS Development Certificate
   - Create iOS Distribution Certificate

2. **Download and install certificates**:
   - Double-click .cer files to install in Keychain

### 3. Provisioning Profiles

#### Development Profile

```bash
# Create in Apple Developer Portal
# 1. Go to Profiles → Development
# 2. Create new profile
# 3. Select App ID and certificates
# 4. Select devices for testing
# 5. Download and install
```

#### Distribution Profile

```bash
# For App Store distribution
# 1. Go to Profiles → Distribution
# 2. Create App Store profile
# 3. Select App ID and distribution certificate
# 4. Download and install
```

### 4. Automatic Code Signing (Recommended)

In Xcode project settings:
1. **Enable "Automatically manage signing"**
2. **Select your team**
3. **Xcode will handle certificates and profiles**

---

## Running the App

### 1. iOS Simulator

```bash
# Start Metro bundler
npm start

# Run on iOS simulator (in separate terminal)
npm run ios

# Run on specific simulator
npx react-native run-ios --simulator="iPhone 15 Pro"

# List available simulators
xcrun simctl list devices
```

### 2. Physical Device

#### Prerequisites
- Device registered in Developer Portal
- Valid development certificate
- Development provisioning profile

#### Steps

```bash
# Connect device via USB
# Trust computer on device
# Enable Developer Mode in Settings → Privacy & Security

# Run on connected device
npx react-native run-ios --device

# Or specify device
npx react-native run-ios --device "Your Device Name"
```

### 3. Debug Menu

On simulator: **Cmd + D**
On device: **Shake device**

Options:
- **Reload**: Cmd + R
- **Debug**: Enable remote debugging
- **Inspector**: Element inspection
- **Performance**: Performance monitoring

---

## Building for Distribution

### 1. Archive Build

#### Using Xcode

1. **Select "Any iOS Device"** in scheme
2. **Product → Archive**
3. **Wait for build to complete**
4. **Organizer window opens**

#### Using Command Line

```bash
# Clean build folder
xcodebuild clean -workspace ios/FinSenseMobile.xcworkspace -scheme FinSenseMobile

# Create archive
xcodebuild archive \
  -workspace ios/FinSenseMobile.xcworkspace \
  -scheme FinSenseMobile \
  -archivePath ios/build/FinSenseMobile.xcarchive \
  -configuration Release \
  -destination generic/platform=iOS \
  -allowProvisioningUpdates

# Export IPA
xcodebuild -exportArchive \
  -archivePath ios/build/FinSenseMobile.xcarchive \
  -exportPath ios/build \
  -exportOptionsPlist ios/ExportOptions.plist
```

### 2. Export Options

Create `ios/ExportOptions.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
</dict>
</plist>
```

### 3. Build Configurations

#### Release Configuration

In Xcode:
1. **Edit Scheme → Run → Build Configuration → Release**
2. **Optimize for release builds**
3. **Disable debugging features**

#### Environment Variables

```bash
# Set NODE_ENV for release
export NODE_ENV=production

# Build release bundle
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output ios/main.jsbundle \
  --assets-dest ios/assets
```

---

## App Store Deployment

### 1. App Store Connect Setup

1. **Create App Record**:
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Apps → New App
   - Enter app information

2. **App Information**:
   - App Name: FinSense Mobile
   - Primary Language: English
   - Bundle ID: com.yourcompany.finsensemobile
   - SKU: Unique identifier

### 2. App Store Submission

#### Using Xcode

1. **Archive the app** (Product → Archive)
2. **In Organizer**: 
   - Select archive
   - Click "Distribute App"
   - Choose "iOS App Store"
   - Upload to App Store Connect

#### Using Command Line

```bash
# Upload to App Store Connect
xcrun altool --upload-app \
  -f ios/build/FinSenseMobile.ipa \
  -t ios \
  -u your.email@example.com \
  -p your-app-specific-password
```

### 3. App Store Metadata

#### Required Information

- **App Name**: FinSense Mobile
- **Subtitle**: Smart Financial Management
- **Description**: 
  ```
  FinSense Mobile is a comprehensive financial management app that helps you track expenses, manage budgets, and gain insights into your spending patterns. 
  
  Key Features:
  • Receipt scanning with OCR technology
  • Automatic expense categorization
  • Budget tracking and alerts
  • Spending analytics and insights
  • Secure data encryption
  • Cross-platform synchronization
  ```

- **Keywords**: finance, budget, expense, money, receipt, tracking
- **Support URL**: https://your-domain.com/support
- **Marketing URL**: https://your-domain.com

#### Screenshots

Required sizes:
- **iPhone 6.7"**: 1284 × 2778 pixels
- **iPhone 6.5"**: 1242 × 2688 pixels
- **iPhone 5.5"**: 1242 × 2208 pixels
- **iPad Pro 12.9"**: 2048 × 2732 pixels

### 4. App Review Process

#### Pre-submission Checklist

- [ ] App follows Apple Human Interface Guidelines
- [ ] All required permissions are explained
- [ ] App doesn't crash on launch
- [ ] All features work as described
- [ ] Privacy policy is available
- [ ] App handles network failures gracefully
- [ ] Screenshots match app functionality

#### Common Rejection Reasons

1. **Incomplete Information**: Missing metadata or screenshots
2. **Functionality Issues**: App crashes or doesn't work
3. **Guideline Violations**: UI/UX doesn't follow Apple guidelines
4. **Permission Issues**: Missing usage descriptions
5. **Content Issues**: Inappropriate content or functionality

---

## Troubleshooting

### 1. Build Errors

#### CocoaPods Issues

```bash
# Common fixes
cd ios
pod deintegrate
pod install

# Clear cache
pod cache clean --all

# Update CocoaPods
sudo gem install cocoapods
pod repo update
```

#### Xcode Build Errors

```bash
# Clean build folder
# Product → Clean Build Folder (Cmd + Shift + K)

# Delete derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# Reset simulator
xcrun simctl erase all
```

#### Metro Bundle Issues

```bash
# Clear Metro cache
npx react-native start --reset-cache

# Clear npm cache
npm cache clean --force

# Clear node_modules
rm -rf node_modules
npm install
```

### 2. Runtime Errors

#### Common Issues

1. **Red Screen Errors**:
   - Check console logs
   - Verify imports and exports
   - Check for typos in code

2. **White Screen**:
   - Check if bundle is loaded
   - Verify entry point (index.js)
   - Check for JavaScript errors

3. **Network Errors**:
   - Verify API endpoints
   - Check network permissions
   - Verify SSL certificates

### 3. Device-Specific Issues

#### Physical Device Problems

```bash
# Check device logs
xcrun devicectl list devices
xcrun devicectl device log --device [DEVICE_ID]

# Check provisioning
xcrun devicectl list devices --provisioning-profiles
```

#### Simulator Issues

```bash
# Reset simulator
xcrun simctl erase all

# Boot specific simulator
xcrun simctl boot "iPhone 15 Pro"

# Install app on simulator
xcrun simctl install booted path/to/app.app
```

### 4. Performance Issues

#### Bundle Size Optimization

```bash
# Analyze bundle size
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output ios/main.jsbundle \
  --assets-dest ios/assets \
  --verbose

# Enable Hermes (if not already enabled)
# In ios/Podfile, ensure:
# :hermes_enabled => true
```

#### Memory Issues

1. **Check for memory leaks**:
   - Use Xcode Instruments
   - Monitor memory usage
   - Profile app performance

2. **Optimize images**:
   - Use appropriate image formats
   - Implement lazy loading
   - Compress images

---

## iOS-Specific Permissions and Configurations

### 1. Info.plist Configuration

Current configuration in `/ios/FinSenseMobile/Info.plist`:

```xml
<!-- Location permission (currently empty) -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>FinSense needs location access to categorize transactions by location</string>

<!-- Camera permission for receipt scanning -->
<key>NSCameraUsageDescription</key>
<string>FinSense needs camera access to scan receipts</string>

<!-- Photo library permission for receipt uploads -->
<key>NSPhotoLibraryUsageDescription</key>
<string>FinSense needs photo library access to upload receipt images</string>

<!-- Network usage -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSAllowsLocalNetworking</key>
    <true/>
</dict>
```

### 2. Required Permissions

Add these permissions to Info.plist:

```xml
<!-- Face ID / Touch ID for secure authentication -->
<key>NSFaceIDUsageDescription</key>
<string>FinSense uses Face ID to secure your financial data</string>

<!-- Contacts (if needed for expense sharing) -->
<key>NSContactsUsageDescription</key>
<string>FinSense needs contacts access to share expenses with friends</string>

<!-- Calendar (if needed for recurring transactions) -->
<key>NSCalendarsUsageDescription</key>
<string>FinSense needs calendar access to set up recurring transactions</string>

<!-- Notifications -->
<key>NSUserNotificationUsageDescription</key>
<string>FinSense sends notifications for budget alerts and transaction reminders</string>
```

### 3. Requesting Permissions in Code

Create a permissions utility:

```typescript
// src/utils/permissions.ts
import { Platform } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export const requestCameraPermission = async () => {
  if (Platform.OS === 'ios') {
    const result = await request(PERMISSIONS.IOS.CAMERA);
    return result === RESULTS.GRANTED;
  }
  return false;
};

export const requestPhotoLibraryPermission = async () => {
  if (Platform.OS === 'ios') {
    const result = await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
    return result === RESULTS.GRANTED;
  }
  return false;
};
```

### 4. App Transport Security

Configure network security in Info.plist:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <!-- Allow HTTP for local development -->
    <key>NSAllowsLocalNetworking</key>
    <true/>
    
    <!-- For production, use HTTPS only -->
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    
    <!-- Exception for specific domains if needed -->
    <key>NSExceptionDomains</key>
    <dict>
        <key>your-api-domain.com</key>
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <true/>
        </dict>
    </dict>
</dict>
```

### 5. Background Modes

If needed, add background capabilities:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>background-fetch</string>
    <string>background-processing</string>
</array>
```

### 6. Privacy Manifest

Create `ios/FinSenseMobile/PrivacyInfo.xcprivacy`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSPrivacyCollectedDataTypes</key>
    <array>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeFinancialInfo</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurpose</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
```

---

## Best Practices

### 1. Code Organization

- Keep iOS-specific code in platform files (.ios.ts)
- Use TypeScript for better type safety
- Follow React Native best practices
- Implement proper error handling

### 2. Performance Optimization

- Use Hermes JavaScript engine
- Implement lazy loading
- Optimize images and assets
- Monitor memory usage

### 3. Security

- Use Keychain for sensitive data
- Implement proper authentication
- Use HTTPS for all network calls
- Enable App Transport Security

### 4. Testing

- Write unit tests for business logic
- Test on multiple devices and iOS versions
- Use Xcode Instruments for performance testing
- Test offline functionality

### 5. Deployment

- Use semantic versioning
- Keep detailed changelogs
- Test thoroughly before release
- Monitor app performance post-release

---

## Resources

### Documentation
- [React Native iOS Guide](https://reactnative.dev/docs/running-on-device)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [Xcode User Guide](https://developer.apple.com/xcode/resources/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

### Tools
- [Xcode](https://developer.apple.com/xcode/)
- [React Native Debugger](https://github.com/jhen0409/react-native-debugger)
- [Flipper](https://fbflipper.com/)
- [App Store Connect](https://appstoreconnect.apple.com)

### Community
- [React Native Community](https://reactnative.dev/community/overview)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/react-native)
- [GitHub Issues](https://github.com/facebook/react-native/issues)

---

## Support

For FinSense-specific issues:
- Check project documentation
- Review troubleshooting section
- Contact development team
- Submit GitHub issues

Remember to keep this guide updated as the project evolves and new iOS versions are released.