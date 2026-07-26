import { Platform } from "react-native";

/**
 * Bridges React Native accessibility props to web ARIA attributes.
 *
 * Tamagui v2 primitives (`Button`, `YStack`, `XStack`, ...) do NOT forward
 * `accessibilityLabel` / `accessibilityRole` / `accessibilityState` to the DOM
 * on web. React Native's own `Pressable` does, which is why some elements in
 * the app are announced correctly and others are not.
 *
 * This is the same class of gap already worked around elsewhere in this
 * package (see the `type="password"` note in `Input.tsx` and the `expo-image`
 * note in `index.ts`): Tamagui v2 does not map every RN prop to its web
 * equivalent.
 *
 * Returns an empty object on native, where the RN props work as expected.
 * Never overrides an ARIA attribute the caller passed explicitly.
 */

/** RN `accessibilityRole` values that do not map 1:1 to an ARIA role. */
const ROLE_MAP: Record<string, string> = {
  header: "heading",
  image: "img",
  imagebutton: "button",
  adjustable: "slider",
  search: "searchbox",
  summary: "region",
  keyboardkey: "button",
  text: "",
  none: "",
};

export interface AccessibilityState {
  disabled?: boolean;
  selected?: boolean;
  checked?: boolean | "mixed";
  busy?: boolean;
  expanded?: boolean;
}

export interface RNAccessibilityProps {
  accessibilityLabel?: string;
  accessibilityRole?: string;
  accessibilityState?: AccessibilityState;
  accessibilityHint?: string;
}

type AnyProps = RNAccessibilityProps & Record<string, unknown>;

export function webA11yProps(props: AnyProps): Record<string, unknown> {
  if (Platform.OS !== "web") return {};

  const { accessibilityLabel, accessibilityRole, accessibilityState, accessibilityHint } = props;
  const out: Record<string, unknown> = {};

  if (accessibilityLabel != null && props["aria-label"] == null) {
    out["aria-label"] = accessibilityLabel;
  }

  if (accessibilityRole != null && props["role"] == null) {
    const mapped = ROLE_MAP[accessibilityRole];
    // Roles absent from the map pass through unchanged (button, link, tab, ...).
    // Roles mapped to "" are non-semantic in ARIA and are dropped.
    const role = mapped === undefined ? accessibilityRole : mapped;
    if (role) out["role"] = role;
  }

  if (accessibilityHint != null && props["aria-description"] == null) {
    out["aria-description"] = accessibilityHint;
  }

  if (accessibilityState) {
    const { disabled, selected, checked, busy, expanded } = accessibilityState;
    if (disabled != null && props["aria-disabled"] == null) out["aria-disabled"] = disabled;
    if (selected != null && props["aria-selected"] == null) out["aria-selected"] = selected;
    if (checked != null && props["aria-checked"] == null) out["aria-checked"] = checked;
    if (busy != null && props["aria-busy"] == null) out["aria-busy"] = busy;
    if (expanded != null && props["aria-expanded"] == null) out["aria-expanded"] = expanded;
  }

  return out;
}

/**
 * Same as `webA11yProps`, plus the attributes a non-button element needs to be
 * reachable by keyboard. Use for Tamagui primitives (`YStack`, `XStack`, ...)
 * that act as buttons via `onPress` — they render as a plain `<div>` with
 * `tabIndex: -1` and are otherwise unreachable without a mouse.
 *
 * Not needed for `Button`, which already renders a real `<button>`.
 */
export function webPressableProps(props: AnyProps): Record<string, unknown> {
  if (Platform.OS !== "web") return {};

  const out = webA11yProps(props);

  if (props["tabIndex"] == null && props["focusable"] !== false) {
    out["tabIndex"] = 0;
  }

  if (out["role"] == null && props["role"] == null && props.accessibilityRole == null) {
    out["role"] = "button";
  }

  // A <div role="button"> does not fire onPress from the keyboard the way a
  // real <button> does. Without this, the element is focusable but not
  // operable, which is worse than not being focusable at all.
  const onPress = props["onPress"];
  if (typeof onPress === "function" && props["onKeyDown"] == null) {
    out["onKeyDown"] = (event: { key: string; preventDefault: () => void }) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        (onPress as (e: unknown) => void)(event);
      }
    };
  }

  return out;
}
