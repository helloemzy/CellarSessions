import React, { useState, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native'
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native'
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera'
import { Ionicons } from '@expo/vector-icons'
import { RootStackParamList } from '@/navigation/types'
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants'

type CameraCaptureRouteProp = RouteProp<RootStackParamList, 'CameraCapture'>

const { width, height } = Dimensions.get('window')

export function CameraCaptureScreen() {
  const route = useRoute<CameraCaptureRouteProp>()
  const navigation = useNavigation()
  const { type, onCapture } = route.params
  
  const [permission, requestPermission] = useCameraPermissions()
  const [cameraType, setCameraType] = useState<CameraType>('back')
  const cameraRef = useRef<CameraView>(null)

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission()
    }
  }, [permission])

  const handleTakePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        })
        
        if (photo?.uri) {
          onCapture(photo.uri)
          navigation.goBack()
        }
      } catch (error) {
        console.error('Error taking picture:', error)
        Alert.alert('Error', 'Failed to capture image. Please try again.')
      }
    }
  }

  const toggleCameraType = () => {
    setCameraType(current => current === 'back' ? 'front' : 'back')
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permissions...</Text>
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Ionicons name="camera-outline" size={64} color={COLORS.GRAY_400} />
          <Text style={styles.title}>Camera Access Required</Text>
          <Text style={styles.message}>
            Please allow camera access to capture {type} images
          </Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraType}
      >
        <View style={styles.overlay}>
          {/* Header with instructions */}
          <View style={styles.header}>
            <Text style={styles.instructionText}>
              {type === 'wine' && 'Position the wine label in the frame'}
              {type === 'cellar' && 'Capture your cellar or wine storage'}
              {type === 'tasting' && 'Take a photo of your tasting setup'}
            </Text>
          </View>

          {/* Wine label guide overlay for wine captures */}
          {type === 'wine' && (
            <View style={styles.labelGuide}>
              <View style={styles.guideBorder} />
            </View>
          )}

          {/* Camera controls */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleCameraType}>
              <Ionicons name="camera-reverse" size={24} color={COLORS.WHITE} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.captureButton} onPress={handleTakePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.controlButton} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={24} color={COLORS.WHITE} />
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BLACK,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.BASE,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    position: 'absolute',
    top: 60,
    left: SPACING.BASE,
    right: SPACING.BASE,
    alignItems: 'center',
  },
  instructionText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: SPACING.SM,
    borderRadius: BORDER_RADIUS.BASE,
  },
  labelGuide: {
    position: 'absolute',
    top: height * 0.3,
    left: width * 0.1,
    right: width * 0.1,
    bottom: height * 0.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideBorder: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    borderRadius: BORDER_RADIUS.BASE,
    borderStyle: 'dashed',
  },
  controls: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: SPACING.XL,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.PRIMARY,
  },
  title: {
    fontSize: TYPOGRAPHY.FONT_SIZE['2XL'],
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
    color: COLORS.WHITE,
    marginBottom: SPACING.BASE,
    textAlign: 'center',
  },
  message: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.WHITE,
    textAlign: 'center',
    marginBottom: SPACING.XL,
    lineHeight: TYPOGRAPHY.LINE_HEIGHT.RELAXED,
  },
  button: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.XL,
    paddingVertical: SPACING.BASE,
    borderRadius: BORDER_RADIUS.BASE,
  },
  buttonText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
  },
})