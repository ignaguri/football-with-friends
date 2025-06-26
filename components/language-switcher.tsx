"use client";

import { Switch } from "@/components/ui/switch";

interface LanguageSwitcherProps {
  currentLocale: string;
}

function setLocaleCookie(locale: string) {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`;
}

export function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const isEnglish = currentLocale === "en";
  const nextLocale = isEnglish ? "es" : "en";

  function handleToggle() {
    setLocaleCookie(nextLocale);
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xl" aria-label="es">
        🇦🇷
      </span>
      <Switch
        checked={isEnglish}
        onCheckedChange={handleToggle}
        aria-label="Toggle language"
        className="mx-1"
      />
      <span className="text-xl" aria-label="en">
        🇺🇸
      </span>
    </div>
  );
}
