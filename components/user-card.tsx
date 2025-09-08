"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signOut, useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { Session } from "@/lib/auth-types";

export default function UserCard(props: {
  session: Session | null;
  activeSessions: Session["session"][];
}) {
  const t = useTranslations();
  const router = useRouter();
  const { data } = useSession();
  const session = data || props.session;
  const [isSignOut, setIsSignOut] = useState<boolean>(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("shared.user")}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="hidden h-9 w-9 sm:flex ">
                <AvatarImage
                  src={session?.user.image || undefined}
                  alt="Avatar"
                  className="object-cover"
                />
                <AvatarFallback>{session?.user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="grid">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium leading-none">
                    {session?.user.name}
                  </p>
                </div>
                <p className="text-sm">{session?.user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="items-center justify-end gap-2">
        <Button
          className="z-10 gap-2"
          variant="secondary"
          onClick={async () => {
            setIsSignOut(true);
            await signOut({
              fetchOptions: {
                onSuccess() {
                  router.push("/");
                },
              },
            });
            setIsSignOut(false);
          }}
          disabled={isSignOut}
        >
          <span className="text-sm">
            {isSignOut ? (
              <svg
                className="animate-spin"
                width={15}
                height={15}
                viewBox="0 0 24 24"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
              </svg>
            ) : (
              <div className="flex items-center gap-2">
                <svg width={16} height={16} viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M16 13v-2H7V8l-5 4l5 4v-3zM20 3h-8a2 2 0 0 0-2 2v4h2V5h8v14h-8v-4h-2v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"
                  />
                </svg>
                {t("shared.signOut")}
              </div>
            )}
          </span>
        </Button>
      </CardFooter>
    </Card>
  );
}
