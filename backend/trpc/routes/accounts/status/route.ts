import { publicProcedure } from "@/backend/trpc/create-context";
import { getSalesforceAuthStatus } from "@/backend/services/salesforce-auth";
import { getSalesforceAccountsStatus } from "@/backend/services/salesforce";

export default publicProcedure.query(() => {
  return {
    auth: getSalesforceAuthStatus(),
    accounts: getSalesforceAccountsStatus(),
  };
});
