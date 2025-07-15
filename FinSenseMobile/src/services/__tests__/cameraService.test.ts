import { jest } from '@jest/globals';
import { Alert } from 'react-native';
import { cameraService } from '../cameraService';

// Mock react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

// Mock react-native-permissions
jest.mock('react-native-permissions', () => ({
  request: jest.fn(),
  PERMISSIONS: {
    IOS: {
      CAMERA: 'ios.permission.CAMERA',
      PHOTO_LIBRARY: 'ios.permission.PHOTO_LIBRARY',
    },
    ANDROID: {
      CAMERA: 'android.permission.CAMERA',
      READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
    },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('CameraService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('openCamera', () => {
    it('should request camera permission and open camera', async () => {
      const mockRequest = require('react-native-permissions').request;
      const mockLaunchCamera = require('react-native-image-picker').launchCamera;
      
      mockRequest.mockResolvedValue('granted');
      mockLaunchCamera.mockImplementation((options, callback) => {
        callback({
          assets: [{
            uri: 'file://test.jpg',
            fileName: 'test.jpg',
            fileSize: 1024,
            type: 'image/jpeg',
            width: 1920,
            height: 1080,
          }],
        });
      });

      const result = await cameraService.openCamera();
      
      expect(result).toEqual({
        uri: 'file://test.jpg',
        fileName: 'test.jpg',
        fileSize: 1024,
        type: 'image/jpeg',
        width: 1920,
        height: 1080,
      });
      
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining('CAMERA')
      );
      expect(mockLaunchCamera).toHaveBeenCalled();
    });

    it('should handle permission denial', async () => {
      const mockRequest = require('react-native-permissions').request;
      mockRequest.mockResolvedValue('denied');

      await expect(cameraService.openCamera()).rejects.toEqual({
        code: 'PERMISSION_DENIED',
        message: 'Camera permission denied',
      });
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Camera Permission Required',
        'Please grant camera permission to scan receipts.',
        expect.any(Array)
      );
    });

    it('should handle user cancellation', async () => {
      const mockRequest = require('react-native-permissions').request;
      const mockLaunchCamera = require('react-native-image-picker').launchCamera;
      
      mockRequest.mockResolvedValue('granted');
      mockLaunchCamera.mockImplementation((options, callback) => {
        callback({ didCancel: true });
      });

      await expect(cameraService.openCamera()).rejects.toEqual({
        code: 'USER_CANCELLED',
        message: 'User cancelled image selection',
      });
    });
  });

  describe('openImageLibrary', () => {
    it('should request photo library permission and open gallery', async () => {
      const mockRequest = require('react-native-permissions').request;
      const mockLaunchImageLibrary = require('react-native-image-picker').launchImageLibrary;
      
      mockRequest.mockResolvedValue('granted');
      mockLaunchImageLibrary.mockImplementation((options, callback) => {
        callback({
          assets: [{
            uri: 'file://gallery.jpg',
            fileName: 'gallery.jpg',
            fileSize: 2048,
            type: 'image/jpeg',
            width: 1024,
            height: 768,
          }],
        });
      });

      const result = await cameraService.openImageLibrary();
      
      expect(result).toEqual({
        uri: 'file://gallery.jpg',
        fileName: 'gallery.jpg',
        fileSize: 2048,
        type: 'image/jpeg',
        width: 1024,
        height: 768,
      });
      
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining('PHOTO_LIBRARY')
      );
      expect(mockLaunchImageLibrary).toHaveBeenCalled();
    });
  });

  describe('showImageSelectionOptions', () => {
    it('should show alert with camera and gallery options', () => {
      const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;
      
      cameraService.showImageSelectionOptions();
      
      expect(mockAlert).toHaveBeenCalledWith(
        'Select Receipt Image',
        'Choose how you want to add a receipt image',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Take Photo' }),
          expect.objectContaining({ text: 'Choose from Gallery' }),
        ]),
        expect.any(Object)
      );
    });
  });
});