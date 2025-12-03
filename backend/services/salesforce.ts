import type { Location, SalesforceAccount } from "@/types/kit";
import {
  fetchNearestAccounts as fetchMockAccounts,
} from "@/services/salesforce-mock";
import {
  ensureSalesforceAuth,
  getSalesforceAuthStatus,
} from "@/backend/services/salesforce-auth";

const SALESFORCE_API_VERSION =
  process.env.SALESFORCE_API_VERSION ?? "v65.0";
const DEFAULT_RADIUS_KM = Number(
  process.env.SALESFORCE_SEARCH_RADIUS_KM ?? 25
);
const MAX_RESULTS = Number(
  process.env.SALESFORCE_MAX_RESULTS ?? 10
);
const CUSTOM_LATITUDE_FIELD =
  process.env.SALESFORCE_LATITUDE_FIELD || "Latitude__c";
const CUSTOM_LONGITUDE_FIELD =
  process.env.SALESFORCE_LONGITUDE_FIELD || "Longitude__c";

const SALESFORCE_DEBUG =
  process.env.SALESFORCE_DEBUG === "1" ||
  process.env.NODE_ENV !== "production";

const logDebug = (...args: unknown[]) => {
  if (SALESFORCE_DEBUG) {
    console.log("[Salesforce]", ...args);
  }
};

const milesFromKm = (km: number) => km * 0.621371;
const kmFromMiles = (miles: number) => miles * 1.60934;

const buildNearestAccountsQuery = (
  location: Pick<Location, "latitude" | "longitude">,
  radiusKm: number,
  limit: number
) => {
  const radiusMiles = milesFromKm(radiusKm).toFixed(2);
  const selectFields = [
    "Id",
    "Name",
    "BillingStreet",
    "BillingCity",
    "BillingState",
    "BillingPostalCode",
    "BillingCountry",
    "BillingLatitude",
    "BillingLongitude",
    CUSTOM_LATITUDE_FIELD,
    CUSTOM_LONGITUDE_FIELD,
    `DISTANCE(BillingAddress, GEOLOCATION(${location.latitude}, ${location.longitude}), 'mi') distanceMiles`,
  ];

  return `SELECT ${selectFields.join(", ")} FROM Account WHERE DISTANCE(BillingAddress, GEOLOCATION(${location.latitude}, ${location.longitude}), 'mi') < ${radiusMiles} ORDER BY distanceMiles ASC LIMIT ${limit}`;
};

const parseCoordinate = (
  record: Record<string, unknown>,
  fallbackField: string,
  customField: string | null
) => {
  const candidates = [
    customField ? (record[customField] as number | string | null | undefined) : undefined,
    record[fallbackField] as number | string | null | undefined,
  ];

  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return null;
};

let lastAccountsSuccessAt: number | null = null;
let lastAccountsError: string | null = null;

export const getSalesforceAccountsStatus = () => ({
  connected: lastAccountsSuccessAt !== null,
  lastSuccessAt: lastAccountsSuccessAt,
  error: lastAccountsError,
});

export async function fetchSalesforceAccountsNearby(
  location: Pick<Location, "latitude" | "longitude">,
  radiusKm: number = DEFAULT_RADIUS_KM
): Promise<SalesforceAccount[]> {
  try {
    const auth = await ensureSalesforceAuth();

    if (!auth) {
      console.warn(
        "[Salesforce] Missing credentials. Falling back to mock account data."
      );
      lastAccountsError = "Missing Salesforce credentials";
      return fetchMockAccounts({
        ...location,
        accuracy: null,
        timestamp: Date.now(),
      });
    }

    const soql = buildNearestAccountsQuery(location, radiusKm, MAX_RESULTS);
    logDebug("Running SOQL:", soql);

    const response = await fetch(
      `${auth.instanceUrl}/services/data/v${SALESFORCE_API_VERSION}/query?q=${encodeURIComponent(
        soql
      )}`,
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `[Salesforce] Failed to query nearest accounts (${response.status}): ${body}`
      );
    }

    const data = (await response.json()) as {
      records: Array<Record<string, unknown>>;
    };

    const accounts = data.records
      .map((record) => {
        const latitude = parseCoordinate(
          record,
          "BillingLatitude",
          CUSTOM_LATITUDE_FIELD
        );
        const longitude = parseCoordinate(
          record,
          "BillingLongitude",
          CUSTOM_LONGITUDE_FIELD
        );

        if (latitude === null || longitude === null) {
          return null;
        }

        const distanceMiles = Number(record.distanceMiles ?? 0);
        const distanceKm = Number.isFinite(distanceMiles)
          ? kmFromMiles(distanceMiles)
          : undefined;

        return {
          id: String(record.Id),
          name: String(record.Name),
          billingStreet: record.BillingStreet as string | undefined,
          billingCity: record.BillingCity as string | undefined,
          billingState: record.BillingState as string | undefined,
          billingPostalCode: record.BillingPostalCode as string | undefined,
          distance: distanceKm,
        } satisfies SalesforceAccount;
      })
      .filter((record): record is SalesforceAccount => Boolean(record));

    lastAccountsSuccessAt = Date.now();
    lastAccountsError = null;

    logDebug("Accounts retrieved:", accounts.length);
    return accounts;
  } catch (error) {
    lastAccountsError =
      error instanceof Error ? error.message : String(error);
    console.error("[Salesforce] Nearest accounts error:", lastAccountsError);
    return fetchMockAccounts({
      ...location,
      accuracy: null,
      timestamp: Date.now(),
    });
  }
}
