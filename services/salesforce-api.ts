import type { Location } from "@/types/kit";

export interface SalesforceLoginInput {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  securityToken?: string;
  loginUrl?: string;
}

export interface SalesforceSession {
  access_token: string;
  instance_url: string;
  issued_at: string;
  signature: string;
  token_type: string;
  id: string;
  refresh_token?: string;
  loginUrl: string;
  expires_in?: number;
}

export interface SalesforceAccountResponse {
  records: SalesforceAccountApi[];
}

export interface SalesforceAccountApi {
  id: string;
  name: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
  billingLatitude?: number;
  billingLongitude?: number;
  distanceMeters?: number;
}

const RAW_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || "http://localhost:5001";
const API_BASE_URL = RAW_API_BASE_URL.endsWith("/")
  ? RAW_API_BASE_URL.slice(0, -1)
  : RAW_API_BASE_URL;

const buildApiUrl = (path: string) => `${API_BASE_URL}${path}`;

async function http<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || response.statusText);
  }
  return response.json() as Promise<T>;
}

export const fetchSalesforceCredentials = () =>
  http<SalesforceLoginInput>(buildApiUrl("/api/salesforce/credentials"));

export const authenticateWithPassword = (input: SalesforceLoginInput) =>
  http<SalesforceSession>(buildApiUrl("/api/salesforce/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

export const fetchNearestAccounts = (
  session: SalesforceSession,
  coords: Pick<Location, "latitude" | "longitude">,
  options?: { limit?: number; radiusMeters?: number }
) =>
  http<SalesforceAccountResponse>(buildApiUrl("/api/salesforce/accounts/nearest"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session,
      coords,
      limit: options?.limit,
      radiusMeters: options?.radiusMeters,
    }),
  });
