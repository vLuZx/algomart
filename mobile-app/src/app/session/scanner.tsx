/**
 * Scanner Screen
 * Barcode scanning with camera
 *
 * Debug-heavy rewrite to understand:
 * - why processing UI does not remain visible
 * - why single scan does not reliably go back
 * - whether repeated camera detections are stomping UI state
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, useCameraDevices, useCodeScanner } from 'react-native-vision-camera';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

import { useScanner } from '../../hooks/use-scanner';
import { useSession } from '../../features/session/hooks/use-session';
import { tokens } from '../../constants/tokens';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { SessionMode } from '../../features/session/types/session.types';

type ScanFeedbackState = 'none' | 'processing' | 'already-scanned';

const MIN_FEEDBACK_MS = 500;
const LOCAL_EVENT_LOCK_MS = 500;

export default function ScannerScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{ sessionId: string; mode: SessionMode }>();

	const sessionId = params.sessionId;
	const mode = params.mode || 'single';

	const [cameraActive, setCameraActive] = useState(true);
	const [scanFeedback, setScanFeedback] = useState<ScanFeedbackState>('none');

	const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isMountedRef = useRef(true);
	const isClosingRef = useRef(false);
	const localEventLockUntilRef = useRef(0);
	const lastFeedbackChangeAtRef = useRef(0);

	const devices = useCameraDevices();
	const device = devices.find((d) => d.position === 'back');

	const { session } = useSession(sessionId);
	const scansInSession = session?.productCount || 0;

	const log = useCallback((message: string, payload?: unknown) => {
		const timestamp = new Date().toISOString();
		if (payload !== undefined) {
			console.log(`[ScannerScreen ${timestamp}] ${message}`, payload);
			return;
		}
		console.log(`[ScannerScreen ${timestamp}] ${message}`);
	}, []);

	const clearFeedbackTimer = useCallback((reason: string) => {
		if (feedbackTimerRef.current) {
			log(`Clearing feedback timer: ${reason}`);
			clearTimeout(feedbackTimerRef.current);
			feedbackTimerRef.current = null;
		}
	}, [log]);

	const setFeedbackState = useCallback((nextState: ScanFeedbackState, reason: string) => {
		const previousState = scanFeedback;
		lastFeedbackChangeAtRef.current = Date.now();
		log(`scanFeedback change: ${previousState} -> ${nextState} (${reason})`);
		setScanFeedback(nextState);
	}, [log, scanFeedback]);

	const scheduleFeedbackTimer = useCallback(
		(callback: () => void, delayMs: number, reason: string) => {
			clearFeedbackTimer(`reschedule for ${reason}`);
			log(`Scheduling feedback timer: ${reason}`, { delayMs });

			feedbackTimerRef.current = setTimeout(() => {
				log(`Feedback timer fired: ${reason}`);
				callback();
			}, delayMs);
		},
		[clearFeedbackTimer, log]
	);

	const beginLocalUiLock = useCallback((reason: string, durationMs = LOCAL_EVENT_LOCK_MS) => {
		localEventLockUntilRef.current = Date.now() + durationMs;
		log(`Local UI lock started (${reason})`, {
			until: localEventLockUntilRef.current,
			durationMs,
		});
	}, [log]);

	const isLocallyLocked = useCallback(() => {
		const locked = Date.now() < localEventLockUntilRef.current;
		if (locked) {
			log('Local UI lock is active', {
				now: Date.now(),
				until: localEventLockUntilRef.current,
			});
		}
		return locked;
	}, [log]);

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
			log('onScanComplete callback entered', {
				barcode,
				mode,
				isScanning,
				cameraActive,
				scanFeedback,
			});

			beginLocalUiLock('onScanComplete');

			// Important:
			// processing UI must be visible for at least 500ms HERE on the screen.
			// If the hook already delayed internally, that does not help the UI unless
			// this screen keeps scanFeedback="processing" visible long enough.
			setFeedbackState('processing', 'onScanComplete');

			scheduleFeedbackTimer(() => {
				if (!isMountedRef.current) {
					log('Skipping onScanComplete timer action because component is unmounted');
					return;
				}

				if (mode === 'single') {
					log('Single mode: processing feedback window complete, navigating back');
					safeGoBack('single scan complete');
					return;
				}

				log('Rapid mode: clearing processing feedback after minimum display');
				setFeedbackState('none', 'rapid processing complete');
			}, MIN_FEEDBACK_MS, 'processing minimum display');
		},
		onDuplicateScan: (barcode) => {
			log('onDuplicateScan callback entered', {
				barcode,
				mode,
				isScanning,
				cameraActive,
				scanFeedback,
			});

			beginLocalUiLock('onDuplicateScan');
			setFeedbackState('already-scanned', 'duplicate detected');

			scheduleFeedbackTimer(() => {
				if (!isMountedRef.current) {
					log('Skipping duplicate timer action because component is unmounted');
					return;
				}

				log('Duplicate feedback window complete, clearing to none');
				setFeedbackState('none', 'duplicate feedback complete');
			}, MIN_FEEDBACK_MS, 'duplicate minimum display');
		},
	});

  const safeGoBack = useCallback((reason: string) => {
		if (isClosingRef.current) {
			log(`safeGoBack ignored because screen is already closing (${reason})`);
			return;
		}

		isClosingRef.current = true;
		log(`safeGoBack start (${reason})`);

		clearFeedbackTimer(`safeGoBack: ${reason}`);
		setCameraActive(false);
		log('Camera deactivated before stop/back');

		try {
			log('Calling stop() before router.back()');
			stop();
		} catch (error) {
			log('stop() threw an error', error);
		}

		try {
			log('Calling router.back()');
			router.back();
		} catch (error) {
			log('router.back() threw an error', error);
		}
	}, [clearFeedbackTimer, log, router, stop]);

	useEffect(() => {
		log('Screen mounted', { sessionId, mode });
		return () => {
			isMountedRef.current = false;
			log('Screen unmounting');
			clearFeedbackTimer('component unmount');
		};
	}, [clearFeedbackTimer, log, mode, sessionId]);

	useEffect(() => {
		log('permission changed', { permission });
	}, [log, permission]);

	useEffect(() => {
		log('isScanning changed', { isScanning });
	}, [isScanning, log]);

	useEffect(() => {
		log('cameraActive changed', { cameraActive });
	}, [cameraActive, log]);

	useEffect(() => {
		log('scanFeedback changed', {
			scanFeedback,
			lastChangedAt: lastFeedbackChangeAtRef.current,
		});
	}, [log, scanFeedback]);

	useEffect(() => {
		log('session summary changed', {
			sessionId,
			productCount: session?.productCount,
			scansInSession,
		});
	}, [log, scansInSession, session?.productCount, sessionId]);

	useEffect(() => {
		log('scanner status changed', { status });
	}, [log, status]);

	useEffect(() => {
		(async () => {
			log('Requesting camera permission...');
			const permissionStatus = await Camera.requestCameraPermission();
			log('Camera permission result', { permissionStatus });
			setPermission(permissionStatus === 'granted' ? 'granted' : 'denied');
		})();
	}, [log, setPermission]);

	useEffect(() => {
		if (permission === 'granted' && !isScanning && !isClosingRef.current) {
			log('Starting scanner because permission is granted and scanner is not active');
			start();
			return;
		}

		log('Start scanner effect skipped', {
			permission,
			isScanning,
			isClosing: isClosingRef.current,
		});
	}, [isScanning, log, permission, start]);

	const codeScanner = useCodeScanner({
		codeTypes: ['ean-13', 'ean-8', 'upc-a', 'upc-e'],
		onCodeScanned: (codes) => {
			log('VisionCamera onCodeScanned fired', {
				codesLength: codes.length,
				scanFeedback,
				isScanning,
				cameraActive,
				isClosing: isClosingRef.current,
			});

			if (isClosingRef.current) {
				log('Ignoring code scan because screen is closing');
				return;
			}

			if (isLocallyLocked()) {
				log('Ignoring code scan because local UI lock is active');
				return;
			}

			if (codes.length === 0) {
				log('Ignoring code scan because no codes were received');
				return;
			}

			const code = codes[0];

			if (!code?.value) {
				log('Ignoring code scan because first code has no value', code);
				return;
			}

			log('Forwarding barcode to useScanner.handleBarcodeDetected', {
				value: code.value,
				type: code.type,
				frame: code.frame,
			});

			handleBarcodeDetected(code.value, code.type || 'UNKNOWN');
		},
	});

	const handleClose = useCallback(() => {
		log('Manual close button pressed');
		safeGoBack('manual close');
	}, [log, safeGoBack]);

	const handleSaveScans = useCallback(() => {
		log('Save scans button pressed');
		safeGoBack('save scans');
	}, [log, safeGoBack]);

	const instructionText = useMemo(() => {
		if (scanFeedback === 'processing') {
			return 'Processing...';
		}
		if (scanFeedback === 'already-scanned') {
			return 'Already scanned';
		}
		return 'Point camera at barcode';
	}, [scanFeedback]);

	if (permission === 'undetermined') {
		log('Rendering undetermined permission state');
		return (
			<View style={styles.container}>
				<LoadingSpinner size="large" />
				<Text style={styles.loadingText}>Requesting camera permission...</Text>
			</View>
		);
	}

	if (permission === 'denied') {
		log('Rendering denied permission state');
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

	if (!device) {
		log('Rendering no-device state');
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

	log('Rendering scanner screen', {
		mode,
		sessionId,
		isScanning,
		cameraActive,
		scanFeedback,
		showSaveScans: mode === 'rapid' && scansInSession > 0,
	});

	return (
		<View style={styles.container}>
			<Camera
				style={StyleSheet.absoluteFill}
				device={device}
				isActive={cameraActive && isScanning && !isClosingRef.current}
				codeScanner={codeScanner}
			/>

			<View style={styles.overlay}>
				<View style={styles.header}>
					<Text style={styles.title}>
						{mode === 'single' ? 'Scan Product' : 'Rapid Scan Mode'}
					</Text>

					<Pressable onPress={handleClose} style={styles.closeButton}>
						<FontAwesome6 name="xmark" size={20} color={tokens.colors.white} />
					</Pressable>
				</View>

				<View style={styles.viewfinderContainer}>
					{scanFeedback === 'processing' && <View style={styles.darkOverlay} />}

					<View style={styles.viewfinder}>
						{scanFeedback === 'processing' && (
							<View style={styles.scanSuccessBox} />
						)}

						<View style={[styles.corner, styles.topLeft]} />
						<View style={[styles.corner, styles.topRight]} />
						<View style={[styles.corner, styles.bottomLeft]} />
						<View style={[styles.corner, styles.bottomRight]} />
					</View>

					<Text style={styles.instruction}>{instructionText}</Text>
				</View>

				<View style={styles.footer}>
					{mode === 'rapid' && scansInSession > 0 && (
						<Button
							title="Save Scans"
							onPress={handleSaveScans}
							variant="primary"
						/>
					)}
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
	viewfinderContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: tokens.spacing.xl,
		position: 'relative',
	},
	darkOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(50, 50, 50, 0.8)',
	},
	viewfinder: {
		width: 300,
		height: 180,
		position: 'relative',
	},
	scanSuccessBox: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		borderWidth: 3,
		borderColor: 'rgba(52, 199, 89, 0.95)',
		borderRadius: tokens.borderRadius.md,
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