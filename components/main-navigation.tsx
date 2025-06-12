import { Menu } from "lucide-react";
import Link from "next/link";

import type { UserWithRole } from "@/lib/auth-types";

import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface MainNavigationProps {
  user?: Pick<UserWithRole, "role">;
}

export function MainNavigation({ user }: MainNavigationProps) {
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
                <Link href="/">Home</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                asChild
                className={navigationMenuTriggerStyle()}
              >
                <Link href="/matches">Matches</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            {user?.role === "admin" && (
              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  className={navigationMenuTriggerStyle()}
                >
                  <Link href="/add-match">Add Match</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            )}
            <NavigationMenuItem>
              <NavigationMenuLink
                asChild
                className={navigationMenuTriggerStyle()}
              >
                <Link href="/rules">Rules & Info</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                asChild
                className={navigationMenuTriggerStyle()}
              >
                <Link href="/organizer">Organizer</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
      {/* Mobile Burger Menu */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <button
              aria-label="Open menu"
              className="rounded p-2 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 p-0">
            <nav className="flex flex-col gap-2 p-6">
              <Link href="/" className="text-lg font-medium" tabIndex={0}>
                Home
              </Link>
              <Link
                href="/matches"
                className="text-lg font-medium"
                tabIndex={0}
              >
                Matches
              </Link>
              {user?.role === "admin" && (
                <Link
                  href="/add-match"
                  className="text-lg font-medium"
                  tabIndex={0}
                >
                  Add Match
                </Link>
              )}
              <Link
                href="/organizer"
                className="text-lg font-medium"
                tabIndex={0}
              >
                Organizer
              </Link>
              <Link href="/rules" className="text-lg font-medium" tabIndex={0}>
                Rules & Info
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
