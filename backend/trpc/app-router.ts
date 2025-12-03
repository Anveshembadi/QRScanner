import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import accountsNearbyRoute from "./routes/accounts/nearby/route";
import accountsStatusRoute from "./routes/accounts/status/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  accounts: createTRPCRouter({
    nearby: accountsNearbyRoute,
    status: accountsStatusRoute,
  }),
});

export type AppRouter = typeof appRouter;
