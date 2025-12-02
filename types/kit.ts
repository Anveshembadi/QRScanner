export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export interface SalesforceAccount {
  id: string;
  name: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  distance?: number;
}

export interface ScannedKit {
  id: string;
  code: string;
  scannedAt: Date;
  location: Location;
  selectedAccount: SalesforceAccount | null;
}

export interface KitSession {
  id: string;
  startedAt: Date;
  kits: ScannedKit[];
}
