import { createORPCHandler, createORPCNext } from 'orpc/server'
import { matchesProcedures } from '../procedures/matches'
import { courtsProcedures } from '../procedures/courts'
import { locationsProcedures } from '../procedures/locations'

// Create the main router with all procedures
export const router = {
  matches: matchesProcedures,
  courts: courtsProcedures,
  locations: locationsProcedures,
}

// Export router type for client
export type AppRouter = typeof router

// Create Hono-compatible handler
export const orpcHandler = createORPCHandler({
  router,
})
