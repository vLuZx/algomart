/**
 * Scanner Screen
 * Barcode scanning with camera
 */

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, useCameraDevices, useCodeScanner } from 'react-native-vision-camera';
import { useScanner } from '../../hooks/use-scanner';
import { useSession } from '../../features/session/hooks/use-session';
import { tokens } from '../../constants/tokens';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { SessionMode } from '../../features/session/types/session.types';

export default function ScannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId: string; mode: SessionMode }>();
  const sessionId = params.sessionId;
  const mode = params.mode || 'single';

  const [cameraActive, setCameraActive] = useState(true);
  const devices = useCameraDevices();
  const device = devices.find(d => d.position === 'back');

  const {
    isScanning,
    permission,
    status,
    start,
    stop,
    handleBarcodeDetected,
    setPermission,
  } = useScanner({
    sessionId,
    mode,
    onScanComplete: (barcode) => {
      console.log('Scan complete:', barcode);
      
      if (mode === 'single') {
        // Navigate back to session detail
        stop();
        router.back();
        // TODO: Navigate to product detail when screen is created
      }
      // In rapid mode, continue scanning
    },
    onDuplicateScan: (barcode) => {
      // Show duplicate toast
      Alert.alert('Already Scanned', `Product ${barcode} is already in this session.`);
    },
  });

  // Request camera permission
  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setPermission(status === 'granted' ? 'granted' : 'denied');
    })();
  }, [setPermission]);

  // Start scanning when permission granted
  useEffect(() => {
    if (permission === 'granted' && !isScanning) {
      start();
    }
  }, [permission, isScanning, start]);

  // Code scanner configuration
  const codeScanner = useCodeScanner({
    codeTypes: ['ean-13', 'ean-8', 'upc-a', 'upc-e'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && codes[0].value) {
        handleBarcodeDetected(codes[0].value);
      }
    },
  });

  const handleClose = () => {
    stop();
    router.back();
  };

  const handleViewSession = () => {
    stop();
    // TODO: Navigate to product list when screen is created
    router.back();
    // router.push('/session/product-list');
  };

  // Loading state while checking permissions
  if (permission === 'undetermined') {
    return (
      <View style={styles.container}>
        <LoadingSpinner size="large" />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  // Permission denied
  if (permission === 'denied') {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Camera Permission Required</Text>
          <Text style={styles.errorMessage}>
            Please enable camera access in your device settings to scan barcodes.
          </Text>
          <Button title="Go Back" onPress={handleClose} variant="primary" />
        </View>
      </View>
    );
  }

  // No camera device
  if (!device) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>No Camera Found</Text>
          <Text style={styles.errorMessage}>
            Unable to access camera device.
          </Text>
          <Button title="Go Back" onPress={handleClose} variant="primary" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={cameraActive && isScanning}
        codeScanner={codeScanner}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === 'single' ? 'Scan Product' : 'Rapid Scan Mode'}
          </Text>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        {/* Viewfinder */}
        <View style={styles.viewfinderContainer}>
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          
          <Text style={styles.instruction}>
            {status === 'processing' 
              ? 'Processing...' 
              : 'Point camera at barcode'}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {mode === 'rapid' && (
            <Button 
              title="View Session Products"
              onPress={handleViewSession} 
              variant="primary"
            />
          )}
          
          <Button 
            title="Cancel"
            onPress={handleClose} 
            variant="ghost"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.black,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.lg,
  },
  title: {
    fontSize: tokens.typography.heading2.fontSize,
    fontWeight: tokens.typography.heading2.fontWeight,
    color: tokens.colors.white,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: tokens.colors.white,
    fontWeight: '300',
  },
  viewfinderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.xl,
  },
  viewfinder: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: tokens.colors.white,
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instruction: {
    marginTop: tokens.spacing.xl,
    fontSize: tokens.typography.body.fontSize,
    color: tokens.colors.white,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.borderRadius.lg,
  },
  footer: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: 60,
    gap: tokens.spacing.md,
  },
  loadingText: {
    marginTop: tokens.spacing.md,
    fontSize: tokens.typography.body.fontSize,
    color: tokens.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.xl,
    gap: tokens.spacing.lg,
  },
  errorTitle: {
    fontSize: tokens.typography.heading2.fontSize,
    fontWeight: tokens.typography.heading2.fontWeight,
    color: tokens.colors.white,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: tokens.typography.body.fontSize,
    color: tokens.colors.textSecondary,
    textAlign: 'center',
  },
});
