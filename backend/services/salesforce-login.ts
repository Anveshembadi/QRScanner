export const DEFAULT_LOGIN_URL =
  process.env.SALESFORCE_LOGIN_BASE_URL ?? "https://test.salesforce.com";

export interface SalesforceCredentials {
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
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

const buildPassword = (password?: string, token?: string) =>
  token ? `${password ?? ""}${token}` : password ?? "";

export async function loginWithPassword(
  credentials: SalesforceCredentials
): Promise<SalesforceSession> {
  const missing = ensureCredentials(credentials);
  if (missing.length) {
    throw new Error(`Missing Salesforce credentials: ${missing.join(", ")}`);
  }

  const loginUrl = credentials.loginUrl ?? DEFAULT_LOGIN_URL;

  const body = new URLSearchParams({
    grant_type: "password",
    client_id: credentials.clientId!,
    client_secret: credentials.clientSecret!,
    username: credentials.username!,
    password: buildPassword(credentials.password, credentials.securityToken),
  });

  const response = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `[Salesforce] Login failed (${response.status}): ${errorBody}`
    );
  }

  const data = (await response.json()) as SalesforceSession;
  return { ...data, loginUrl };
}

export const ensureCredentials = (creds: SalesforceCredentials) =>
  [
    ["clientId", creds.clientId],
    ["clientSecret", creds.clientSecret],
    ["username", creds.username],
    ["password", creds.password],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

export const getConfiguredCredentials = (): SalesforceCredentials => ({
  clientId: process.env.SALESFORCE_CLIENT_ID,
  clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
  username: process.env.SALESFORCE_USERNAME,
  password: process.env.SALESFORCE_PASSWORD,
  securityToken: process.env.SALESFORCE_SECURITY_TOKEN,
  loginUrl: process.env.SALESFORCE_LOGIN_BASE_URL ?? DEFAULT_LOGIN_URL,
});
