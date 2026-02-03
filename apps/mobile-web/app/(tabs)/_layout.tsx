// @ts-nocheck - Tamagui type recursion workaround
import { useSession } from "@repo/api-client";
import {
  Home,
  Calendar,
  Users,
  Settings,
  CircleUser,
} from "@tamagui/lucide-icons";
import { Tabs, Redirect, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme, YStack, Spinner } from "tamagui";

export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: session, isPending } = useSession();

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

  // Redirect to sign-in if not authenticated
  if (!session?.user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const isAdmin = session?.user?.role === "admin";

  return (
    <Tabs
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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("shared.home"),
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          headerShown: false,
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
  );
}
