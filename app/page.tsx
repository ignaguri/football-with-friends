"use client";

import Link from "next/link";
import { Suspense } from "react";

import { SignInButton, SignInFallback } from "@/components/sign-in-btn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";

const StaticContent = () => {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-center text-4xl font-bold text-black dark:text-white">
        Football With Friends
      </h3>
      <p className="break-words text-center text-sm md:text-base">
        Organize, join, and manage your football matches same as with Google
        Sheets.
      </p>
    </div>
  );
};

export default function Home() {
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const isAdmin = user?.role === "admin";

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
                <Link href="/matches">See Matches</Link>
              </Button>
              <Button asChild className="w-48" variant="secondary">
                <Link href="/rules">Rules & Info</Link>
              </Button>
              {isAdmin && (
                <>
                  <Button asChild className="w-48">
                    <Link href="/add-match">+ Add Match</Link>
                  </Button>
                  <Button asChild className="w-48" variant="secondary">
                    <Link href="/organizer">Organizer Dashboard</Link>
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
