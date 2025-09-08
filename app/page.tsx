"use client";

import { SignInButton, SignInFallback } from "@/components/sign-in-btn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Suspense } from "react";

const StaticContent = () => {
  const t = useTranslations("home");
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-center text-4xl font-bold text-black dark:text-white">
        {t("title")}
      </h3>
      <p className="break-words text-center text-sm md:text-base">
        {t("description")}
      </p>
    </div>
  );
};

export default function Home() {
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const isAdmin = user?.role === "admin";
  const t = useTranslations("home");

  if (isPending) {
    return (
      <div className="no-visible-scrollbar flex min-h-[80vh] items-center justify-center overflow-hidden px-6 md:px-0">
        <main className="row-start-2 flex flex-col items-center justify-center gap-8">
          <StaticContent />
          <div className="flex w-full flex-col gap-4 md:w-10/12">
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="mb-2 h-12 w-48" />
              <Skeleton className="mb-2 h-12 w-48" />
              <Skeleton className="mb-2 h-12 w-48" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="no-visible-scrollbar flex min-h-[80vh] items-center justify-center overflow-hidden px-6 md:px-0">
      <main className="row-start-2 flex flex-col items-center justify-center gap-8">
        <StaticContent />
        <div className="flex w-full flex-col gap-4 md:w-10/12">
          {session ? (
            <div className="flex flex-col items-center gap-4">
              <Button asChild className="w-48">
                <Link href="/matches">{t("matches")}</Link>
              </Button>
              <Button asChild className="w-48" variant="secondary">
                <Link href="/rules">{t("rules")}</Link>
              </Button>
              {isAdmin && (
                <>
                  <Button asChild className="w-48">
                    <Link href="/add-match">{t("newMatch")}</Link>
                  </Button>
                  <Button asChild className="w-48" variant="secondary">
                    <Link href="/organizer">{t("organizerDashboard")}</Link>
                  </Button>
                </>
              )}
            </div>
          ) : (
            <Suspense fallback={<SignInFallback />}>
              <SignInButton />
            </Suspense>
          )}
        </div>
      </main>
    </div>
  );
}
