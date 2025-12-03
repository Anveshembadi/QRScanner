const LOGIN_BASE_URL =
  process.env.SALESFORCE_LOGIN_BASE_URL ?? "https://test.salesforce.com";
const CLIENT_ID = process.env.SALESFORCE_CLIENT_ID;
const CLIENT_SECRET = process.env.SALESFORCE_CLIENT_SECRET;
const USERNAME = process.env.SALESFORCE_USERNAME;
const PASSWORD = process.env.SALESFORCE_PASSWORD;
const SECURITY_TOKEN = process.env.SALESFORCE_SECURITY_TOKEN ?? "";

type AuthResult = {
  accessToken: string;
  instanceUrl: string;
  expiresAt: number;
};

let cachedAuth: AuthResult | null = null;
let lastAuthSuccessAt: number | null = null;
let lastAuthError: string | null = null;
let lastAuthAttempt:
  | {
      loginBaseUrl: string;
      clientId: string;
      username?: string;
    }
  | null = null;

const PASSWORD_GRANT_TYPE = "password";
const EXPIRY_MARGIN_MS = 60 * 1000;
const mask = (value?: string | null) => {
  if (!value) return "<not-set>";
  if (value.length <= 6) return value.replace(/./g, "*");
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
};

const buildPassword = () =>
  SECURITY_TOKEN ? `${PASSWORD ?? ""}${SECURITY_TOKEN}` : PASSWORD ?? "";

function hasCredentials(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET && USERNAME && PASSWORD);
}

async function requestToken(): Promise<AuthResult> {
  if (!hasCredentials()) {
    throw new Error(
      "[Salesforce] Missing client credentials or user credentials."
    );
  }

  const params = new URLSearchParams();
  params.append("grant_type", PASSWORD_GRANT_TYPE);
  params.append("client_id", CLIENT_ID!);
  params.append("client_secret", CLIENT_SECRET!);
  params.append("username", USERNAME!);
  params.append("password", buildPassword());

  lastAuthAttempt = {
    loginBaseUrl: LOGIN_BASE_URL,
    clientId: mask(CLIENT_ID),
    username: USERNAME,
  };

  const response = await fetch(`${LOGIN_BASE_URL}/services/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `[Salesforce] Failed to obtain access token (${response.status}): ${errorBody}`
    );
  }

  const body = (await response.json()) as {
    access_token: string;
    instance_url: string;
    issued_at: string;
    expires_in?: number;
  };

  const expiresAt =
    (body.expires_in ?? 3600) * 1000 +
    Number(body.issued_at ?? Date.now().toString());

  return {
    accessToken: body.access_token,
    instanceUrl: body.instance_url,
    expiresAt,
  };
}

export async function ensureSalesforceAuth(): Promise<AuthResult | null> {
  if (!hasCredentials()) {
    lastAuthError = "Missing Salesforce credentials";
    return null;
  }

  const shouldRefresh =
    !cachedAuth ||
    cachedAuth.expiresAt - EXPIRY_MARGIN_MS <= Date.now();

  if (shouldRefresh) {
    try {
      cachedAuth = await requestToken();
      lastAuthSuccessAt = Date.now();
      lastAuthError = null;
      console.log(
        "[Salesforce] Access token generated successfully at",
        new Date(lastAuthSuccessAt).toISOString()
      );
    } catch (error) {
      lastAuthError =
        error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  return cachedAuth;
}

export const getSalesforceAuthStatus = () => ({
  connected: lastAuthSuccessAt !== null,
  lastSuccessAt: lastAuthSuccessAt,
  error: lastAuthError,
  lastAttempt,
});
