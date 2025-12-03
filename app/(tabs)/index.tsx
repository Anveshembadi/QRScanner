import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack } from 'expo-router';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { ScanBarcode, MapPin, CheckCircle2, AlertCircle } from 'lucide-react-native';
import BarcodeScanner from '@/components/BarcodeScanner';
import AccountSelector from '@/components/AccountSelector';
import { useKitTracking } from '@/contexts/kit-tracking-context';
import { Location as LocationType, SalesforceAccount } from '@/types/kit';
import { fetchNearestAccounts } from '@/services/salesforce-mock';

export default function TrackKitScreen() {
  const [showScanner, setShowScanner] = useState(false);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus | null>(null);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [currentScannedCode, setCurrentScannedCode] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationType | null>(null);
  const [currentKitId, setCurrentKitId] = useState<string | null>(null);
  const { currentSession, addScannedKit, updateKitAccount } = useKitTracking();

  const accountsQuery = useQuery({
    queryKey: ['accounts', currentLocation],
    queryFn: () => {
      if (!currentLocation) {
        throw new Error('Location not available for account lookup');
      }
      return fetchNearestAccounts(currentLocation);
    },
    enabled: currentLocation !== null && showAccountSelector,
  });

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status);
      console.log('Location permission status:', status);
    } catch (error) {
      console.error('Error checking location permission:', error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
      console.log('Location permission requested, status:', status);
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  const captureLocation = async (): Promise<LocationType | null> => {
    try {
      console.log('Starting location capture...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const locationData: LocationType = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };

      console.log('Location captured:', locationData);
      return locationData;
    } catch (error) {
      console.error('Error capturing location:', error);
      Alert.alert('Location Error', 'Failed to capture GPS location. Please try again.');
      return null;
    }
  };

  const handleScanPress = async () => {
    if (locationPermission !== 'granted') {
      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Location permission is required to track kits. Please enable it in settings.'
        );
        return;
      }
    }
    setShowScanner(true);
  };

  const handleScanned = async (code: string) => {
    setShowScanner(false);
    setIsCapturingLocation(true);

    console.log('Kit code scanned:', code);

    const location = await captureLocation();
    
    setIsCapturingLocation(false);

    if (location) {
      console.log('Location captured, opening account selection');
      const newKit = addScannedKit(code, location);
      setCurrentKitId(newKit.id);
      setCurrentScannedCode(code);
      setCurrentLocation(location);
      setShowAccountSelector(true);
    }
  };

  const handleAccountSelected = (account: SalesforceAccount) => {
    if (!currentKitId) return;

    console.log('Account selected:', account);

    updateKitAccount(currentKitId, account);

    const kitCode = currentScannedCode;

    setShowAccountSelector(false);
    setCurrentKitId(null);
    setCurrentScannedCode(null);
    setCurrentLocation(null);

    Alert.alert(
      'Kit Tracked Successfully',
      `Kit ${kitCode ?? currentKitId} has been associated with ${account.name}`,
      [{ text: 'OK' }]
    );
  };

  const handleAccountSelectionCancel = () => {
    setShowAccountSelector(false);
    setCurrentKitId(null);
    setCurrentScannedCode(null);
    setCurrentLocation(null);
  };

  const completedKits = currentSession.kits.filter(kit => kit.selectedAccount !== null);
  const pendingKits = currentSession.kits.filter(kit => kit.selectedAccount === null);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Track Kit',
          headerStyle: {
            backgroundColor: '#1e40af',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600' as const,
          },
        }}
      />
      
      <View style={styles.container}>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Session</Text>
              <Text style={styles.statusValue}>{currentSession.kits.length}</Text>
              <Text style={styles.statusSubtext}>Total Scans</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Complete</Text>
              <Text style={[styles.statusValue, styles.successText]}>{completedKits.length}</Text>
              <Text style={styles.statusSubtext}>With Accounts</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Pending</Text>
              <Text style={[styles.statusValue, styles.warningText]}>{pendingKits.length}</Text>
              <Text style={styles.statusSubtext}>No Account</Text>
            </View>
          </View>
        </View>

        <View style={styles.permissionSection}>
          <Text style={styles.sectionTitle}>Permissions Status</Text>
          
          <View style={styles.permissionCard}>
            <MapPin color={locationPermission === 'granted' ? '#10b981' : '#f59e0b'} size={24} />
            <View style={styles.permissionInfo}>
              <Text style={styles.permissionLabel}>GPS Location</Text>
              <Text style={styles.permissionStatus}>
                {locationPermission === 'granted' ? 'Granted' : 'Not Granted'}
              </Text>
            </View>
            {locationPermission === 'granted' ? (
              <CheckCircle2 color="#10b981" size={20} />
            ) : (
              <AlertCircle color="#f59e0b" size={20} />
            )}
          </View>
        </View>

        <View style={styles.scanSection}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleScanPress}
            activeOpacity={0.8}
          >
            <ScanBarcode color="#fff" size={32} />
            <Text style={styles.scanButtonText}>Scan Kit Code</Text>
            <Text style={styles.scanButtonSubtext}>QR Code or Barcode</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Recent Scans</Text>
          
          {currentSession.kits.length === 0 ? (
            <View style={styles.emptyState}>
              <ScanBarcode color="#94a3b8" size={48} />
              <Text style={styles.emptyStateText}>No kits scanned yet</Text>
              <Text style={styles.emptyStateSubtext}>Tap the button above to start</Text>
            </View>
          ) : (
            <View style={styles.kitList}>
              {currentSession.kits.slice().reverse().slice(0, 3).map((kit) => (
                <View key={kit.id} style={styles.kitCard}>
                  <View style={styles.kitHeader}>
                    <Text style={styles.kitCode}>{kit.code}</Text>
                    {kit.selectedAccount ? (
                      <View style={styles.statusBadge}>
                        <CheckCircle2 color="#10b981" size={16} />
                        <Text style={styles.statusBadgeText}>Complete</Text>
                      </View>
                    ) : (
                      <View style={[styles.statusBadge, styles.pendingBadge]}>
                        <AlertCircle color="#f59e0b" size={16} />
                        <Text style={[styles.statusBadgeText, styles.pendingText]}>Pending</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.kitDetails}>
                    <MapPin color="#64748b" size={14} />
                    <Text style={styles.kitLocation}>
                      {kit.location.latitude.toFixed(6)}, {kit.location.longitude.toFixed(6)}
                    </Text>
                  </View>
                  
                  {kit.selectedAccount && (
                    <Text style={styles.kitAccount}>{kit.selectedAccount.name}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        <Modal
          visible={showScanner}
          animationType="slide"
          onRequestClose={() => setShowScanner(false)}
        >
          <BarcodeScanner
            onScanned={handleScanned}
            onClose={() => setShowScanner(false)}
          />
        </Modal>

        <Modal
          visible={isCapturingLocation}
          transparent
          animationType="fade"
        >
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Capturing GPS Location...</Text>
              <Text style={styles.loadingSubtext}>Please wait</Text>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showAccountSelector}
          animationType="slide"
          onRequestClose={handleAccountSelectionCancel}
        >
          <AccountSelector
            accounts={accountsQuery.data || []}
            isLoading={accountsQuery.isLoading}
            onSelectAccount={handleAccountSelected}
            onCancel={handleAccountSelectionCancel}
          />
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  statusCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500' as const,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  statusValue: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: '#1e293b',
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 11,
    color: '#94a3b8',
  },
  successText: {
    color: '#10b981',
  },
  warningText: {
    color: '#f59e0b',
  },
  divider: {
    width: 1,
    height: 60,
    backgroundColor: '#e2e8f0',
  },
  permissionSection: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 12,
  },
  permissionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  permissionInfo: {
    flex: 1,
  },
  permissionLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 2,
  },
  permissionStatus: {
    fontSize: 12,
    color: '#64748b',
  },
  scanSection: {
    marginHorizontal: 16,
    marginVertical: 16,
  },
  scanButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold' as const,
    marginTop: 12,
  },
  scanButtonSubtext: {
    color: '#bfdbfe',
    fontSize: 14,
    marginTop: 4,
  },
  listSection: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#64748b',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
  kitList: {
    gap: 12,
  },
  kitCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  kitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kitCode: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#10b981',
  },
  pendingText: {
    color: '#f59e0b',
  },
  kitDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  kitLocation: {
    fontSize: 12,
    color: '#64748b',
  },
  kitAccount: {
    fontSize: 14,
    color: '#475569',
    marginTop: 8,
    fontWeight: '500' as const,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: '#fff',
    paddingHorizontal: 48,
    paddingVertical: 36,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 250,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginTop: 20,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
});
