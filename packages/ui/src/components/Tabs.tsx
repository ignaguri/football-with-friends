import { Tabs as TamaguiTabs, SizableText, styled } from "tamagui";

const StyledTabsList = styled(TamaguiTabs.List, {
  backgroundColor: "$gray3",
  borderRadius: "$4",
  padding: "$1",
  gap: "$1",
});

const StyledTab = styled(TamaguiTabs.Tab, {
  flex: 1,
  paddingVertical: "$2.5",
  paddingHorizontal: "$4",
  borderRadius: "$3",
  backgroundColor: "transparent",
  justifyContent: "center",
  alignItems: "center",
});

export interface TabItem {
  value: string;
  label: string;
}

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  tabs: TabItem[];
  testIDPrefix?: string;
}

export function Tabs({ value, onValueChange, tabs, testIDPrefix }: TabsProps) {
  return (
    <TamaguiTabs
      value={value}
      onValueChange={onValueChange}
      orientation="horizontal"
      flexDirection="column"
    >
      <StyledTabsList>
        {tabs.map((tab) => (
          <StyledTab
            key={tab.value}
            value={tab.value}
            testID={testIDPrefix ? `${testIDPrefix}-${tab.value}` : undefined}
            {...(value === tab.value && {
              backgroundColor: "$background",
              shadowColor: "$shadowColor",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
            })}
          >
            <SizableText
              fontSize="$4"
              fontWeight={value === tab.value ? "600" : "400"}
              color={value === tab.value ? "$color" : "$gray11"}
            >
              {tab.label}
            </SizableText>
          </StyledTab>
        ))}
      </StyledTabsList>
    </TamaguiTabs>
  );
}
