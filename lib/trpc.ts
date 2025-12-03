import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

let hasShownBaseUrlWarning = false;

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }

  const globalLocation =
    typeof globalThis !== "undefined" && "location" in globalThis
      ? (globalThis as typeof globalThis & {
          location: { origin?: string };
        }).location
      : undefined;

  if (globalLocation?.origin) {
    return globalLocation.origin;
  }

  if (!hasShownBaseUrlWarning) {
    hasShownBaseUrlWarning = true;
    console.warn(
      "EXPO_PUBLIC_RORK_API_BASE_URL is not set. Falling back to http://localhost:3000"
    );
  }

  return "http://localhost:3000";
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});
