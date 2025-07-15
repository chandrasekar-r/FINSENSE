import {
  ImagePickerResponse,
  MediaType,
  launchImageLibrary,
  launchCamera,
  ImagePickerOptions,
} from 'react-native-image-picker';
import { Alert, Platform } from 'react-native';
import { request, PERMISSIONS, RESULTS, Permission } from 'react-native-permissions';

export interface CameraResult {
  uri: string;
  fileName: string;
  fileSize: number;
  type: string;
  width: number;
  height: number;
}

export interface CameraError {
  code: string;
  message: string;
}

const defaultOptions: ImagePickerOptions = {
  mediaType: 'photo' as MediaType,
  quality: 0.8,
  maxWidth: 1920,
  maxHeight: 1920,
  includeBase64: false,
  includeExtra: false,
};

class CameraService {
  private async requestCameraPermission(): Promise<boolean> {
    try {
      const permission: Permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.CAMERA 
        : PERMISSIONS.ANDROID.CAMERA;

      const result = await request(permission);
      return result === RESULTS.GRANTED;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  }

  private async requestPhotoLibraryPermission(): Promise<boolean> {
    try {
      const permission: Permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.PHOTO_LIBRARY 
        : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;

      const result = await request(permission);
      return result === RESULTS.GRANTED;
    } catch (error) {
      console.error('Error requesting photo library permission:', error);
      return false;
    }
  }

  private handleImagePickerResponse(
    response: ImagePickerResponse,
    resolve: (result: CameraResult) => void,
    reject: (error: CameraError) => void
  ): void {
    if (response.didCancel) {
      reject({
        code: 'USER_CANCELLED',
        message: 'User cancelled image selection',
      });
      return;
    }

    if (response.errorMessage) {
      reject({
        code: 'PICKER_ERROR',
        message: response.errorMessage,
      });
      return;
    }

    const asset = response.assets?.[0];
    if (!asset || !asset.uri) {
      reject({
        code: 'NO_IMAGE_SELECTED',
        message: 'No image was selected',
      });
      return;
    }

    resolve({
      uri: asset.uri,
      fileName: asset.fileName || 'receipt_image.jpg',
      fileSize: asset.fileSize || 0,
      type: asset.type || 'image/jpeg',
      width: asset.width || 0,
      height: asset.height || 0,
    });
  }

  async openCamera(): Promise<CameraResult> {
    return new Promise(async (resolve, reject) => {
      try {
        const hasPermission = await this.requestCameraPermission();
        
        if (!hasPermission) {
          Alert.alert(
            'Camera Permission Required',
            'Please grant camera permission to scan receipts.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Settings', onPress: () => {
                // In a real app, you'd open settings here
                console.log('Open settings');
              }}
            ]
          );
          reject({
            code: 'PERMISSION_DENIED',
            message: 'Camera permission denied',
          });
          return;
        }

        launchCamera(defaultOptions, (response) => {
          this.handleImagePickerResponse(response, resolve, reject);
        });
      } catch (error) {
        reject({
          code: 'CAMERA_ERROR',
          message: error instanceof Error ? error.message : 'Unknown camera error',
        });
      }
    });
  }

  async openImageLibrary(): Promise<CameraResult> {
    return new Promise(async (resolve, reject) => {
      try {
        const hasPermission = await this.requestPhotoLibraryPermission();
        
        if (!hasPermission) {
          Alert.alert(
            'Photo Library Permission Required',
            'Please grant photo library permission to select receipt images.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Settings', onPress: () => {
                // In a real app, you'd open settings here
                console.log('Open settings');
              }}
            ]
          );
          reject({
            code: 'PERMISSION_DENIED',
            message: 'Photo library permission denied',
          });
          return;
        }

        launchImageLibrary(defaultOptions, (response) => {
          this.handleImagePickerResponse(response, resolve, reject);
        });
      } catch (error) {
        reject({
          code: 'LIBRARY_ERROR',
          message: error instanceof Error ? error.message : 'Unknown library error',
        });
      }
    });
  }

  async showImageSelectionOptions(): Promise<CameraResult> {
    return new Promise((resolve, reject) => {
      Alert.alert(
        'Select Receipt Image',
        'Choose how you want to add a receipt image',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => reject({
            code: 'USER_CANCELLED',
            message: 'User cancelled image selection',
          }) },
          { text: 'Take Photo', onPress: () => this.openCamera().then(resolve).catch(reject) },
          { text: 'Choose from Gallery', onPress: () => this.openImageLibrary().then(resolve).catch(reject) },
        ],
        { cancelable: true, onDismiss: () => reject({
          code: 'USER_CANCELLED',
          message: 'User cancelled image selection',
        }) }
      );
    });
  }
}

export const cameraService = new CameraService();