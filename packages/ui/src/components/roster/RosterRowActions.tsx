import { View } from "react-native";
import { Button } from "../Button";
import type { RosterAction } from "./types";

export interface RosterRowActionsProps {
  actions: RosterAction[];
}

export function RosterRowActions({ actions }: RosterRowActionsProps) {
  if (actions.length === 0) return null;
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {actions.map((action, idx) => {
        const IconComponent = action.icon;
        return (
          <Button
            key={idx}
            variant={action.variant || "ghost"}
            size="$2"
            circular
            width={28}
            height={28}
            onPress={action.onPress}
            aria-label={action.label}
            testID={action.testID}
            disabled={action.disabled}
          >
            <IconComponent size={16} />
          </Button>
        );
      })}
    </View>
  );
}
