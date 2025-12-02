import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { MapPin, Building2, CheckCircle } from 'lucide-react-native';
import { SalesforceAccount } from '@/types/kit';

interface AccountSelectorProps {
  accounts: SalesforceAccount[];
  isLoading: boolean;
  onSelectAccount: (account: SalesforceAccount) => void;
  onCancel: () => void;
}

export default function AccountSelector({
  accounts,
  isLoading,
  onSelectAccount,
  onCancel,
}: AccountSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (account: SalesforceAccount) => {
    setSelectedId(account.id);
    setTimeout(() => {
      onSelectAccount(account);
    }, 200);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Searching for nearest accounts...</Text>
          <Text style={styles.loadingSubtext}>Querying Salesforce</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Account</Text>
        <Text style={styles.subtitle}>
          Found {accounts.length} nearby {accounts.length === 1 ? 'account' : 'accounts'}
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {accounts.map((account) => (
          <TouchableOpacity
            key={account.id}
            style={[
              styles.accountCard,
              selectedId === account.id && styles.selectedCard,
            ]}
            onPress={() => handleSelect(account)}
            activeOpacity={0.7}
          >
            <View style={styles.accountHeader}>
              <Building2 
                color={selectedId === account.id ? '#2563eb' : '#64748b'} 
                size={24} 
              />
              <View style={styles.accountTitleSection}>
                <Text style={[
                  styles.accountName,
                  selectedId === account.id && styles.selectedText,
                ]}>
                  {account.name}
                </Text>
                {account.distance !== undefined && (
                  <View style={styles.distanceBadge}>
                    <MapPin color="#10b981" size={12} />
                    <Text style={styles.distanceText}>
                      {account.distance.toFixed(2)} km
                    </Text>
                  </View>
                )}
              </View>
              {selectedId === account.id && (
                <CheckCircle color="#2563eb" size={24} />
              )}
            </View>

            {(account.billingStreet || account.billingCity) && (
              <View style={styles.addressSection}>
                <Text style={styles.addressText}>
                  {[
                    account.billingStreet,
                    account.billingCity,
                    account.billingState,
                    account.billingPostalCode,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginTop: 24,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  accountCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  selectedCard: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  accountTitleSection: {
    flex: 1,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 6,
  },
  selectedText: {
    color: '#2563eb',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#059669',
  },
  addressSection: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    marginLeft: 36,
  },
  addressText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#475569',
  },
});
