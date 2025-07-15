# Camera Integration Setup Guide

## Overview
This guide covers the camera integration implementation for receipt scanning in the FinSense React Native app.

## Features Implemented

### 1. Camera Service (`/src/services/cameraService.ts`)
- **Native camera access** using `react-native-image-picker`
- **Photo library access** for selecting existing images
- **Permission handling** with proper user messaging
- **Error handling** for various camera scenarios
- **Cross-platform support** for iOS and Android

### 2. Receipt Service (`/src/services/receiptService.ts`)
- **Image upload** with FormData support
- **Processing status polling** for real-time updates
- **Retry functionality** for failed uploads
- **Proper timeout handling** for long uploads

### 3. Updated ReceiptScanScreen (`/src/pages/ReceiptScanScreen.tsx`)
- **Image preview** with proper scaling
- **Progress indicators** for upload/processing
- **Status updates** with real-time feedback
- **Error handling** with user-friendly messages
- **Responsive UI** that adapts to different states

## Platform Configuration

### Android Permissions (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
```

### iOS Permissions (Info.plist)
```xml
<key>NSCameraUsageDescription</key>
<string>This app needs access to camera to scan receipts and capture transaction data</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>This app needs access to photo library to select receipt images for transaction processing</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>This app needs access to save receipt images to your photo library</string>
```

## Dependencies
- `react-native-image-picker@^8.2.1` - Camera and gallery access
- `react-native-permissions@^5.4.1` - Runtime permission handling

## Setup Instructions

### 1. For iOS
```bash
cd ios && pod install
```

### 2. For Android
Ensure you have the latest Android SDK and build tools installed.

### 3. Run the app
```bash
# iOS
npx react-native run-ios

# Android
npx react-native run-android
```

## Usage Flow

1. **Initial State**: User sees scan options (Camera/Gallery) and quick select button
2. **Image Selection**: User can choose from:
   - Take Photo (opens camera)
   - Choose from Gallery (opens photo library)
   - Quick Select (shows action sheet with both options)
3. **Image Preview**: Selected image is displayed with metadata
4. **Processing**: User taps "Process Receipt" to upload and process
5. **Status Updates**: Real-time progress and status feedback
6. **Completion**: Success message and automatic cleanup

## Error Handling

The implementation includes comprehensive error handling for:
- **Permission denied** scenarios
- **Camera/gallery access** failures
- **Network upload** errors
- **Processing timeout** situations
- **User cancellation** events

## Testing

### Manual Testing Checklist
- [ ] Camera permission request works
- [ ] Gallery permission request works
- [ ] Camera opens and takes photos
- [ ] Gallery opens and selects photos
- [ ] Image preview displays correctly
- [ ] Upload progress shows properly
- [ ] Processing status updates in real-time
- [ ] Error messages are user-friendly
- [ ] Retry functionality works
- [ ] UI responds correctly to different states

### Test on Both Platforms
- [ ] iOS simulator/device
- [ ] Android emulator/device

## Notes

- The camera service uses `react-native-permissions` for runtime permission handling
- Images are automatically compressed and optimized for upload
- The UI is responsive and handles various screen sizes
- All states are properly managed with React hooks
- Error boundaries ensure the app doesn't crash on camera errors

## Future Enhancements

Potential improvements that could be added:
1. **Image editing** capabilities (crop, rotate, filters)
2. **Multiple image** selection for batch processing
3. **OCR preview** showing extracted text overlay
4. **Offline storage** for retry when network is available
5. **Image compression** settings based on network conditions