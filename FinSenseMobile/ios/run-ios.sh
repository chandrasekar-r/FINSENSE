#!/bin/bash

# Build the app with sandboxing disabled
xcodebuild -workspace FinSenseMobile.xcworkspace \
  -scheme FinSenseMobile \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' \
  build \
  ENABLE_USER_SCRIPT_SANDBOXING=NO

# If build succeeded, install and launch the app
if [ $? -eq 0 ]; then
  # Get the app path
  APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData/FinSenseMobile-*/Build/Products/Debug-iphonesimulator -name "FinSenseMobile.app" | head -1)
  
  if [ -n "$APP_PATH" ]; then
    echo "Installing app to simulator..."
    xcrun simctl install "iPhone 16 Pro" "$APP_PATH"
    
    echo "Launching app..."
    xcrun simctl launch "iPhone 16 Pro" com.finsensemobile
  else
    echo "Could not find built app"
    exit 1
  fi
else
  echo "Build failed"
  exit 1
fi