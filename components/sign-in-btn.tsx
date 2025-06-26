"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";

export function SignInButton() {
  const t = useTranslations();
  const { data: session, isPending } = useSession();
  const isSignedIn = !!session?.session;

  return (
    <Link href={isSignedIn ? "/" : "/sign-in"} className="flex justify-center">
      <Button
        className="justify-between gap-2"
        variant="default"
        disabled={isPending}
      >
        {isPending ? (
          <span className="animate-pulse">...</span>
        ) : !isSignedIn ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1.2em"
            height="1.2em"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M5 3H3v4h2V5h14v14H5v-2H3v4h18V3zm12 8h-2V9h-2V7h-2v2h2v2H3v2h10v2h-2v2h2v-2h2v-2h2z"
            ></path>
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1.2em"
            height="1.2em"
            viewBox="0 0 24 24"
          >
            <path fill="currentColor" d="M2 3h20v18H2zm18 16V7H4v12z"></path>
          </svg>
        )}
        <span>
          {isPending
            ? t("shared.loading")
            : isSignedIn
              ? t("shared.home")
              : t("shared.signIn")}
        </span>
      </Button>
    </Link>
  );
}

export function SignInFallback() {
  const t = useTranslations();
  // Simple client fallback for suspense/loading
  return (
    <div className="flex justify-center">
      <Button className="justify-between gap-2" variant="default" disabled>
        <span className="animate-pulse">...</span>
        <span>{t("shared.loading")}</span>
      </Button>
    </div>
  );
}
