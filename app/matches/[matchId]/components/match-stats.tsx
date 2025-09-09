"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface MatchStatsProps {
  paidPlayersCount: number;
  totalPlayersCount: number;
  cost?: string | number;
  courtNumber?: string | number;
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: "green" | "blue" | "yellow";
}) {
  const colorClasses = {
    green: "bg-green-100 text-green-800",
    blue: "bg-blue-100 text-blue-800",
    yellow: "bg-yellow-100 text-yellow-800",
  };
  const labelColorClasses = {
    green: "text-green-600",
    blue: "text-blue-600",
    yellow: "text-yellow-600",
  };

  return (
    <div
      className={cn(
        "min-w-[90px] rounded px-4 py-2 text-center",
        colorClasses[color],
      )}
    >
      <span
        className={cn(
          "block text-[10px] font-medium uppercase tracking-wide",
          labelColorClasses[color],
        )}
      >
        {label}
      </span>
      <span className="text-lg font-bold">{value}</span>
    </div>
  );
}

export function MatchStats({
  paidPlayersCount,
  totalPlayersCount,
  cost,
  courtNumber,
}: MatchStatsProps) {
  const t = useTranslations();
  return (
    <div className="mb-4 flex flex-row items-center justify-center gap-2">
      <StatCard
        label={t("stats.paid")}
        value={`${paidPlayersCount}/${totalPlayersCount}`}
        color="green"
      />
      <StatCard
        label={t("stats.cost")}
        value={cost ? `€${cost}` : "-"}
        color="blue"
      />
      <StatCard
        label={t("stats.court")}
        value={courtNumber || "-"}
        color="yellow"
      />
    </div>
  );
}
