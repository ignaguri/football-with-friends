"use client";

import { CourtManagement } from "@/components/management/court-management";
import { LocationManagement } from "@/components/management/location-management";
import { MatchManagement } from "@/components/management/match-management";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { useRef } from "react";

export default function OrganizerDashboard() {
  const t = useTranslations();
  const tabsListRef = useRef<HTMLDivElement>(null!);
  const tabsTriggerRef1 = useRef<HTMLButtonElement>(null!);
  const tabsTriggerRef2 = useRef<HTMLButtonElement>(null!);
  const tabsTriggerRef3 = useRef<HTMLButtonElement>(null!);
  const tabsContentRef1 = useRef<HTMLDivElement>(null!);
  const tabsContentRef2 = useRef<HTMLDivElement>(null!);
  const tabsContentRef3 = useRef<HTMLDivElement>(null!);

  return (
    <main className="container mx-auto p-4">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">{t("organizer.title")}</h1>
        <p className="text-gray-600">{t("organizer.description")}</p>

        <Tabs defaultValue="matches" className="w-full">
          <TabsList className="grid w-full grid-cols-3" ref={tabsListRef}>
            <TabsTrigger value="matches" ref={tabsTriggerRef1}>
              {t("organizer.tabs.matches")}
            </TabsTrigger>
            <TabsTrigger value="locations" ref={tabsTriggerRef2}>
              {t("organizer.tabs.locations")}
            </TabsTrigger>
            <TabsTrigger value="courts" ref={tabsTriggerRef3}>
              {t("organizer.tabs.courts")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="mt-4" ref={tabsContentRef1}>
            <MatchManagement />
          </TabsContent>

          <TabsContent value="locations" className="mt-4" ref={tabsContentRef2}>
            <LocationManagement onLocationChange={() => {}} />
          </TabsContent>

          <TabsContent value="courts" className="mt-4" ref={tabsContentRef3}>
            <CourtManagement />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
