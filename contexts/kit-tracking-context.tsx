import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScannedKit, Location, SalesforceAccount, KitSession } from '@/types/kit';

const SESSION_STORAGE_KEY = 'kit-tracking-session';

export const [KitTrackingProvider, useKitTracking] = createContextHook(() => {
  const [currentSession, setCurrentSession] = useState<KitSession>({
    id: Date.now().toString(),
    startedAt: new Date(),
    kits: [],
  });

  const [pendingKit, setPendingKit] = useState<{
    code: string;
    location: Location;
  } | null>(null);

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

    AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      ...currentSession,
      kits: currentSession.kits.map(kit =>
        kit.id === kitId ? { ...kit, selectedAccount: account } : kit
      ),
    })).catch(error => {
      console.error('Failed to save session:', error);
    });
  }, [currentSession]);

  const clearPendingKit = useCallback(() => {
    setPendingKit(null);
  }, []);

  const startNewSession = useCallback(() => {
    const newSession: KitSession = {
      id: Date.now().toString(),
      startedAt: new Date(),
      kits: [],
    };
    setCurrentSession(newSession);
    setPendingKit(null);
    AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession)).catch(error => {
      console.error('Failed to save new session:', error);
    });
  }, []);

  const getKitById = useCallback((kitId: string) => {
    return currentSession.kits.find(kit => kit.id === kitId) || null;
  }, [currentSession]);

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
