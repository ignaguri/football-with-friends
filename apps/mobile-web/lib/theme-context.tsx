import type { ReactNode } from "react";
import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeType = "light" | "dark";

interface ThemeContextValue {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

const THEME_KEY = "user-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Default to "light" - don't auto-detect system preference as it causes inconsistency
  // between localhost and deployed versions depending on browser settings.
  // Render children immediately so TamaguiProvider is always mounted from first paint;
  // returning null until AsyncStorage loads can cause "Missing theme" in production
  // (e.g. code-splitting or hydration timing).
  const [theme, setThemeState] = useState<ThemeType>("light");

  useEffect(() => {
    // Load saved theme preference only - default to light if none saved
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === "light" || saved === "dark") {
        setThemeState(saved);
      }
    });
  }, []);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    AsyncStorage.setItem(THEME_KEY, newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}

export { ThemeContext };
