"use client";

import { CourtManagement } from "@/components/management/court-management";
import { LocationManagement } from "@/components/management/location-management";
import { MatchManagement } from "@/components/management/match-management";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";

export default function OrganizerDashboard() {
  const t = useTranslations();

  return (
    <main className="container mx-auto p-4">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">{t("organizer.title")}</h1>
        <p className="text-gray-600">{t("organizer.description")}</p>

        <Tabs defaultValue="matches" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="matches">
              {t("organizer.tabs.matches")}
            </TabsTrigger>
            <TabsTrigger value="locations">
              {t("organizer.tabs.locations")}
            </TabsTrigger>
            <TabsTrigger value="courts">
              {t("organizer.tabs.courts")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="mt-4">
            <MatchManagement />
          </TabsContent>

          <TabsContent value="locations" className="mt-4">
            <LocationManagement />
          </TabsContent>

          <TabsContent value="courts" className="mt-4">
            <CourtManagement />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
