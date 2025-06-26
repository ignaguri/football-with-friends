import { useTranslations } from "next-intl";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rules & Info",
  description: "Fútbol con los pibes – Rules, and summary stats.",
};

export default function RulesPage() {
  const t = useTranslations();
  const generalRules: string[] = t.raw("rules.general");
  const matchRules: string[] = t.raw("rules.match");
  return (
    <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-4 text-3xl font-bold text-black dark:text-white">
        {t("rules.title")}
      </h1>
      <div className="mb-8 rounded-lg bg-gray-50 p-4 shadow dark:bg-gray-900">
        <h2 className="mb-2 text-xl font-semibold">
          {t("rules.generalTitle")}
        </h2>
        <ul className="list-disc pl-5 text-base text-gray-700 dark:text-gray-200">
          {generalRules.map((rule, i) => (
            <li key={i}>{rule}</li>
          ))}
        </ul>
      </div>
      <div className="mb-8 rounded-lg bg-gray-50 p-4 shadow dark:bg-gray-900">
        <h2 className="mb-2 text-xl font-semibold">{t("rules.matchTitle")}</h2>
        <ul className="list-disc pl-5 text-base text-gray-700 dark:text-gray-200">
          {matchRules.map((rule, i) => (
            <li key={i}>{rule}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
