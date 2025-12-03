import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { fetchSalesforceAccountsNearby } from "@/backend/services/salesforce";

export default publicProcedure
  .input(
    z.object({
      latitude: z.number(),
      longitude: z.number(),
      radiusKm: z.number().min(1).max(200).optional(),
    })
  )
  .query(({ input }) => {
    return fetchSalesforceAccountsNearby(
      {
        latitude: input.latitude,
        longitude: input.longitude,
      },
      input.radiusKm
    );
  });
