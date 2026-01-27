// @ts-nocheck - Tamagui type recursion workaround
import { Tabs, Redirect, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Home, User, Calendar, Users, Settings, CircleUser } from "@tamagui/lucide-icons";
import { useTheme, YStack, Spinner } from "tamagui";
import { useSession } from "@repo/api-client";

export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: session, isPending } = useSession();

  // Show loading spinner while checking authentication
  if (isPending) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
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
        name="player"
        options={{
          title: t("nav.player"),
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          headerShown: false,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.navigate("/(tabs)/player");
          },
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: t("nav.matches"),
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
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
          title: t("shared.userProfile"),
          tabBarIcon: ({ color, size }) => <CircleUser size={size} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="rules"
        options={{
          href: null, // Hidden - rules moved to match detail modal
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: t("nav.admin"),
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
          headerShown: false,
          href: isAdmin ? undefined : null, // Hide tab if not admin
        }}
      />
    </Tabs>
  );
}
