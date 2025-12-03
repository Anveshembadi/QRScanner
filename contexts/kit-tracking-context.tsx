import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScannedKit, Location, SalesforceAccount, KitSession } from '@/types/kit';

const SESSION_STORAGE_KEY = 'kit-tracking-session';

type StoredKit = Omit<ScannedKit, 'scannedAt'> & { scannedAt: string };
type StoredSession = Omit<KitSession, 'startedAt' | 'kits'> & {
  startedAt: string;
  kits: StoredKit[];
};

const createEmptySession = (): KitSession => ({
  id: Date.now().toString(),
  startedAt: new Date(),
  kits: [],
});

const parseStoredSession = (value: string): KitSession | null => {
  try {
    const raw = JSON.parse(value) as StoredSession;

    if (!raw?.id || !raw.startedAt) {
      return null;
    }

    return {
      id: raw.id,
      startedAt: new Date(raw.startedAt),
      kits: Array.isArray(raw.kits)
        ? raw.kits.map((kit) => ({
            ...kit,
            scannedAt: new Date(kit.scannedAt),
          }))
        : [],
    };
  } catch (error) {
    console.error('Failed to parse stored session:', error);
    return null;
  }
};

export const [KitTrackingProvider, useKitTracking] = createContextHook(() => {
  const [currentSession, setCurrentSession] = useState<KitSession>(createEmptySession());
  const [isHydrated, setIsHydrated] = useState(false);

  const [pendingKit, setPendingKit] = useState<{
    code: string;
    location: Location;
  } | null>(null);

  useEffect(() => {
    const hydrateSession = async () => {
      try {
        const storedSession = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (storedSession) {
          const parsedSession = parseStoredSession(storedSession);
          if (parsedSession) {
            setCurrentSession(parsedSession);
          }
        }
      } catch (error) {
        console.error('Failed to load stored session:', error);
      } finally {
        setIsHydrated(true);
      }
    };

    hydrateSession();
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentSession)).catch(error => {
      console.error('Failed to save session:', error);
    });
  }, [currentSession, isHydrated]);

  const addScannedKit = useCallback((code: string, location: Location) => {
    const newKit: ScannedKit = {
      id: Date.now().toString(),
      code,
      scannedAt: new Date(),
      location,
      selectedAccount: null,
    };

    setCurrentSession(prev => ({
      ...prev,
      kits: [...prev.kits, newKit],
    }));

    setPendingKit({ code, location });

    return newKit;
  }, []);

  const updateKitAccount = useCallback((kitId: string, account: SalesforceAccount) => {
    setCurrentSession(prev => ({
      ...prev,
      kits: prev.kits.map(kit =>
        kit.id === kitId ? { ...kit, selectedAccount: account } : kit
      ),
    }));

    setPendingKit(null);
  }, []);

  const clearPendingKit = useCallback(() => {
    setPendingKit(null);
  }, []);

  const startNewSession = useCallback(() => {
    setCurrentSession(createEmptySession());
    setPendingKit(null);
  }, []);

  const getKitById = useCallback((kitId: string) => {
    return currentSession.kits.find(kit => kit.id === kitId) || null;
  }, [currentSession.kits]);

  return {
    currentSession,
    pendingKit,
    addScannedKit,
    updateKitAccount,
    clearPendingKit,
    startNewSession,
    getKitById,
  };
});
