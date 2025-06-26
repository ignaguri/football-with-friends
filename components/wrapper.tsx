"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useRef, useEffect } from "react";

import type { UserWithRole } from "@/lib/auth-types";

import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { MainNavigation } from "@/components/main-navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import UserCard from "@/components/user-card";
import { useSession, signOut } from "@/lib/auth-client";

export function Wrapper(props: { children: React.ReactNode }) {
  const t = useTranslations();
  const { data: session, isPending } = useSession();
  const user = session?.user as UserWithRole;
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const avatarBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isUserMenuOpen) return;
    function handleClick(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        avatarBtnRef.current &&
        !avatarBtnRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isUserMenuOpen]);

  function handleMobileNavigate() {
    setMenuOpen(false);
  }

  function getCurrentLocale() {
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
      return match ? match[1] : "es";
    }
    return "es";
  }

  return (
    <div className="relative flex min-h-screen w-full justify-center bg-white bg-grid-small-black/[0.2] dark:bg-black dark:bg-grid-small-white/[0.2]">
      <div className="absolute z-50 flex w-full items-center justify-between border-b border-border bg-white px-4 py-2 dark:bg-black md:px-1 lg:w-8/12">
        {/* Header: Logo+Name, NavMenu/Burger, Theme+Account */}
        <div className="flex w-full items-center justify-between gap-2">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <p className="whitespace-nowrap text-base font-bold tracking-tight text-black dark:text-white sm:text-lg">
              {t("appTitle")}
            </p>
          </Link>

          {/* Center: Desktop Nav */}
          <div className="hidden flex-1 justify-center md:flex">
            <MainNavigation user={user} />
          </div>

          {/* Right: Mobile Burger + Account */}
          <div className="z-50 flex items-center gap-2">
            <div className="md:hidden">
              <MainNavigation
                user={user}
                onMobileNavigate={handleMobileNavigate}
                isMobileMenuOpen={menuOpen}
                setMobileMenuOpen={setMenuOpen}
              />
            </div>
            {isPending ? null : user ? (
              <div>
                <button
                  ref={avatarBtnRef}
                  className="focus:outline-none"
                  onClick={() => setIsUserMenuOpen((v) => !v)}
                  aria-label="User menu"
                >
                  <div className="relative size-8">
                    <Avatar className="size-8">
                      <AvatarImage
                        src={user.image || undefined}
                        alt={user.name}
                      />
                      <AvatarFallback>
                        {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {user.role === "admin" && (
                      <span
                        className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-amber-50 text-[8px] font-bold text-white shadow-md ring-2 ring-white dark:ring-black"
                        title="Admin"
                        aria-label="Admin badge"
                      >
                        🛡️
                      </span>
                    )}
                  </div>
                </button>
                <Dialog>
                  {isUserMenuOpen && (
                    <div
                      ref={dropdownRef}
                      className="absolute right-0 mt-2 w-44 rounded-md border bg-white shadow-lg dark:bg-black"
                    >
                      <div className="flex flex-col gap-2 p-2">
                        <div className="flex w-full justify-center border-b border-border pb-2">
                          <div className="flex flex-col items-center gap-1">
                            <ThemeToggle />
                            <LanguageSwitcher
                              currentLocale={getCurrentLocale()}
                            />
                          </div>
                        </div>
                        <DialogTrigger asChild>
                          <span
                            className="cursor-pointer truncate px-2 py-1 text-xs text-muted-foreground hover:underline"
                            tabIndex={0}
                          >
                            {user.name || user.email}
                          </span>
                        </DialogTrigger>
                        <Button
                          variant="ghost"
                          className="justify-start px-2 py-1 text-left text-sm"
                          onClick={async () => {
                            setIsUserMenuOpen(false);
                            setMenuOpen(false);
                            await signOut({
                              fetchOptions: {
                                onSuccess: () => router.push("/"),
                              },
                            });
                          }}
                        >
                          {t("shared.logOut")}
                        </Button>
                      </div>
                    </div>
                  )}
                  <DialogContent
                    className="max-w-xs border-none bg-transparent p-0 shadow-none"
                    aria-describedby="user-card"
                  >
                    <DialogTitle>
                      <span className="sr-only">{t("shared.userProfile")}</span>
                    </DialogTitle>
                    <p id="user-card" className="sr-only">
                      {t("shared.userDetails")}
                    </p>
                    <UserCard session={session} activeSessions={[]} />
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => router.push("/sign-in")}
                className="ml-2"
              >
                {t("shared.logIn")}
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="mt-12 w-full lg:w-7/12">{props.children}</div>
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
