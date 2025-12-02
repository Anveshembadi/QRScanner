import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { MapPin, CheckCircle2, AlertCircle, Calendar, Package } from 'lucide-react-native';
import { useKitTracking } from '@/contexts/kit-tracking-context';

export default function HistoryScreen() {
  const { currentSession, startNewSession } = useKitTracking();

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatLocation = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Session History',
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
        <View style={styles.headerCard}>
          <View style={styles.sessionInfo}>
            <Calendar color="#2563eb" size={24} />
            <View style={styles.sessionDetails}>
              <Text style={styles.sessionLabel}>Current Session</Text>
              <Text style={styles.sessionDate}>
                Started {formatDate(currentSession.startedAt)}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Package color="#2563eb" size={20} />
              <Text style={styles.statValue}>{currentSession.kits.length}</Text>
              <Text style={styles.statLabel}>Total Kits</Text>
            </View>
            <View style={styles.statBox}>
              <CheckCircle2 color="#10b981" size={20} />
              <Text style={styles.statValue}>
                {currentSession.kits.filter(k => k.selectedAccount).length}
              </Text>
              <Text style={styles.statLabel}>Complete</Text>
            </View>
            <View style={styles.statBox}>
              <AlertCircle color="#f59e0b" size={20} />
              <Text style={styles.statValue}>
                {currentSession.kits.filter(k => !k.selectedAccount).length}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.newSessionButton}
            onPress={startNewSession}
            activeOpacity={0.7}
          >
            <Text style={styles.newSessionButtonText}>Start New Session</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>All Scanned Kits</Text>
          <Text style={styles.listCount}>{currentSession.kits.length} items</Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {currentSession.kits.length === 0 ? (
            <View style={styles.emptyState}>
              <Package color="#cbd5e1" size={64} />
              <Text style={styles.emptyStateTitle}>No Kits Scanned</Text>
              <Text style={styles.emptyStateText}>
                Go to Track Kit tab and scan your first kit
              </Text>
            </View>
          ) : (
            <View style={styles.kitsList}>
              {currentSession.kits.slice().reverse().map((kit, index) => (
                <View key={kit.id} style={styles.kitCard}>
                  <View style={styles.kitCardHeader}>
                    <View style={styles.kitNumber}>
                      <Text style={styles.kitNumberText}>
                        #{currentSession.kits.length - index}
                      </Text>
                    </View>
                    {kit.selectedAccount ? (
                      <View style={styles.completeBadge}>
                        <CheckCircle2 color="#10b981" size={14} />
                        <Text style={styles.completeBadgeText}>Complete</Text>
                      </View>
                    ) : (
                      <View style={styles.pendingBadge}>
                        <AlertCircle color="#f59e0b" size={14} />
                        <Text style={styles.pendingBadgeText}>Pending</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.kitContent}>
                    <Text style={styles.kitCode}>{kit.code}</Text>
                    <Text style={styles.kitTime}>{formatDate(kit.scannedAt)}</Text>

                    <View style={styles.locationRow}>
                      <MapPin color="#64748b" size={16} />
                      <View style={styles.locationInfo}>
                        <Text style={styles.locationLabel}>GPS Location</Text>
                        <Text style={styles.locationValue}>
                          {formatLocation(kit.location.latitude, kit.location.longitude)}
                        </Text>
                        {kit.location.accuracy && (
                          <Text style={styles.accuracyText}>
                            Accuracy: ±{kit.location.accuracy.toFixed(0)}m
                          </Text>
                        )}
                      </View>
                    </View>

                    {kit.selectedAccount ? (
                      <View style={styles.accountSection}>
                        <Text style={styles.accountLabel}>Associated Account</Text>
                        <Text style={styles.accountName}>{kit.selectedAccount.name}</Text>
                        {kit.selectedAccount.billingCity && (
                          <Text style={styles.accountAddress}>
                            {[
                              kit.selectedAccount.billingStreet,
                              kit.selectedAccount.billingCity,
                              kit.selectedAccount.billingState,
                              kit.selectedAccount.billingPostalCode,
                            ]
                              .filter(Boolean)
                              .join(', ')}
                          </Text>
                        )}
                        {kit.selectedAccount.distance !== undefined && (
                          <Text style={styles.distanceText}>
                            Distance: {kit.selectedAccount.distance.toFixed(2)} km
                          </Text>
                        )}
                      </View>
                    ) : (
                      <View style={styles.noAccountSection}>
                        <AlertCircle color="#94a3b8" size={16} />
                        <Text style={styles.noAccountText}>
                          No account associated yet
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
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
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sessionDetails: {
    flex: 1,
  },
  sessionLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 13,
    color: '#64748b',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  newSessionButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  newSessionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  listCount: {
    fontSize: 14,
    color: '#64748b',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#64748b',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  kitsList: {
    gap: 16,
  },
  kitCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  kitCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  kitNumber: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  kitNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completeBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#10b981',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#f59e0b',
  },
  kitContent: {
    padding: 16,
  },
  kitCode: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 4,
  },
  kitTime: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#475569',
    marginBottom: 4,
  },
  locationValue: {
    fontSize: 13,
    color: '#1e293b',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  accuracyText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  accountSection: {
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  accountLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#047857',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 4,
  },
  accountAddress: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 6,
  },
  distanceText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500' as const,
  },
  noAccountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#cbd5e1',
  },
  noAccountText: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
});
