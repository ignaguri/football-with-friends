"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "@/lib/auth-client";

export function Wrapper(props: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen w-full justify-center bg-white bg-grid-small-black/[0.2] dark:bg-black dark:bg-grid-small-white/[0.2]">
      <div className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] dark:bg-black md:flex"></div>
      <div className="absolute z-50 flex w-full items-center justify-between border-b border-border bg-white px-4 py-2 dark:bg-black md:px-1 lg:w-8/12">
        <Link href="/">
          <div className="flex cursor-pointer items-center gap-2">
            <Logo />
            <p className="text-lg font-bold tracking-tight text-black dark:text-white">
              Football With Friends
            </p>
          </div>
        </Link>
        <div className="z-50 flex items-center gap-2">
          <ThemeToggle />
          {isPending ? null : user ? (
            <div className="relative">
              <button
                className="focus:outline-none"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="User menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.image || undefined} alt={user.name} />
                  <AvatarFallback>
                    {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-md border bg-white shadow-lg dark:bg-black">
                  <div className="flex flex-col p-2">
                    <span className="truncate px-2 py-1 text-xs text-muted-foreground">
                      {user.name || user.email}
                    </span>
                    <Button
                      variant="ghost"
                      className="justify-start px-2 py-1 text-left text-sm"
                      onClick={async () => {
                        setMenuOpen(false);
                        await signOut({
                          fetchOptions: {
                            onSuccess: () => router.push("/"),
                          },
                        });
                      }}
                    >
                      Log out
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => router.push("/sign-in")}
              className="ml-2"
            >
              Log in
            </Button>
          )}
        </div>
      </div>
      <div className="mt-20 w-full lg:w-7/12">{props.children}</div>
    </div>
  );
}

const queryClient = new QueryClient();

export function WrapperWithQuery(props: { children: React.ReactNode | any }) {
  return (
    <QueryClientProvider client={queryClient}>
      {props.children}
    </QueryClientProvider>
  );
}
