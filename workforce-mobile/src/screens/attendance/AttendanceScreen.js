import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraView } from 'expo-camera';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import attendanceService from '../../../mobile-shared/services/attendance.service';
import Card from '../../../mobile-shared/components/common/Card';
import colors from '../../../mobile-shared/constants/colors';
import { format } from 'date-fns';

const AttendanceScreen = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentAttendance, setCurrentAttendance] = useState(null);
  const [upcomingShifts, setUpcomingShifts] = useState([]);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    requestPermissions();
    fetchData();
  }, []);

  const requestPermissions = async () => {
    // Request camera permission
    const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(cameraStatus === 'granted');

    // Request location permission
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    setHasLocationPermission(locationStatus === 'granted');

    if (locationStatus === 'granted') {
      getCurrentLocation();
    }
  };

  const getCurrentLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Unable to get your current location');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [currentResult, shiftsResult] = await Promise.all([
        attendanceService.getCurrentAttendance(),
        attendanceService.getUpcomingShifts(),
      ]);

      if (currentResult.success && currentResult.data) {
        setCurrentAttendance(currentResult.data);
      }

      if (shiftsResult.success) {
        setUpcomingShifts(shiftsResult.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanning(false);

    if (!location) {
      Alert.alert(
        'Location Required',
        'Please enable location services to clock in',
        [{ text: 'OK', onPress: () => getCurrentLocation() }]
      );
      return;
    }

    try {
      setLoading(true);
      
      // Parse QR data
      const qrInfo = JSON.parse(data);
      
      // Find the booking for this shift
      const shiftBooking = upcomingShifts.find(
        shift => shift.shift_id === qrInfo.shift_id
      );

      if (!shiftBooking) {
        Alert.alert('Error', 'This shift is not assigned to you');
        return;
      }

      const result = await attendanceService.clockIn(
        data,
        location,
        shiftBooking.booking_id
      );

      if (result.success) {
        Alert.alert(
          'Success',
          'You have been clocked in successfully!',
          [{ text: 'OK', onPress: fetchData }]
        );
      } else {
        Alert.alert('Clock In Failed', result.error || 'Please try again');
      }
    } catch (error) {
      Alert.alert('Error', 'Invalid QR code. Please scan a valid shift QR code.');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!currentAttendance) {
      Alert.alert('Error', 'No active clock-in found');
      return;
    }

    if (!location) {
      Alert.alert(
        'Location Required',
        'Please enable location services to clock out',
        [{ text: 'OK', onPress: () => getCurrentLocation() }]
      );
      return;
    }

    Alert.alert(
      'Clock Out',
      'Are you sure you want to clock out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clock Out',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await attendanceService.clockOut(
                currentAttendance.booking_id,
                location
              );

              if (result.success) {
                Alert.alert(
                  'Success',
                  'You have been clocked out successfully!',
                  [{ text: 'OK', onPress: fetchData }]
                );
              } else {
                Alert.alert('Clock Out Failed', result.error || 'Please try again');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to clock out. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderCurrentStatus = () => {
    if (currentAttendance) {
      const clockInTime = new Date(currentAttendance.clock_in_time);
      const now = new Date();
      const duration = Math.floor((now - clockInTime) / 1000 / 60); // minutes

      return (
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusIndicator}>
              <View style={styles.pulseDot} />
            </View>
            <View style={styles.statusContent}>
              <Text style={styles.statusTitle}>Currently Clocked In</Text>
              <Text style={styles.statusSubtitle}>
                {currentAttendance.company_name || 'Shift'}
              </Text>
            </View>
          </View>

          <View style={styles.statusDetails}>
            <View style={styles.statusRow}>
              <Ionicons name="time-outline" size={20} color={colors.workforce.primary} />
              <Text style={styles.statusText}>
                Clocked in at {format(clockInTime, 'h:mm a')}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Ionicons name="timer-outline" size={20} color={colors.workforce.primary} />
              <Text style={styles.statusText}>
                Duration: {Math.floor(duration / 60)}h {duration % 60}m
              </Text>
            </View>
            {currentAttendance.geofence_verified && (
              <View style={styles.statusRow}>
                <Ionicons name="location" size={20} color={colors.success} />
                <Text style={[styles.statusText, styles.verifiedText]}>
                  Location Verified
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.clockOutButton}
            onPress={handleClockOut}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color={colors.white} />
                <Text style={styles.clockOutButtonText}>Clock Out</Text>
              </>
            )}
          </TouchableOpacity>
        </Card>
      );
    }

    return (
      <Card style={styles.statusCard}>
        <View style={styles.notClockedIn}>
          <Ionicons name="time-outline" size={48} color={colors.workforce.textMuted} />
          <Text style={styles.notClockedInTitle}>Not Clocked In</Text>
          <Text style={styles.notClockedInSubtitle}>
            Scan a QR code at your workplace to clock in
          </Text>
        </View>
      </Card>
    );
  };

  const renderUpcomingShifts = () => {
    if (upcomingShifts.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color={colors.workforce.textMuted} />
          <Text style={styles.emptyTitle}>No Upcoming Shifts</Text>
          <Text style={styles.emptySubtitle}>
            Your scheduled shifts will appear here
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.shiftsContainer}>
        <Text style={styles.sectionTitle}>Upcoming Shifts</Text>
        {upcomingShifts.map((shift, index) => (
          <Card key={index} style={styles.shiftCard}>
            <Text style={styles.shiftCompany}>{shift.company_name}</Text>
            <Text style={styles.shiftPosition}>{shift.position_title}</Text>
            <View style={styles.shiftDetails}>
              <View style={styles.shiftDetailRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.workforce.textLight} />
                <Text style={styles.shiftDetailText}>{shift.shift_date}</Text>
              </View>
              <View style={styles.shiftDetailRow}>
                <Ionicons name="time-outline" size={16} color={colors.workforce.textLight} />
                <Text style={styles.shiftDetailText}>
                  {shift.start_time} - {shift.end_time}
                </Text>
              </View>
              <View style={styles.shiftDetailRow}>
                <Ionicons name="location-outline" size={16} color={colors.workforce.textLight} />
                <Text style={styles.shiftDetailText}>{shift.workplace_name}</Text>
              </View>
            </View>
          </Card>
        ))}
      </View>
    );
  };

  if (hasPermission === null || hasLocationPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.workforce.primary} />
          <Text style={styles.loadingText}>Requesting permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionDenied}>
          <Ionicons name="camera-outline" size={64} color={colors.error} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            Please enable camera access to scan QR codes for attendance
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasLocationPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionDenied}>
          <Ionicons name="location-outline" size={64} color={colors.error} />
          <Text style={styles.permissionTitle}>Location Permission Required</Text>
          <Text style={styles.permissionText}>
            Please enable location access for geofencing verification
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (scanning) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          />
          <View style={styles.scannerOverlay}>
            <Text style={styles.scannerTitle}>Scan QR Code</Text>
            <Text style={styles.scannerSubtitle}>
              Point your camera at the shift QR code
            </Text>
            <View style={styles.scannerFrame} />
          </View>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setScanning(false)}
          >
            <Ionicons name="close-circle" size={48} color={colors.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance</Text>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => navigation.navigate('AttendanceHistory')}
        >
          <Ionicons name="list-outline" size={24} color={colors.workforce.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {renderCurrentStatus()}

        {!currentAttendance && (
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setScanning(true)}
            disabled={loading}
          >
            <Ionicons name="qr-code-outline" size={32} color={colors.white} />
            <Text style={styles.scanButtonText}>Scan QR Code to Clock In</Text>
          </TouchableOpacity>
        )}

        {renderUpcomingShifts()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.workforce.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.workforce.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.workforce.text,
  },
  historyButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.workforce.textLight,
  },
  permissionDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.workforce.text,
    marginTop: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: colors.workforce.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  statusCard: {
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicator: {
    marginRight: 12,
  },
  pulseDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.workforce.text,
  },
  statusSubtitle: {
    fontSize: 14,
    color: colors.workforce.textLight,
    marginTop: 2,
  },
  statusDetails: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  statusText: {
    fontSize: 14,
    color: colors.workforce.text,
    marginLeft: 8,
  },
  verifiedText: {
    color: colors.success,
    fontWeight: '600',
  },
  clockOutButton: {
    flexDirection: 'row',
    backgroundColor: colors.error,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  clockOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  notClockedIn: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  notClockedInTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.workforce.text,
    marginTop: 16,
  },
  notClockedInSubtitle: {
    fontSize: 14,
    color: colors.workforce.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  scanButton: {
    flexDirection: 'row',
    backgroundColor: colors.workforce.primary,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  scanButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  shiftsContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.workforce.text,
    marginBottom: 12,
  },
  shiftCard: {
    marginBottom: 12,
  },
  shiftCompany: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.workforce.textLight,
    marginBottom: 4,
  },
  shiftPosition: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.workforce.text,
    marginBottom: 8,
  },
  shiftDetails: {
    gap: 6,
  },
  shiftDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shiftDetailText: {
    fontSize: 14,
    color: colors.workforce.textLight,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.workforce.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.workforce.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  scannerContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scannerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
  },
  scannerSubtitle: {
    fontSize: 16,
    color: colors.white,
    marginBottom: 40,
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: colors.white,
    borderRadius: 12,
  },
  cancelButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  },
});

export default AttendanceScreen;
