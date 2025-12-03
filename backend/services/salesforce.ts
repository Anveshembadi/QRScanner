import type { Location, SalesforceAccount } from "@/types/kit";
import {
  fetchNearestAccounts as fetchMockAccounts,
  calculateDistance,
} from "@/services/salesforce-mock";
import { ensureSalesforceAuth } from "@/backend/services/salesforce-auth";

const SALESFORCE_API_VERSION =
  process.env.SALESFORCE_API_VERSION ?? "v63.0";
const DEFAULT_RADIUS_KM = Number(
  process.env.SALESFORCE_SEARCH_RADIUS_KM ?? 25
);
const MAX_RESULTS = Number(
  process.env.SALESFORCE_MAX_RESULTS ?? 10
);
const CUSTOM_LATITUDE_FIELD =
  process.env.SALESFORCE_LATITUDE_FIELD || null;
const CUSTOM_LONGITUDE_FIELD =
  process.env.SALESFORCE_LONGITUDE_FIELD || null;

interface SalesforceAccountRecord {
  Id: string;
  Name: string;
  BillingStreet?: string;
  BillingCity?: string;
  BillingState?: string;
  BillingPostalCode?: string;
  BillingLatitude?: number | null;
  BillingLongitude?: number | null;
  [key: string]: unknown;
}

const SALESFORCE_DEBUG =
  process.env.SALESFORCE_DEBUG === "1" ||
  process.env.NODE_ENV !== "production";

const logDebug = (...args: unknown[]) => {
  if (SALESFORCE_DEBUG) {
    console.log("[Salesforce]", ...args);
  }
};

const buildSoqlQuery = () => {
  const selectFields = new Set<string>([
    "Id",
    "Name",
    "BillingStreet",
    "BillingCity",
    "BillingState",
    "BillingPostalCode",
    "BillingLatitude",
    "BillingLongitude",
  ]);

  if (CUSTOM_LATITUDE_FIELD) {
    selectFields.add(CUSTOM_LATITUDE_FIELD);
  }
  if (CUSTOM_LONGITUDE_FIELD) {
    selectFields.add(CUSTOM_LONGITUDE_FIELD);
  }

  const locationWhereClauses = [
    "(BillingLatitude != NULL AND BillingLongitude != NULL)",
  ];

  if (CUSTOM_LATITUDE_FIELD && CUSTOM_LONGITUDE_FIELD) {
    locationWhereClauses.push(
      `(${CUSTOM_LATITUDE_FIELD} != NULL AND ${CUSTOM_LONGITUDE_FIELD} != NULL)`
    );
  }

  return [
    "SELECT",
    Array.from(selectFields).join(", "),
    "FROM Account",
    "WHERE",
    locationWhereClauses.join(" OR "),
    "LIMIT 200",
  ].join(" ");
};

export async function fetchSalesforceAccountsNearby(
  location: Pick<Location, "latitude" | "longitude">,
  radiusKm: number = DEFAULT_RADIUS_KM
): Promise<SalesforceAccount[]> {
  const auth = await ensureSalesforceAuth();

  if (!auth) {
    console.warn(
      "[Salesforce] Missing credentials. Falling back to mock account data."
    );
    return fetchMockAccounts({
      ...location,
      accuracy: null,
      timestamp: Date.now(),
    });
  }

  const soql = buildSoqlQuery();
  logDebug("Querying accounts near", location, "radiusKm:", radiusKm);
  logDebug("SOQL:", soql);

  const response = await fetch(
    `${auth.instanceUrl}/services/data/${SALESFORCE_API_VERSION}/query?q=${encodeURIComponent(
      soql
    )}`,
    {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (response.status === 401) {
    throw new Error(
      "[Salesforce] Unauthorized. Check access token or refresh credentials."
    );
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `[Salesforce] Failed to query accounts (${response.status}): ${body}`
    );
  }

  const data = (await response.json()) as {
    records: SalesforceAccountRecord[];
  };

  logDebug("Records returned:", data.records.length);

  const parseCoordinate = (
    values: Array<number | string | null | undefined>
  ) => {
    for (const value of values) {
      if (typeof value === "number" && !Number.isNaN(value)) {
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

  const accountsWithDistance = data.records
    .map((record) => {
      const latitude = parseCoordinate([
        CUSTOM_LATITUDE_FIELD
          ? (record[CUSTOM_LATITUDE_FIELD] as number | string | null | undefined)
          : undefined,
        record.BillingLatitude,
      ]);
      const longitude = parseCoordinate([
        CUSTOM_LONGITUDE_FIELD
          ? (record[CUSTOM_LONGITUDE_FIELD] as number | string | null | undefined)
          : undefined,
        record.BillingLongitude,
      ]);

      if (latitude === null || longitude === null) {
        logDebug(
          `Skipping Account ${record.Id} due to missing coordinates`,
          {
            latitude,
            longitude,
            customLatitude:
              CUSTOM_LATITUDE_FIELD && record[CUSTOM_LATITUDE_FIELD],
            customLongitude:
              CUSTOM_LONGITUDE_FIELD && record[CUSTOM_LONGITUDE_FIELD],
            billingLatitude: record.BillingLatitude,
            billingLongitude: record.BillingLongitude,
          }
        );
        return null;
      }

      return {
        id: record.Id,
        name: record.Name,
        billingStreet: record.BillingStreet ?? undefined,
        billingCity: record.BillingCity ?? undefined,
        billingState: record.BillingState ?? undefined,
        billingPostalCode: record.BillingPostalCode ?? undefined,
        distance: calculateDistance(
          location.latitude,
          location.longitude,
          latitude,
          longitude
        ),
      };
    })
    .filter((account): account is SalesforceAccount => Boolean(account))
    .filter((account) => account.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, MAX_RESULTS);

  logDebug(
    "Accounts within radius:",
    accountsWithDistance.length,
    accountsWithDistance.map((account) => ({
      id: account.id,
      name: account.name,
      distance: account.distance.toFixed(2),
    }))
  );

  return accountsWithDistance;
}
