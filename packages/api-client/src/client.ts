import { createORPCClient } from '@orpc/client'
import type { AppRouter } from '../../../apps/api/src/orpc'

// Get API URL from environment
const getApiUrl = () => {
  // For Expo (mobile)
  if (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL
  }

  // For Next.js (web)
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }

  // Default to localhost
  return 'http://localhost:3001'
}

const API_URL = getApiUrl()

// Create the oRPC client with full type safety
export const orpcClient = createORPCClient<AppRouter>({
  baseURL: `${API_URL}/rpc`,
  fetch: (input, init) => {
    return fetch(input, {
      ...init,
      credentials: 'include', // Important for sending cookies
      headers: {
        ...init?.headers,
        'Content-Type': 'application/json',
      },
    })
  },
})

// Export the client as 'api' for convenience
export const api = orpcClient
