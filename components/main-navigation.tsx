import { Menu } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { UserWithRole } from "@/lib/auth-types";

import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";

interface MainNavigationProps {
  user?: Pick<UserWithRole, "role">;
  onMobileNavigate?: () => void;
  isMobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

export function MainNavigation({
  user,
  onMobileNavigate,
  isMobileMenuOpen,
  setMobileMenuOpen,
}: MainNavigationProps) {
  const t = useTranslations();
  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:flex">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink
                asChild
                className={navigationMenuTriggerStyle()}
              >
                <Link href="/">{t("shared.home")}</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            {user && (
              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  className={navigationMenuTriggerStyle()}
                >
                  <Link href="/matches">{t("nav.matches")}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            )}
            {user?.role === "admin" && (
              <>
                <NavigationMenuItem>
                  <NavigationMenuLink
                    asChild
                    className={navigationMenuTriggerStyle()}
                  >
                    <Link href="/add-match">{t("nav.addMatch")}</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink
                    asChild
                    className={navigationMenuTriggerStyle()}
                  >
                    <Link href="/organizer">{t("nav.organizer")}</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </>
            )}
            <NavigationMenuItem>
              <NavigationMenuLink
                asChild
                className={navigationMenuTriggerStyle()}
              >
                <Link href="/rules">{t("nav.rules")}</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
      {/* Mobile Burger Menu */}
      {user && (
        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                className="rounded p-2 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <Menu className="size-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-0">
              <SheetTitle>
                <span className="sr-only">Main Menu</span>
              </SheetTitle>
              <nav className="flex flex-col gap-2 p-6">
                <Link
                  href="/"
                  className="text-lg font-medium"
                  tabIndex={0}
                  onClick={onMobileNavigate}
                >
                  {t("shared.home")}
                </Link>
                {user && (
                  <Link
                    href="/matches"
                    className="text-lg font-medium"
                    tabIndex={0}
                    onClick={onMobileNavigate}
                  >
                    {t("nav.matches")}
                  </Link>
                )}
                {user?.role === "admin" && (
                  <>
                    <Link
                      href="/add-match"
                      className="text-lg font-medium"
                      tabIndex={0}
                      onClick={onMobileNavigate}
                    >
                      {t("nav.addMatch")}
                    </Link>
                    <Link
                      href="/organizer"
                      className="text-lg font-medium"
                      tabIndex={0}
                      onClick={onMobileNavigate}
                    >
                      {t("nav.organizer")}
                    </Link>
                  </>
                )}
                <Link
                  href="/rules"
                  className="text-lg font-medium"
                  tabIndex={0}
                  onClick={onMobileNavigate}
                >
                  {t("nav.rules")}
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </>
  );
}
