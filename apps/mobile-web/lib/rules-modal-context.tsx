import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const RULES_MODAL_DISMISSED_KEY = "rules-modal-dismissed";

interface RulesModalContextValue {
  showModal: boolean;
  dismissModal: () => void;
  dismissPermanently: () => void;
  resetDismissal: () => void; // For testing
}

const RulesModalContext = createContext<RulesModalContextValue | undefined>(undefined);

export function RulesModalProvider({ children }: { children: React.ReactNode }) {
  // Start with modal hidden, then show it if not dismissed (avoids flash)
  const [showModal, setShowModal] = useState(false);

  // Load dismissed state on mount
  useEffect(() => {
    async function loadDismissedState() {
      try {
        const dismissed = await AsyncStorage.getItem(RULES_MODAL_DISMISSED_KEY);
        // Only show modal if user hasn't permanently dismissed it
        if (dismissed !== "true") {
          setShowModal(true);
        }
      } catch (error) {
        console.error("Failed to load rules modal state:", error);
        // Default to showing the modal on error
        setShowModal(true);
      }
    }

    loadDismissedState();
  }, []);

  // Dismiss for this session only (modal won't show until next app restart)
  const dismissModal = () => {
    setShowModal(false);
  };

  // Dismiss permanently (save to AsyncStorage)
  const dismissPermanently = async () => {
    try {
      await AsyncStorage.setItem(RULES_MODAL_DISMISSED_KEY, "true");
      setShowModal(false);
    } catch (error) {
      console.error("Failed to save rules modal dismissal:", error);
      // Still dismiss for this session even if save fails
      setShowModal(false);
    }
  };

  // Reset dismissal (for testing)
  const resetDismissal = async () => {
    try {
      await AsyncStorage.removeItem(RULES_MODAL_DISMISSED_KEY);
      setShowModal(true);
    } catch (error) {
      console.error("Failed to reset rules modal dismissal:", error);
    }
  };

  return (
    <RulesModalContext.Provider
      value={{ showModal, dismissModal, dismissPermanently, resetDismissal }}
    >
      {children}
    </RulesModalContext.Provider>
  );
}

export function useRulesModal() {
  const context = useContext(RulesModalContext);
  if (!context) {
    throw new Error("useRulesModal must be used within RulesModalProvider");
  }
  return context;
}
