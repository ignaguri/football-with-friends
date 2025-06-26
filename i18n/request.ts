import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { locales, type Locale } from "../global";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get("NEXT_LOCALE")?.value;

  const locale: Locale = locales.includes(rawLocale as Locale)
    ? (rawLocale as Locale)
    : "es";

  return {
    locale,
    messages: (await import(`../locales/${locale}/common.json`)).default,
  };
});
