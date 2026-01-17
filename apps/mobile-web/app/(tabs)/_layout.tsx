import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { Home, User, Calendar, BookOpen, Settings } from "@tamagui/lucide-icons";
import { useTheme } from "tamagui";
import { useSession } from "@repo/api-client";

export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: session } = useSession();

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
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="rules"
        options={{
          title: t("rules.title"),
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("shared.userProfile"),
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          headerShown: false,
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
