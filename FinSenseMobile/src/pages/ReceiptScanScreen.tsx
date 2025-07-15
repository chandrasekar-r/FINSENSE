import React, { useState, useCallback } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Image, 
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions
} from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import { cameraService, CameraResult, CameraError } from '../services/cameraService'
import { receiptService, ReceiptProcessingStatus } from '../services/receiptService'

const { width: screenWidth } = Dimensions.get('window')

export const ReceiptScanScreen: React.FC = () => {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  
  const [selectedImage, setSelectedImage] = useState<CameraResult | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<ReceiptProcessingStatus | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleCameraPress = useCallback(async () => {
    try {
      const result = await cameraService.openCamera()
      setSelectedImage(result)
    } catch (error) {
      const cameraError = error as CameraError
      if (cameraError.code !== 'USER_CANCELLED') {
        Alert.alert('Camera Error', cameraError.message)
      }
    }
  }, [])

  const handleGalleryPress = useCallback(async () => {
    try {
      const result = await cameraService.openImageLibrary()
      setSelectedImage(result)
    } catch (error) {
      const cameraError = error as CameraError
      if (cameraError.code !== 'USER_CANCELLED') {
        Alert.alert('Gallery Error', cameraError.message)
      }
    }
  }, [])

  const handleQuickSelect = useCallback(async () => {
    try {
      const result = await cameraService.showImageSelectionOptions()
      setSelectedImage(result)
    } catch (error) {
      const cameraError = error as CameraError
      if (cameraError.code !== 'USER_CANCELLED') {
        Alert.alert('Selection Error', cameraError.message)
      }
    }
  }, [])

  const handleUpload = useCallback(async () => {
    if (!selectedImage) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const uploadResult = await receiptService.uploadReceipt(selectedImage)
      
      if (uploadResult.success && uploadResult.processingId) {
        setIsUploading(false)
        setIsProcessing(true)
        
        // Start polling for processing status
        await receiptService.pollProcessingStatus(
          uploadResult.processingId,
          (status) => {
            setProcessingStatus(status)
            setUploadProgress(status.progress)
          }
        )
        
        setIsProcessing(false)
        Alert.alert(
          'Success!', 
          'Receipt has been processed and transaction created successfully.',
          [
            { text: 'OK', onPress: () => {
              setSelectedImage(null)
              setProcessingStatus(null)
              setUploadProgress(0)
            }}
          ]
        )
      } else {
        setIsUploading(false)
        Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload receipt')
      }
    } catch (error) {
      setIsUploading(false)
      setIsProcessing(false)
      Alert.alert('Processing Error', error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }, [selectedImage])

  const handleRetry = useCallback(async () => {
    if (!processingStatus?.id) return

    setIsProcessing(true)
    
    try {
      const retryResult = await receiptService.retryProcessing(processingStatus.id)
      
      if (retryResult.success && retryResult.processingId) {
        await receiptService.pollProcessingStatus(
          retryResult.processingId,
          (status) => {
            setProcessingStatus(status)
            setUploadProgress(status.progress)
          }
        )
        
        setIsProcessing(false)
        Alert.alert(
          'Success!', 
          'Receipt has been processed and transaction created successfully.',
          [
            { text: 'OK', onPress: () => {
              setSelectedImage(null)
              setProcessingStatus(null)
              setUploadProgress(0)
            }}
          ]
        )
      } else {
        setIsProcessing(false)
        Alert.alert('Retry Failed', retryResult.error || 'Failed to retry processing')
      }
    } catch (error) {
      setIsProcessing(false)
      Alert.alert('Retry Error', error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }, [processingStatus])

  const handleClearImage = useCallback(() => {
    setSelectedImage(null)
    setProcessingStatus(null)
    setUploadProgress(0)
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Scan Receipt</Text>
        
        {!selectedImage ? (
          <View style={styles.scanOptions}>
            <TouchableOpacity style={styles.scanButton} onPress={handleCameraPress}>
              <Text style={styles.scanButtonIcon}>📷</Text>
              <Text style={styles.scanButtonText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.scanButton} onPress={handleGalleryPress}>
              <Text style={styles.scanButtonIcon}>📁</Text>
              <Text style={styles.scanButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!selectedImage ? (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderTitle}>📸 Receipt Scanning</Text>
            <Text style={styles.placeholderText}>
              Take a photo of your receipt or select one from your gallery.
              We'll automatically extract transaction details and create a new entry.
            </Text>
            <TouchableOpacity style={styles.quickSelectButton} onPress={handleQuickSelect}>
              <Text style={styles.quickSelectText}>Quick Select</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.imagePreviewContainer}>
            <Text style={styles.previewTitle}>Receipt Preview</Text>
            
            <View style={styles.imageContainer}>
              <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
              
              <TouchableOpacity style={styles.clearButton} onPress={handleClearImage}>
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.imageInfo}>
              <Text style={styles.imageInfoText}>
                {selectedImage.fileName} • {(selectedImage.fileSize / 1024).toFixed(1)}KB
              </Text>
              <Text style={styles.imageInfoText}>
                {selectedImage.width} × {selectedImage.height}
              </Text>
            </View>

            {(isUploading || isProcessing) && (
              <View style={styles.progressContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.progressText}>
                  {isUploading ? 'Uploading receipt...' : 'Processing receipt...'}
                </Text>
                {uploadProgress > 0 && (
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                  </View>
                )}
              </View>
            )}

            {processingStatus && (
              <View style={styles.statusContainer}>
                <Text style={styles.statusTitle}>Processing Status</Text>
                <Text style={styles.statusText}>
                  Status: {processingStatus.status.toUpperCase()}
                </Text>
                <Text style={styles.statusText}>
                  Progress: {processingStatus.progress}%
                </Text>
                {processingStatus.error && (
                  <Text style={styles.errorText}>Error: {processingStatus.error}</Text>
                )}
              </View>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.secondaryButton]} 
                onPress={handleClearImage}
                disabled={isUploading || isProcessing}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              {processingStatus?.status === 'failed' ? (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.primaryButton]} 
                  onPress={handleRetry}
                  disabled={isProcessing}
                >
                  <Text style={styles.primaryButtonText}>Retry</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.primaryButton]} 
                  onPress={handleUpload}
                  disabled={isUploading || isProcessing}
                >
                  <Text style={styles.primaryButtonText}>Process Receipt</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
  },
  scanOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  scanButton: {
    flex: 1,
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scanButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  placeholderCard: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary + '30',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: colors.text + 'CC',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  quickSelectButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  quickSelectText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  imageContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewImage: {
    width: screenWidth - 64,
    height: (screenWidth - 64) * 1.2,
    borderRadius: 8,
    resizeMode: 'contain',
    backgroundColor: colors.background,
  },
  clearButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.background + 'DD',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  imageInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  imageInfoText: {
    fontSize: 12,
    color: colors.text + 'AA',
    marginBottom: 4,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  progressText: {
    fontSize: 14,
    color: colors.text,
    marginTop: 8,
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  statusContainer: {
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#ff4444',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
})