import { useEffect } from "react";
import * as Sentry from "@sentry/react-native";
import { useSession } from "@repo/api-client";

export function useSentryUser() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user) {
      Sentry.setUser({
        id: session.user.id,
        email: session.user.email ?? undefined,
        username: session.user.name ?? undefined,
        data: { role: session.user.role },
      });
    } else {
      Sentry.setUser(null);
    }
  }, [session?.user?.id, session?.user?.email, session?.user?.name, session?.user?.role]);
}
