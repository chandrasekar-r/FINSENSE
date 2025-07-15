# FinSense Android Setup and Deployment Guide

This comprehensive guide will walk you through setting up Android development environment, configuring the FinSense React Native app, and deploying it to the Google Play Store.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Android Development Environment Setup](#android-development-environment-setup)
3. [Android Studio Configuration](#android-studio-configuration)
4. [SDK and Build Tools Installation](#sdk-and-build-tools-installation)
5. [AVD (Android Virtual Device) Setup](#avd-android-virtual-device-setup)
6. [Project Configuration](#project-configuration)
7. [Running the App](#running-the-app)
8. [Building for Production](#building-for-production)
9. [Google Play Store Deployment](#google-play-store-deployment)
10. [Troubleshooting](#troubleshooting)
11. [Android-Specific Permissions](#android-specific-permissions)
12. [Gradle Configuration and Optimization](#gradle-configuration-and-optimization)

## Prerequisites

- **Node.js**: Version 18 or higher (as specified in package.json)
- **Java Development Kit (JDK)**: Version 17 or higher
- **Git**: For version control
- **macOS/Linux/Windows**: Development machine
- **Android Studio**: Latest stable version
- **React Native CLI**: Globally installed

### Install Node.js and npm

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Verify installation
node --version
npm --version
```

### Install React Native CLI

```bash
npm install -g @react-native-community/cli
```

### Install Java Development Kit (JDK)

```bash
# macOS with Homebrew
brew install openjdk@17

# Add to your shell profile (.zshrc, .bashrc, etc.)
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH=$JAVA_HOME/bin:$PATH

# Verify installation
java -version
javac -version
```

## Android Development Environment Setup

### 1. Download and Install Android Studio

1. Visit [Android Studio Download Page](https://developer.android.com/studio)
2. Download the latest stable version for your operating system
3. Install Android Studio following the setup wizard
4. During installation, ensure these components are selected:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device
   - Performance (Intel HAXM on Intel processors)

### 2. Configure Environment Variables

Add these environment variables to your shell profile:

```bash
# Android Environment Variables
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
# export ANDROID_HOME=$HOME/Android/Sdk        # Linux
# export ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk  # Windows

export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Reload your shell profile:

```bash
source ~/.zshrc  # or ~/.bashrc
```

Verify the setup:

```bash
echo $ANDROID_HOME
adb --version
```

## Android Studio Configuration

### 1. Initial Setup

1. Launch Android Studio
2. Choose "Do not import settings" if this is your first installation
3. Complete the setup wizard
4. Select "Standard" installation type
5. Choose your UI theme
6. Verify the SDK components to be downloaded

### 2. SDK Manager Configuration

1. Open Android Studio
2. Go to **Tools** > **SDK Manager** (or **Android Studio** > **Preferences** > **Appearance & Behavior** > **System Settings** > **Android SDK** on macOS)
3. In the **SDK Platforms** tab, ensure these are installed:
   - Android 14 (API level 34)
   - Android 13 (API level 33)
   - Android 12 (API level 31)
   - Android 11 (API level 30)
   - Android 10 (API level 29)

### 3. Configure Build Tools

In the **SDK Tools** tab, ensure these are installed:
- Android SDK Build-Tools 35.0.0 (as specified in build.gradle)
- Android SDK Platform-Tools
- Android SDK Tools
- Android Emulator
- Intel x86 Emulator Accelerator (HAXM installer)
- NDK (Side by side) version 27.1.12297006

## SDK and Build Tools Installation

### Current Project Configuration

Based on the project's `android/build.gradle`, the following versions are configured:

```gradle
buildToolsVersion = "35.0.0"
minSdkVersion = 24
compileSdkVersion = 35
targetSdkVersion = 35
ndkVersion = "27.1.12297006"
kotlinVersion = "2.1.20"
```

### Install Required SDK Versions

```bash
# List installed SDKs
sdkmanager --list

# Install required SDK platforms
sdkmanager "platforms;android-35"
sdkmanager "platforms;android-34"
sdkmanager "platforms;android-33"
sdkmanager "platforms;android-31"
sdkmanager "platforms;android-30"
sdkmanager "platforms;android-29"
sdkmanager "platforms;android-24"

# Install build tools
sdkmanager "build-tools;35.0.0"
sdkmanager "build-tools;34.0.0"
sdkmanager "build-tools;33.0.0"

# Install NDK
sdkmanager "ndk;27.1.12297006"

# Install platform tools
sdkmanager "platform-tools"
```

## AVD (Android Virtual Device) Setup

### 1. Create a New AVD

1. Open Android Studio
2. Go to **Tools** > **AVD Manager**
3. Click **Create Virtual Device**
4. Select a device definition (recommended: Pixel 6)
5. Choose a system image:
   - **API Level 34** (Android 14) - for testing latest features
   - **API Level 29** (Android 10) - for minimum support testing
   - **API Level 31** (Android 12) - for general testing

### 2. Configure AVD Settings

**Hardware Profile:**
- RAM: 4GB minimum
- VM Heap: 512MB
- Internal Storage: 8GB
- Graphics: Hardware - GLES 2.0

**Advanced Settings:**
- Enable hardware keyboard
- Camera: Webcam or emulated
- Network: Full
- Enable Device Frame

### 3. Create Multiple AVDs for Testing

Create AVDs for different scenarios:

```bash
# List available system images
avdmanager list targets

# Create AVD via command line
avdmanager create avd -n "FinSense_API34" -k "system-images;android-34;google_apis;x86_64"
avdmanager create avd -n "FinSense_API29" -k "system-images;android-29;google_apis;x86_64"
avdmanager create avd -n "FinSense_API31" -k "system-images;android-31;google_apis;x86_64"
```

## Project Configuration

### 1. Clone and Setup the Project

```bash
# Clone the project
git clone <repository-url>
cd FinSenseMobile

# Install dependencies
npm install

# Install iOS dependencies (if on macOS)
cd ios && pod install && cd ..
```

### 2. Android Project Structure

The Android project structure follows standard React Native conventions:

```
android/
├── app/
│   ├── build.gradle                 # App-level build configuration
│   ├── src/main/
│   │   ├── AndroidManifest.xml      # App manifest
│   │   ├── java/com/finsensemobile/ # Java/Kotlin source files
│   │   └── res/                     # Resources (icons, strings, etc.)
│   └── debug.keystore              # Debug signing key
├── build.gradle                     # Project-level build configuration
├── gradle.properties               # Gradle properties
├── gradlew                         # Gradle wrapper (Unix)
├── gradlew.bat                     # Gradle wrapper (Windows)
└── settings.gradle                 # Gradle settings
```

### 3. Key Configuration Files

**android/app/build.gradle** - App-level build configuration:
- Application ID: `com.finsensemobile`
- Version Code: 1
- Version Name: "1.0"
- Min SDK: 24 (Android 7.0)
- Target SDK: 35 (Android 14)

**android/build.gradle** - Project-level configuration:
- Build tools version: 35.0.0
- Kotlin version: 2.1.20
- NDK version: 27.1.12297006

**android/gradle.properties** - Gradle properties:
- Hermes enabled: true
- New Architecture enabled: true
- AndroidX enabled: true

## Running the App

### 1. Start the Metro Bundler

```bash
# Start the Metro bundler
npm start
# or
npx react-native start
```

### 2. Run on Android Emulator

```bash
# Start an emulator first
emulator -avd FinSense_API34

# In a new terminal, run the app
npm run android
# or
npx react-native run-android
```

### 3. Run on Physical Device

1. **Enable Developer Options:**
   - Go to **Settings** > **About phone**
   - Tap **Build number** 7 times
   - Go back to **Settings** > **Developer options**
   - Enable **USB debugging**

2. **Connect and Run:**
   ```bash
   # Verify device is connected
   adb devices
   
   # Run the app
   npm run android
   ```

### 4. Running Specific Build Variants

```bash
# Run debug build
npx react-native run-android --variant=debug

# Run release build
npx react-native run-android --variant=release
```

## Building for Production

### 1. Generate Upload Key

```bash
# Generate upload keystore
keytool -genkeypair -v -storetype PKCS12 -keystore upload-key.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000

# Move keystore to android/app/
mv upload-key.keystore android/app/
```

### 2. Configure Gradle for Signing

Edit `android/gradle.properties`:

```properties
MYAPP_UPLOAD_STORE_FILE=upload-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=upload
MYAPP_UPLOAD_STORE_PASSWORD=your_store_password
MYAPP_UPLOAD_KEY_PASSWORD=your_key_password
```

Edit `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.release
            minifyEnabled enableProguardInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}
```

### 3. Build APK

```bash
# Navigate to android folder
cd android

# Build debug APK
./gradlew assembleDebug

# Build release APK
./gradlew assembleRelease

# Build universal APK (all architectures)
./gradlew assembleRelease -PreactNativeArchitectures=

# Build for specific architecture
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

### 4. Build Android App Bundle (AAB)

```bash
# Build release AAB (recommended for Play Store)
./gradlew bundleRelease

# Build debug AAB
./gradlew bundleDebug
```

The generated files will be located at:
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

### 5. Test Release Build

```bash
# Install release APK on device
adb install android/app/build/outputs/apk/release/app-release.apk

# Install release AAB using bundletool
bundletool build-apks --bundle=android/app/build/outputs/bundle/release/app-release.aab --output=app-release.apks
bundletool install-apks --apks=app-release.apks
```

## Google Play Store Deployment

### 1. Prepare for Play Store

1. **Create Google Play Developer Account:**
   - Visit [Google Play Console](https://play.google.com/console)
   - Pay the one-time registration fee ($25)
   - Complete account verification

2. **Prepare App Assets:**
   - App icon (512x512 PNG)
   - Feature graphic (1024x500 PNG)
   - Screenshots (phone, tablet, 7-inch tablet, 10-inch tablet)
   - App description and title
   - Privacy policy URL

### 2. Create App in Play Console

1. **Create New App:**
   - Click "Create app" in Play Console
   - Fill in app details:
     - App name: "FinSense"
     - Default language: English
     - App or game: App
     - Free or paid: Free (or Paid)

2. **App Setup:**
   - Choose app category: Finance
   - Add content rating questionnaire
   - Set up target audience
   - Add privacy policy

### 3. Configure App Bundle

1. **Upload App Bundle:**
   - Go to **Production** > **Releases**
   - Click "Create new release"
   - Upload the AAB file: `android/app/build/outputs/bundle/release/app-release.aab`

2. **Configure Release:**
   - Add release notes
   - Set version name and code
   - Configure rollout percentage (start with 5-10%)

### 4. Store Listing

1. **Add Store Listing Information:**
   - App name: "FinSense"
   - Short description: "Smart financial management app"
   - Full description: Detailed app description
   - App icon and screenshots
   - Feature graphic

2. **Categorization:**
   - Category: Finance
   - Tags: finance, budget, expense tracker, money management

### 5. Pre-launch Testing

1. **Internal Testing:**
   - Create internal testing track
   - Add test users
   - Upload AAB to internal testing

2. **Closed Testing:**
   - Create closed testing track
   - Add alpha/beta testers
   - Gather feedback

### 6. Content Rating and Policies

1. **Content Rating:**
   - Complete content rating questionnaire
   - Target audience: 17+ (or appropriate age)
   - Content descriptors: None (or as appropriate)

2. **App Content:**
   - Data safety form
   - Privacy policy
   - Permissions justification

### 7. Release Management

1. **Release to Production:**
   - Review all sections for completeness
   - Click "Start rollout to production"
   - Monitor app performance and user feedback

2. **Post-launch:**
   - Monitor crash reports
   - Respond to user reviews
   - Plan updates and new features

## Troubleshooting

### Common Issues and Solutions

#### 1. Build Failures

**Issue: "Could not find com.android.tools.build:gradle"**
```bash
# Solution: Update gradle wrapper
cd android
./gradlew wrapper --gradle-version=8.5
```

**Issue: "SDK location not found"**
```bash
# Solution: Create local.properties
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
```

**Issue: "Execution failed for task ':app:installDebug'"**
```bash
# Solution: Clean and rebuild
cd android
./gradlew clean
cd ..
npx react-native run-android
```

#### 2. Emulator Issues

**Issue: Emulator won't start**
```bash
# Solution: Check virtualization and restart
emulator -avd FinSense_API34 -verbose
```

**Issue: App crashes on startup**
```bash
# Solution: Check logs
adb logcat *:S ReactNative:V ReactNativeJS:V
```

#### 3. Metro Bundler Issues

**Issue: "Cannot connect to Metro"**
```bash
# Solution: Reset Metro cache
npx react-native start --reset-cache
```

**Issue: "Port 8081 already in use"**
```bash
# Solution: Kill existing Metro process
lsof -ti:8081 | xargs kill -9
npx react-native start
```

#### 4. Gradle Issues

**Issue: "Daemon will be stopped at the end of the build"**
```bash
# Solution: Increase memory allocation
echo "org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m" >> android/gradle.properties
```

**Issue: "Could not resolve all files for configuration"**
```bash
# Solution: Clear Gradle cache
rm -rf ~/.gradle/caches/
cd android
./gradlew clean
```

#### 5. Device Connection Issues

**Issue: "No devices/emulators found"**
```bash
# Solution: Restart ADB
adb kill-server
adb start-server
adb devices
```

### Debug Tools

#### 1. React Native Debugger

```bash
# Install React Native Debugger
npm install -g react-native-debugger

# Start debugger
react-native-debugger
```

#### 2. Flipper

```bash
# Install Flipper
brew install --cask flipper

# Add Flipper to your app (already configured in newer RN versions)
```

#### 3. Chrome DevTools

```bash
# Enable debug mode
npm run android

# In running app, press Ctrl+M (or Cmd+M on macOS)
# Select "Debug JS Remotely"
```

## Android-Specific Permissions

### Current Permissions

Based on `android/app/src/main/AndroidManifest.xml`, the app currently uses:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

### Additional Permissions for FinSense Features

Add these permissions to `android/app/src/main/AndroidManifest.xml` as needed:

```xml
<!-- Camera permissions for receipt scanning -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

<!-- Location permissions (if using location-based features) -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<!-- Notification permissions -->
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

<!-- Network state -->
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Biometric authentication -->
<uses-permission android:name="android.permission.USE_FINGERPRINT" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
```

### Runtime Permissions

For Android 6.0+ (API level 23+), implement runtime permissions:

```javascript
// Install react-native-permissions
npm install react-native-permissions

// Usage in React Native
import {
  request,
  PERMISSIONS,
  RESULTS,
} from 'react-native-permissions';

// Request camera permission
const requestCameraPermission = async () => {
  const result = await request(PERMISSIONS.ANDROID.CAMERA);
  if (result === RESULTS.GRANTED) {
    console.log('Camera permission granted');
  }
};
```

### Permission Configuration

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Feature declarations -->
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
<uses-feature android:name="android.hardware.location" android:required="false" />
<uses-feature android:name="android.hardware.location.gps" android:required="false" />
```

## Gradle Configuration and Optimization

### 1. Performance Optimization

Edit `android/gradle.properties`:

```properties
# Enable parallel compilation
org.gradle.parallel=true

# Enable configuration cache
org.gradle.configuration-cache=true

# Increase heap size
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError

# Enable build cache
org.gradle.caching=true

# Enable daemon
org.gradle.daemon=true

# Configure workers
org.gradle.workers.max=4
```

### 2. Build Optimization

Edit `android/app/build.gradle`:

```gradle
android {
    // ... existing configuration

    // Enable multidex
    defaultConfig {
        // ... existing config
        multiDexEnabled true
    }

    // Configure build types
    buildTypes {
        debug {
            // ... existing config
            debuggable true
            jniDebuggable true
            renderscriptDebuggable true
            minifyEnabled false
            shrinkResources false
        }
        release {
            // ... existing config
            debuggable false
            jniDebuggable false
            renderscriptDebuggable false
            minifyEnabled true
            shrinkResources true
            zipAlignEnabled true
        }
    }

    // Split APKs by architecture
    splits {
        abi {
            enable true
            reset()
            include "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
            universalApk true
        }
    }

    // Packaging options
    packagingOptions {
        pickFirst "lib/x86/libc++_shared.so"
        pickFirst "lib/x86_64/libc++_shared.so"
        pickFirst "lib/arm64-v8a/libc++_shared.so"
        pickFirst "lib/armeabi-v7a/libc++_shared.so"
    }
}
```

### 3. ProGuard Configuration

Edit `android/app/proguard-rules.pro`:

```proguard
# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }

# Hermes
-keep class com.facebook.hermes.** { *; }

# React Native Image Picker
-keep class com.imagepicker.** { *; }

# React Native Vector Icons
-keep class com.oblador.vectoricons.** { *; }

# React Native Permissions
-keep class com.zoontek.rnpermissions.** { *; }

# Keep all native methods
-keepclassmembers class * {
    native <methods>;
}

# Preserve line number information
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
```

### 4. Dependency Management

Edit `android/app/build.gradle`:

```gradle
dependencies {
    // ... existing dependencies

    // Multidex support
    implementation 'androidx.multidex:multidex:2.0.1'

    // Optional: Add specific implementations
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.fragment:fragment-ktx:1.6.2'
}
```

### 5. Build Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "android": "react-native run-android",
    "android:build": "cd android && ./gradlew assembleRelease",
    "android:bundle": "cd android && ./gradlew bundleRelease",
    "android:clean": "cd android && ./gradlew clean",
    "android:install": "cd android && ./gradlew installDebug",
    "android:dev": "npx react-native run-android --variant=debug",
    "android:release": "npx react-native run-android --variant=release"
  }
}
```

## Best Practices

### 1. Development Workflow

```bash
# Daily development workflow
npm run android:clean        # Clean build artifacts
npm start                    # Start Metro bundler
npm run android:dev          # Run debug build
```

### 2. Testing Strategy

```bash
# Run unit tests
npm test

# Run E2E tests (if configured)
npm run test:e2e:android

# Test on multiple devices
npm run android -- --deviceId=emulator-5554
```

### 3. Performance Monitoring

```bash
# Monitor app performance
adb shell dumpsys cpuinfo | grep com.finsensemobile
adb shell dumpsys meminfo com.finsensemobile
```

### 4. Security Considerations

- Always use release builds for production
- Implement certificate pinning for API calls
- Use proper keystore management
- Enable ProGuard for release builds
- Validate all user inputs

### 5. App Store Optimization

- Use high-quality screenshots
- Write compelling app descriptions
- Implement proper error handling
- Add crash reporting (Firebase Crashlytics)
- Monitor app performance metrics

## Conclusion

This guide provides a comprehensive setup for Android development with the FinSense React Native app. Following these steps will ensure a smooth development experience and successful deployment to the Google Play Store.

For additional support or questions, refer to the official React Native documentation or create an issue in the project repository.

## Additional Resources

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Android Developer Documentation](https://developer.android.com/docs)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
- [React Native Upgrade Helper](https://react-native-community.github.io/upgrade-helper/)