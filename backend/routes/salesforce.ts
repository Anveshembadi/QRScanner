import { Hono } from "hono";
import { z } from "zod";
import {
  DEFAULT_LOGIN_URL,
  getConfiguredCredentials,
  loginWithPassword,
  ensureCredentials,
  SalesforceCredentials,
  SalesforceSession,
} from "@/backend/services/salesforce-login";

const SALESFORCE_API_VERSION =
  process.env.SALESFORCE_API_VERSION ?? "65.0";

const router = new Hono();

const buildApiError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

router.get("/credentials", (c) => {
  const creds = getConfiguredCredentials();
  const missing = ensureCredentials(creds);
  if (missing.length) {
    return c.json(
      {
        error: "Salesforce credentials not configured",
        missing,
      },
      404
    );
  }

  return c.json(creds);
});

router.post("/login", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as SalesforceCredentials;
  const creds = {
    ...getConfiguredCredentials(),
    ...body,
  };
  const missing = ensureCredentials(creds);
  if (missing.length) {
    return c.json(
      {
        error: "Missing Salesforce credentials",
        missing,
      },
      400
    );
  }

  try {
    const session = await loginWithPassword(creds);
    return c.json(session);
  } catch (error) {
    return c.json(
      {
        error: "Salesforce authentication failed",
        details: buildApiError(error),
      },
      500
    );
  }
});

const nearestRequestSchema = z.object({
  session: z.object({
    access_token: z.string(),
    instance_url: z.string(),
  }),
  coords: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  limit: z.number().int().positive().max(25).optional(),
  radiusMeters: z.number().positive().optional(),
});

const milesFromMeters = (meters: number) => meters / 1609.34;
const kmFromMiles = (miles: number) => miles * 1.60934;

const buildNearestAccountsQuery = (
  latitude: number,
  longitude: number,
  radiusMiles: number,
  limit: number
) =>
  `SELECT Id, Name, BillingStreet, BillingCity, BillingState, BillingPostalCode, BillingCountry, Latitude__c, Longitude__c, BillingLatitude, BillingLongitude, DISTANCE(BillingAddress, GEOLOCATION(${latitude}, ${longitude}), 'mi') distanceMiles FROM Account WHERE DISTANCE(BillingAddress, GEOLOCATION(${latitude}, ${longitude}), 'mi') < ${radiusMiles.toFixed(
    2
  )} ORDER BY distanceMiles ASC LIMIT ${limit}`;

const mapAccount = (record: Record<string, unknown>) => {
  const distanceMiles = Number(record.distanceMiles ?? 0);
  return {
    id: String(record.Id),
    name: String(record.Name),
    billingStreet: record.BillingStreet as string | undefined,
    billingCity: record.BillingCity as string | undefined,
    billingState: record.BillingState as string | undefined,
    billingPostalCode: record.BillingPostalCode as string | undefined,
    billingCountry: record.BillingCountry as string | undefined,
    billingLatitude: record.BillingLatitude as number | undefined,
    billingLongitude: record.BillingLongitude as number | undefined,
    distanceMeters: Number.isFinite(distanceMiles)
      ? kmFromMiles(distanceMiles) * 1000
      : undefined,
  };
};

router.post("/accounts/nearest", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = nearestRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: "Invalid payload",
        details: parsed.error.format(),
      },
      400
    );
  }

  const {
    session,
    coords,
    limit = 5,
    radiusMeters = 16093,
  } = parsed.data;

  const soql = buildNearestAccountsQuery(
    coords.latitude,
    coords.longitude,
    milesFromMeters(radiusMeters),
    limit
  );

  try {
    const response = await fetch(
      `${session.instance_url}/services/data/v${SALESFORCE_API_VERSION}/query?q=${encodeURIComponent(
        soql
      )}`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }

    const data = (await response.json()) as {
      records: Array<Record<string, unknown>>;
    };

    return c.json({
      records: Array.isArray(data.records)
        ? data.records.map(mapAccount)
        : [],
    });
  } catch (error) {
    console.error(
      "[Salesforce] Failed to fetch nearest accounts",
      buildApiError(error)
    );
    return c.json(
      {
        error: "Failed to fetch nearest accounts",
        details: buildApiError(error),
      },
      500
    );
  }
});

export default router;
