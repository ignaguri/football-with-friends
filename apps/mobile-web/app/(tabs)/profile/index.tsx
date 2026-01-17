import { useState, useEffect } from "react";
import {
  Container,
  Card,
  Text,
  YStack,
  XStack,
  Button,
  Input,
  UserAvatar,
  Spinner,
  ThemeToggle,
  LanguageSwitcher,
} from "@repo/ui";
import { Link, router } from "expo-router";
import { useSession, signOut, client } from "@repo/api-client";
import { useTranslation } from "react-i18next";
import { useThemeContext } from "../../../lib/theme-context";
import { changeLanguage, getCurrentLanguage } from "../../../lib/i18n";

export default function ProfileScreen() {
  const { data: session, isPending } = useSession();
  const { t } = useTranslation();
  const { theme, toggleTheme } = useThemeContext();
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [displayUsername, setDisplayUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      setUsername((session.user as any).username || "");
      setDisplayUsername((session.user as any).displayUsername || "");
    }
  }, [session?.user]);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)/sign-in");
  };

  const handleLanguageChange = async (lang: "en" | "es") => {
    await changeLanguage(lang);
    setCurrentLanguage(lang);
  };

  const handleSaveProfile = async () => {
    if (!session?.user) return;

    setIsSaving(true);
    setError(null);

    try {
      const res = await client.api.profile["update-username"].$post({
        json: {
          userId: session.user.id,
          username: username || null,
          displayUsername: displayUsername || null,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setError((data as any).error || "Failed to update profile");
        return;
      }

      setIsEditing(false);
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Save profile error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isPending) {
    return (
      <Container variant="padded">
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" />
          <Text marginTop="$2">{t("shared.loading")}</Text>
        </YStack>
      </Container>
    );
  }

  if (!session?.user) {
    return (
      <Container variant="padded">
        <YStack space="$6" flex={1} justifyContent="center" alignItems="center">
          <Text fontSize="$8" fontWeight="bold" textAlign="center">
            {t("home.title")}
          </Text>
          <Text color="$gray11" textAlign="center">
            {t("auth.signInDescription")}
          </Text>

          <YStack space="$3" width="100%" maxWidth={300}>
            <Link href="/(auth)/sign-in" asChild>
              <Button variant="primary">{t("shared.signIn")}</Button>
            </Link>
            <Link href="/(auth)/sign-up" asChild>
              <Button variant="outline">{t("auth.signUpLink")}</Button>
            </Link>
          </YStack>

          <Card variant="outlined" width="100%" maxWidth={300}>
            <YStack space="$3">
              <Text fontSize="$4" fontWeight="600">
                {t("shared.settings")}
              </Text>
              <XStack justifyContent="space-between" alignItems="center">
                <Text color="$gray11">{t("shared.language")}</Text>
                <LanguageSwitcher
                  currentLanguage={currentLanguage}
                  onLanguageChange={handleLanguageChange}
                />
              </XStack>
              <XStack justifyContent="space-between" alignItems="center">
                <Text color="$gray11">{t("shared.toggleTheme")}</Text>
                <ThemeToggle theme={theme} onToggle={toggleTheme} />
              </XStack>
            </YStack>
          </Card>
        </YStack>
      </Container>
    );
  }

  const user = session.user as any;
  const displayName = user.displayUsername || user.username || user.name;

  return (
    <Container variant="padded">
      <YStack space="$4">
        <Card variant="elevated" padding="$4">
          <YStack space="$4">
            <XStack space="$4" alignItems="center">
              <UserAvatar
                name={user.name}
                username={user.username}
                displayUsername={user.displayUsername}
                image={user.image}
                profilePicture={user.profilePicture}
                size={80}
              />
              <YStack flex={1}>
                <Text fontSize="$6" fontWeight="600">
                  {displayName}
                </Text>
                <Text color="$gray11" fontSize="$3">
                  {user.email}
                </Text>
                {user.username && (
                  <Text color="$gray10" fontSize="$2">
                    @{user.username}
                  </Text>
                )}
              </YStack>
            </XStack>

            {isEditing ? (
              <YStack space="$3">
                <Input
                  label={t("auth.username")}
                  placeholder={t("auth.usernamePlaceholder")}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  helperText={t("auth.usernameHelp")}
                />

                <Input
                  label={t("profile.displayName")}
                  placeholder={t("profile.displayNamePlaceholder")}
                  value={displayUsername}
                  onChangeText={setDisplayUsername}
                />

                {error && (
                  <Text color="$red10" fontSize="$3">
                    {error}
                  </Text>
                )}

                <XStack space="$2">
                  <Button
                    flex={1}
                    variant="outline"
                    onPress={() => setIsEditing(false)}
                    disabled={isSaving}
                  >
                    {t("shared.cancel")}
                  </Button>
                  <Button
                    flex={1}
                    variant="primary"
                    onPress={handleSaveProfile}
                    disabled={isSaving}
                  >
                    {isSaving ? <Spinner size="small" /> : t("shared.save")}
                  </Button>
                </XStack>
              </YStack>
            ) : (
              <Button variant="outline" onPress={() => setIsEditing(true)}>
                {t("profile.editProfile")}
              </Button>
            )}
          </YStack>
        </Card>

        <Card variant="outlined">
          <YStack space="$2">
            <Text fontSize="$5" fontWeight="600">
              {t("shared.user")}
            </Text>
            <YStack space="$1">
              <XStack justifyContent="space-between">
                <Text color="$gray11">{t("shared.name")}</Text>
                <Text>{user.name || t("shared.notSet")}</Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text color="$gray11">{t("auth.email")}</Text>
                <Text>{user.email}</Text>
              </XStack>
            </YStack>
          </YStack>
        </Card>

        <Card variant="outlined">
          <YStack space="$3">
            <Text fontSize="$5" fontWeight="600">
              {t("shared.settings")}
            </Text>
            <XStack justifyContent="space-between" alignItems="center">
              <Text color="$gray11">{t("shared.language")}</Text>
              <LanguageSwitcher
                currentLanguage={currentLanguage}
                onLanguageChange={handleLanguageChange}
              />
            </XStack>
            <XStack justifyContent="space-between" alignItems="center">
              <Text color="$gray11">{t("shared.toggleTheme")}</Text>
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </XStack>
          </YStack>
        </Card>

        <Button variant="danger" onPress={handleSignOut}>
          {t("shared.signOut")}
        </Button>
      </YStack>
    </Container>
  );
}
