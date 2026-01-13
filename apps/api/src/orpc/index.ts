import { RPCHandler } from "@orpc/server/fetch";
import { onError } from "@orpc/server";

import { courtsProcedures } from "../procedures/courts";
import { locationsProcedures } from "../procedures/locations";
import { matchesProcedures } from "../procedures/matches";

// Create the main router with all procedures
export const router = {
  matches: matchesProcedures,
  courts: courtsProcedures,
  locations: locationsProcedures,
};

// Export router type for client
export type AppRouter = typeof router;

// Create RPC handler with error logging
export const rpcHandler = new RPCHandler(router, {
  interceptors: [
    onError((error, meta) => {
      console.error("=== oRPC Error ===");
      console.error("Path:", meta.path);
      console.error("Error:", error);
      console.error("Stack:", error.stack);
      console.error("==================");
    }),
  ],
});
