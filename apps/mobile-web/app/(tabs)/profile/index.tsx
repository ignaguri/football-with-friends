// @ts-nocheck - Tamagui type recursion workaround
import {
  useSession,
  signOut,
  client,
  getConfiguredApiUrl,
} from "@repo/api-client";
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
  Select,
  COUNTRIES,
  PhoneInput,
  AlertDialog,
  getCountryFlag,
  getCountryName,
} from "@repo/ui";
import { Camera } from "@tamagui/lucide-icons";
import * as ImagePicker from "expo-image-picker";
import { Link, router, Stack } from "expo-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  RefreshControl,
  Pressable,
  Platform,
  Alert,
} from "react-native";

import { changeLanguage, getCurrentLanguage } from "../../../lib/i18n";
import { useThemeContext } from "../../../lib/theme-context";

export default function ProfileScreen() {
  const { data: session, isPending, refetch: refetchSession } = useSession();
  const { t } = useTranslation();
  const { theme, toggleTheme } = useThemeContext();
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [nationality, setNationality] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPasswordLoading, setIsChangingPasswordLoading] =
    useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [requiresCurrentPassword, setRequiresCurrentPassword] = useState(false);

  const userId = session?.user?.id;

  useEffect(() => {
    if (session?.user) {
      const user = session.user as any;
      setUsername(user.username || "");
      setNationality(user.nationality || "");
      setPhoneNumber(user.phoneNumber || "");
      setEmail(user.email || "");
      setName(user.name || "");
    }
  }, [session?.user]);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)");
  };

  const handleLanguageChange = async (lang: "en" | "es") => {
    await changeLanguage(lang);
    setCurrentLanguage(lang);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchSession();
    setIsRefreshing(false);
  };

  const handleSaveProfile = async () => {
    if (!session?.user) return;

    setIsSaving(true);
    setError(null);

    try {
      const res = await client.api.profile["update-profile"].$post({
        json: {
          userId: session.user.id,
          username: username || null,
          nationality: nationality || null,
          phoneNumber: phoneNumber || null,
          email: email || null,
          name: name || null,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setError((data as any).error || t("profile.updateFailed"));
        return;
      }

      await refetchSession();
      setIsEditing(false);
    } catch (err) {
      setError(t("auth.unexpectedError"));
      console.error("Save profile error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePasswordWithConfirmation = () => {
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError(t("profile.passwordMismatch"));
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(t("auth.passwordTooShort"));
      return;
    }

    // If current password is required, validate it's provided
    if (requiresCurrentPassword && !currentPassword) {
      setPasswordError(t("profile.currentPasswordRequired"));
      return;
    }

    // Show confirmation dialog
    setShowPasswordConfirm(true);
  };

  const handleChangePassword = async () => {
    setShowPasswordConfirm(false);
    setPasswordError(null);
    setIsChangingPasswordLoading(true);

    try {
      let res;

      if (requiresCurrentPassword) {
        // Use change-password endpoint (requires current password)
        res = await client.api.profile["change-password"].$post({
          json: {
            currentPassword,
            newPassword,
          },
        });
      } else {
        // Try set-password endpoint first (for OAuth-only users)
        res = await client.api.profile["set-password"].$post({
          json: {
            newPassword,
          },
        });
      }

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        hasExistingPassword?: boolean;
      };

      if (!res.ok) {
        // Check if user needs to provide current password
        if (data.hasExistingPassword) {
          setRequiresCurrentPassword(true);
          setPasswordError(t("profile.currentPasswordRequired"));
          return;
        }
        setPasswordError(t("profile.changePasswordFailed"));
        return;
      }

      setIsChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setRequiresCurrentPassword(false);
      Alert.alert(t("shared.success"), t("profile.passwordChanged"));
    } catch (err: any) {
      console.error("Change password error:", err);

      // Try to extract error response from the exception
      // The API client attaches response data to the error
      const errorData = err?.data as
        | { hasExistingPassword?: boolean }
        | undefined;
      if (errorData?.hasExistingPassword) {
        setRequiresCurrentPassword(true);
        setPasswordError(t("profile.currentPasswordRequired"));
        return;
      }

      // Show generic error message for security
      setPasswordError(t("profile.changePasswordFailed"));
    } finally {
      setIsChangingPasswordLoading(false);
    }
  };

  const handleUploadPhoto = async () => {
    if (!session?.user) return;

    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setError(t("profile.photoPermissionDenied"));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      setIsUploadingPhoto(true);
      setError(null);

      const asset = result.assets[0];
      const formData = new FormData();

      // Handle file upload for both web and native
      if (Platform.OS === "web") {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        formData.append("file", blob, "profile.jpg");
      } else {
        formData.append("file", {
          uri: asset.uri,
          type: asset.mimeType || "image/jpeg",
          name: "profile.jpg",
        } as any);
      }
      formData.append("userId", session.user.id);

      const apiUrl = getConfiguredApiUrl();
      const uploadRes = await fetch(`${apiUrl}/api/profile/upload-picture`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await uploadRes.json();

      if (!uploadRes.ok) {
        setError(data.error || t("profile.uploadFailed"));
        return;
      }

      // Show warning if R2 storage is not configured (placeholder was used)
      if (data.warning) {
        console.warn("Photo upload warning:", data.warning);
        // Still refresh the session - the placeholder was set
      }

      await refetchSession();
    } catch (err) {
      setError(t("profile.uploadFailed"));
      console.error("Upload photo error:", err);
    } finally {
      setIsUploadingPhoto(false);
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        >
          <YStack gap="$6" alignItems="center">
            <Text fontSize="$8" fontWeight="bold" textAlign="center">
              {t("home.title")}
            </Text>
            <Text color="$gray11" textAlign="center">
              {t("auth.signInDescription")}
            </Text>

            <YStack gap="$3" width="100%" maxWidth={300}>
              <Link href="/(auth)" asChild>
                <Button variant="primary">{t("shared.signIn")}</Button>
              </Link>
            </YStack>

            <Card variant="outlined" width="100%" maxWidth={300}>
              <YStack gap="$3">
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
        </ScrollView>
      </Container>
    );
  }

  const user = session.user as any;
  const displayName = user.displayUsername || user.username || user.name;

  // Determine auth method to disable editing the auth identifier
  // primaryAuthMethod is set when the user signs up: "phone", "email", or "google"
  const primaryAuthMethod = user.primaryAuthMethod || "email";
  const isPhoneAuthUser = primaryAuthMethod === "phone";
  const canEditEmail = isPhoneAuthUser; // Phone users can't edit phone, but can change email
  const canEditPhone = !isPhoneAuthUser; // Email/Google users can't edit email, but can change phone

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <Container variant="padded">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <YStack gap="$4">
          {/* Profile Card with Inline Editing */}
          <Card variant="elevated" padding="$4">
            <YStack gap="$4">
              {/* Avatar with upload button */}
              <XStack justifyContent="center">
                <YStack alignItems="center">
                  <Pressable
                    onPress={handleUploadPhoto}
                    disabled={isUploadingPhoto}
                  >
                    <YStack position="relative">
                      <UserAvatar
                        name={user.name}
                        username={user.username}
                        displayUsername={user.displayUsername}
                        image={user.image}
                        profilePicture={user.profilePicture}
                        size={100}
                      />
                      <YStack
                        position="absolute"
                        bottom={0}
                        right={0}
                        backgroundColor="$blue10"
                        borderRadius="$10"
                        padding="$2"
                        zIndex={10}
                      >
                        {isUploadingPhoto ? (
                          <Spinner size="small" color="white" />
                        ) : (
                          <Camera size={16} color="white" />
                        )}
                      </YStack>
                    </YStack>
                  </Pressable>
                </YStack>
              </XStack>

              {/* Profile Fields - Display or Edit Mode */}
              {isEditing ? (
                <YStack gap="$3">
                  <Input
                    label={t("profile.fullName")}
                    placeholder={t("auth.namePlaceholder")}
                    value={name}
                    onChangeText={setName}
                  />

                  <Input
                    label={t("auth.username")}
                    placeholder={t("auth.usernamePlaceholder")}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    helperText={t("auth.usernameHelp")}
                  />

                  <Select
                    label={t("profile.nationality")}
                    placeholder={t("profile.nationalityPlaceholder")}
                    value={nationality}
                    onValueChange={setNationality}
                    searchable
                    searchPlaceholder={t("shared.search")}
                    options={[
                      { label: t("shared.none"), value: "" },
                      ...COUNTRIES.map((country) => ({
                        label: `${country.flag} ${country.name}`,
                        value: country.code,
                      })),
                    ]}
                  />

                  <PhoneInput
                    label={t("auth.phone")}
                    placeholder={t("auth.phonePlaceholder")}
                    value={phoneNumber}
                    onChangeValue={(phone) => setPhoneNumber(phone)}
                    disabled={!canEditPhone}
                    helperText={
                      !canEditPhone
                        ? t("profile.phoneLockedByAuth")
                        : t("profile.phoneHelp")
                    }
                  />

                  <Input
                    label={t("auth.email")}
                    placeholder={t("auth.emailPlaceholder")}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    disabled={!canEditEmail}
                    helperText={
                      !canEditEmail ? t("profile.emailLockedByAuth") : undefined
                    }
                  />
                </YStack>
              ) : (
                <YStack gap="$2">
                  {/* Display name prominently */}
                  <YStack alignItems="center" gap="$1">
                    <Text fontSize="$7" fontWeight="bold">
                      {displayName}
                    </Text>
                    {user.username && (
                      <Text color="$gray10" fontSize="$4">
                        @{user.username}
                      </Text>
                    )}
                  </YStack>
                </YStack>
              )}

              {error && (
                <Text color="$red10" fontSize="$3" textAlign="center">
                  {error}
                </Text>
              )}

              {/* Action buttons */}
              {isEditing ? (
                <XStack gap="$2" marginTop="$2">
                  <Button
                    flex={1}
                    variant="outline"
                    onPress={() => {
                      setIsEditing(false);
                      setError(null);
                      // Reset to original values
                      const u = session.user as any;
                      setUsername(u.username || "");
                      setNationality(u.nationality || "");
                      setPhoneNumber(u.phoneNumber || "");
                      setEmail(u.email || "");
                      setName(u.name || "");
                    }}
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
              ) : (
                <YStack gap="$2" marginTop="$2">
                  <Button
                    variant="outline"
                    onPress={() => setIsEditing(true)}
                  >
                    {t("profile.editProfile")}
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => router.push("/stats-voting")}
                  >
                    {t("profile.openStatsVoting")}
                  </Button>
                </YStack>
              )}
            </YStack>
          </Card>

          {/* Settings Card - Combined with Password Change and Sign Out */}
          <Card variant="outlined">
            <YStack gap="$3">
              <Text fontSize="$5" fontWeight="600">
                {t("shared.settings")}
              </Text>

              {/* Language Switcher */}
              <XStack justifyContent="space-between" alignItems="center">
                <Text color="$gray11">{t("shared.language")}</Text>
                <LanguageSwitcher
                  currentLanguage={currentLanguage}
                  onLanguageChange={handleLanguageChange}
                />
              </XStack>

              {/* Theme Toggle */}
              <XStack justifyContent="space-between" alignItems="center">
                <Text color="$gray11">{t("shared.toggleTheme")}</Text>
                <ThemeToggle theme={theme} onToggle={toggleTheme} />
              </XStack>

              {/* Change Password Section */}
              {isChangingPassword ? (
                <YStack gap="$3" marginTop="$2">
                  {requiresCurrentPassword && (
                    <Input
                      label={t("profile.currentPassword")}
                      placeholder={t("profile.currentPasswordPlaceholder")}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry
                      hidePasswordToggle
                    />
                  )}
                  <Input
                    label={t("profile.newPassword")}
                    placeholder={t("auth.passwordMinLength")}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                  />
                  <Input
                    label={t("profile.confirmPassword")}
                    placeholder={t("auth.passwordMinLength")}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />

                  {passwordError && (
                    <Text color="$red10" fontSize="$3">
                      {passwordError}
                    </Text>
                  )}

                  <XStack gap="$2" marginTop="$2">
                    <Button
                      flex={1}
                      variant="outline"
                      onPress={() => {
                        setIsChangingPassword(false);
                        setPasswordError(null);
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setRequiresCurrentPassword(false);
                      }}
                      disabled={isChangingPasswordLoading}
                    >
                      {t("shared.cancel")}
                    </Button>
                    <Button
                      flex={1}
                      variant="primary"
                      onPress={handleChangePasswordWithConfirmation}
                      disabled={isChangingPasswordLoading}
                    >
                      {isChangingPasswordLoading ? (
                        <Spinner size="small" />
                      ) : (
                        t("profile.changePassword")
                      )}
                    </Button>
                  </XStack>
                </YStack>
              ) : (
                <Button
                  variant="outline"
                  onPress={() => setIsChangingPassword(true)}
                >
                  {t("profile.changePassword")}
                </Button>
              )}

              {/* Sign Out Button */}
              <Button variant="danger" onPress={handleSignOut} marginTop="$2">
                {t("shared.signOut")}
              </Button>
            </YStack>
          </Card>
        </YStack>
      </ScrollView>

      {/* Password Change Confirmation Dialog */}
      <AlertDialog
        open={showPasswordConfirm}
        onOpenChange={setShowPasswordConfirm}
        title={t("profile.changePassword")}
        description={t("profile.changePasswordConfirm")}
        confirmText={t("profile.changePassword")}
        cancelText={t("shared.cancel")}
        onConfirm={handleChangePassword}
        variant="default"
      />
    </Container>
    </>
  );
}
