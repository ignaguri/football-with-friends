import { Button as TamaguiButton, XStack, Text, styled } from "tamagui";
import { Languages } from "@tamagui/lucide-icons";

type Language = "en" | "es";

interface LanguageSwitcherProps {
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
  variant?: "icon" | "text" | "full";
}

const LangButton = styled(TamaguiButton, {
  paddingHorizontal: "$2",
  paddingVertical: "$1",
  minWidth: 40,
  backgroundColor: "transparent",

  variants: {
    active: {
      true: {
        backgroundColor: "$blue5",
      },
      false: {
        backgroundColor: "transparent",
      },
    },
  } as const,
});

const languageLabels: Record<Language, { short: string; full: string }> = {
  en: { short: "EN", full: "English" },
  es: { short: "ES", full: "Espanol" },
};

export function LanguageSwitcher({
  currentLanguage,
  onLanguageChange,
  variant = "text",
}: LanguageSwitcherProps) {
  if (variant === "icon") {
    // Simple icon button that toggles between languages
    return (
      <TamaguiButton
        size="$3"
        circular
        backgroundColor="$background"
        borderWidth={1}
        borderColor="$borderColor"
        onPress={() => onLanguageChange(currentLanguage === "en" ? "es" : "en")}
        icon={<Languages size={20} color="$color" />}
        pressStyle={{ opacity: 0.7 }}
        aria-label="Change language"
      />
    );
  }

  if (variant === "full") {
    // Full text buttons
    return (
      <XStack gap="$2">
        {(["en", "es"] as Language[]).map((lang) => (
          <LangButton
            key={lang}
            active={currentLanguage === lang}
            onPress={() => onLanguageChange(lang)}
            pressStyle={{ opacity: 0.7 }}
          >
            <Text
              color={currentLanguage === lang ? "$blue10" : "$color"}
              fontWeight={currentLanguage === lang ? "600" : "400"}
            >
              {languageLabels[lang].full}
            </Text>
          </LangButton>
        ))}
      </XStack>
    );
  }

  // Default: text variant with short labels
  return (
    <XStack
      gap="$1"
      backgroundColor="$background"
      borderRadius="$4"
      borderWidth={1}
      borderColor="$borderColor"
      padding="$1"
    >
      {(["en", "es"] as Language[]).map((lang) => (
        <LangButton
          key={lang}
          active={currentLanguage === lang}
          onPress={() => onLanguageChange(lang)}
          borderRadius="$3"
          pressStyle={{ opacity: 0.7 }}
        >
          <Text
            fontSize="$2"
            fontWeight={currentLanguage === lang ? "700" : "400"}
            color={currentLanguage === lang ? "$blue10" : "$gray11"}
          >
            {languageLabels[lang].short}
          </Text>
        </LangButton>
      ))}
    </XStack>
  );
}

export type { LanguageSwitcherProps, Language };
