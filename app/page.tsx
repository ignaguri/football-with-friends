"use client";

import { useRouter } from "next/navigation";
import { Suspense } from "react";

import { SignInButton, SignInFallback } from "@/components/sign-in-btn";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";

export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const isAdmin = user?.role === "admin";

  return (
    <div className="no-visible-scrollbar flex min-h-[80vh] items-center justify-center overflow-hidden px-6 md:px-0">
      <main className="row-start-2 flex flex-col items-center justify-center gap-8">
        <div className="flex flex-col gap-4">
          <h3 className="text-center text-4xl font-bold text-black dark:text-white">
            Football With Friends
          </h3>
          <p className="break-words text-center text-sm md:text-base">
            Organize, join, and manage your football matches same as with Google
            Sheets.
          </p>
        </div>
        <div className="flex w-full flex-col gap-4 md:w-10/12">
          {isPending ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : user ? (
            <div className="flex flex-col items-center gap-4">
              {isAdmin && (
                <Button
                  className="w-48"
                  onClick={() => router.push("/add-match")}
                >
                  + Add Match
                </Button>
              )}
              <Button className="w-48" onClick={() => router.push("/matches")}>
                See Matches
              </Button>
              <Button
                className="w-48"
                variant="secondary"
                onClick={() => router.push("/rules")}
              >
                Rules & Info
              </Button>
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
