import { ORPCError } from 'orpc'
import { auth } from '../auth'

export interface AuthContext {
  user: {
    id: string
    email: string
    name: string
    role: string
  }
}

export async function withAuth(input: any, context: any, meta: any): Promise<AuthContext> {
  // Get session from request headers
  const request = context.request || context.req

  if (!request) {
    throw new ORPCError({
      code: 'UNAUTHORIZED',
      message: 'No request context available',
    })
  }

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      throw new ORPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      })
    }

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name || '',
        role: (session.user as any).role || 'user',
      },
    }
  } catch (error) {
    throw new ORPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired session',
    })
  }
}

export async function withAdminAuth(input: any, context: any, meta: any): Promise<AuthContext> {
  const authContext = await withAuth(input, context, meta)

  if (authContext.user.role !== 'admin') {
    throw new ORPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    })
  }

  return authContext
}
