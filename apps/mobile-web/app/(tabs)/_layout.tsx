// @ts-nocheck - Tamagui type recursion workaround
import { useCurrentGroup, useSession } from "@repo/api-client";
import { GroupSwitcher } from "../../components/group-switcher";
import { NoGroupOnboarding } from "../../components/no-group-onboarding";
import { NotificationPreferencesProvider } from "../../lib/notifications/notification-preferences-context";
import { usePushNotifications } from "../../lib/use-push-notifications";
import {
  Home,
  Calendar,
  Users,
  Settings,
  CircleUser,
} from "@tamagui/lucide-icons-2";
import { Tabs, Redirect, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme, YStack, Spinner } from "tamagui";

export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: session, isPending } = useSession();
  const { myRole, noGroup } = useCurrentGroup();

  // Must be called before any early returns (Rules of Hooks)
  usePushNotifications();

  // Show loading spinner while checking authentication
  if (isPending) {
    return (
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        backgroundColor="$background"
      >
        <Spinner size="large" />
      </YStack>
    );
  }

  // Redirect to auth landing page if not authenticated
  if (!session?.user) {
    return <Redirect href="/(auth)" />;
  }

  // Short-circuit to onboarding so matches/admin don't mount scoped queries
  // that would 409 on every render. `noGroup` is false while loading.
  if (noGroup) return <NoGroupOnboarding />;

  // Admin tab is gated by group-relative role. Platform admin retains the
  // global override so Ignacio can see admin panels on any group.
  const isPlatformAdmin = session?.user?.role === "admin";
  const isAdmin = isPlatformAdmin || myRole === "organizer";

  return (
    <NotificationPreferencesProvider>
    <YStack flex={1}>
      <GroupSwitcher />
      <Tabs
      sceneContainerStyle={{
        backgroundColor: theme.background?.val,
      }}
      screenOptions={{
        tabBarActiveTintColor: theme.blue10?.val,
        tabBarInactiveTintColor: theme.gray10?.val,
        tabBarStyle: {
          backgroundColor: theme.background?.val,
          borderTopColor: theme.borderColor?.val,
        },
        headerStyle: {
          backgroundColor: theme.background?.val,
        },
        headerTintColor: theme.color?.val,
        headerShadowVisible: false,
        sceneStyle: {
          backgroundColor: theme.background?.val,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("shared.home"),
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: t("nav.matches"),
          tabBarIcon: ({ color, size }) => (
            <Calendar size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: t("nav.social"),
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
          headerShown: false,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.navigate("/(tabs)/social");
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("profile.myProfile"),
          tabBarIcon: ({ color, size }) => (
            <CircleUser size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="rules"
        options={{
          href: null, // Hidden - rules moved to match detail modal
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: t("nav.admin"),
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
          headerShown: false,
          href: isAdmin ? undefined : null, // Hide tab if not admin
        }}
      />
      </Tabs>
    </YStack>
    </NotificationPreferencesProvider>
  );
}
