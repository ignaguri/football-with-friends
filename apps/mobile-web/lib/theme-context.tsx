import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useColorScheme } from "react-native";
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
  const systemColorScheme = useColorScheme();
  // Default to "light" for consistent initial render, then load saved preference
  const [theme, setThemeState] = useState<ThemeType>("light");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load saved theme preference, fall back to system preference if none saved
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === "light" || saved === "dark") {
        setThemeState(saved);
      } else if (systemColorScheme) {
        // Only use system preference if no saved preference exists
        setThemeState(systemColorScheme);
      }
      setIsLoaded(true);
    });
  }, [systemColorScheme]);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    AsyncStorage.setItem(THEME_KEY, newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Don't render children until theme is loaded to avoid flash
  if (!isLoaded) {
    return null;
  }

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
